import nodeIcal from 'node-ical';
import type { CalendarEvent } from '@mavu/contracts';

type FetchFn = (input: string, init?: unknown) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

function globalFetch(): FetchFn {
  const f = (globalThis as unknown as { fetch?: FetchFn }).fetch;
  if (typeof f !== 'function') throw new Error('Global fetch is not available');
  return f;
}

type RawEvent = Record<string, unknown>;

/** Resolve parseICS across default export / namespace interop (Node ESM + CJS). */
function parseICSFromNodeIcal(body: string): Record<string, unknown> {
  const m = nodeIcal as unknown as {
    parseICS?: (data: string) => Record<string, unknown>;
    sync?: { parseICS?: (data: string) => Record<string, unknown> };
  };
  if (typeof m.parseICS === 'function') return m.parseICS(body);
  if (typeof m.sync?.parseICS === 'function') return m.sync.parseICS(body);
  throw new Error('node-ical: parseICS is not available');
}

/** node-ical often exposes text fields as plain strings or `{ val: string }`. */
function icsTextField(val: unknown): string | undefined {
  if (typeof val === 'string') return val;
  if (
    val &&
    typeof val === 'object' &&
    'val' in val &&
    typeof (val as { val: unknown }).val === 'string'
  ) {
    return (val as { val: string }).val;
  }
  return undefined;
}

function asDate(val: unknown): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  if (
    typeof val === 'object' &&
    'toJSDate' in val &&
    typeof (val as { toJSDate: () => Date }).toJSDate === 'function'
  ) {
    return (val as { toJSDate: () => Date }).toJSDate();
  }
  return undefined;
}

/** Parse ICS text body into canonical events.m */
export function parseIcs(body: string): CalendarEvent[] {
  const parsed = parseICSFromNodeIcal(body) as RawEvent;
  const events: CalendarEvent[] = [];

  for (const key of Object.keys(parsed)) {
    const raw = parsed[key] as RawEvent | undefined;
    if (!raw || raw.type !== 'VEVENT') continue;

    const uid = typeof raw.uid === 'string' ? raw.uid : String(raw.uid);
    const summary = icsTextField(raw.summary);
    const description = icsTextField(raw.description);
    const startUtc = asDate(raw.start);
    let endUtc = asDate(raw.end);
    const duration = raw.duration as { seconds?: number } | undefined;
    if (startUtc instanceof Date && !(endUtc instanceof Date) && duration?.seconds !== undefined) {
      endUtc = new Date(startUtc.getTime() + duration.seconds * 1000);
    }
    if (!(startUtc instanceof Date && endUtc instanceof Date)) continue;
    events.push({ uid, startUtc, endUtc, summary, description });
  }
  return events;
}

/** Airbnb/Booking often reject datacenter fetches without a normal browser UA (403). */
const ICAL_FETCH_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/calendar,text/plain;q=0.9,*/*;q=0.8',
};

export class IcalChannelConnector {
  readonly channelId = 'ical';

  async fetchExternalCalendar(icalUrl: string): Promise<CalendarEvent[]> {
    const res = await globalFetch()(icalUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(45_000),
      headers: ICAL_FETCH_HEADERS,
    });
    if (!res.ok) {
      throw new Error(
        `iCal fetch failed HTTP ${res.status} (403 from Airbnb often means the server blocked the request—re-copy the export link or check Last error after sync).`,
      );
    }
    const text = await res.text();
    if (!text.trim()) {
      throw new Error('iCal response was empty — check the inbound URL is still valid.');
    }
    return parseIcs(text);
  }
}

export type OutboundEvent = {
  uid: string;
  startUtc: Date;
  endUtc: Date;
  summary?: string;
};

function formatUtc(dt: Date): string {
  const y = dt.getUTCFullYear().toString().padStart(4, '0');
  const m = (dt.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = dt.getUTCDate().toString().padStart(2, '0');
  const hh = dt.getUTCHours().toString().padStart(2, '0');
  const mm = dt.getUTCMinutes().toString().padStart(2, '0');
  const ss = dt.getUTCSeconds().toString().padStart(2, '0');
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

export function buildIcsFeed(calName: string, items: OutboundEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'PRODID:-//Mavu Days//Outbound//EN',
    `X-WR-CALNAME:${escapeText(calName)}`,
    `NAME:${escapeText(calName)}`,
  ];

  for (const ev of items) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.uid}`);
    lines.push(`DTSTAMP:${formatUtc(new Date())}`);
    lines.push(`DTSTART:${formatUtc(ev.startUtc)}`);
    lines.push(`DTEND:${formatUtc(ev.endUtc)}`);
    lines.push(`SUMMARY:${escapeText(ev.summary ?? 'Blocked')}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}
