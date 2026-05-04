import * as ic from 'node-ical';
import type { CalendarEvent } from '@mavu/contracts';

type RawEvent = Record<string, unknown>;

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
  const parsed = ic.parseICS(body) as RawEvent;
  const events: CalendarEvent[] = [];

  for (const key of Object.keys(parsed)) {
    const raw = parsed[key] as RawEvent | undefined;
    if (!raw || raw.type !== 'VEVENT') continue;

    const uid = typeof raw.uid === 'string' ? raw.uid : String(raw.uid);
    const summary = typeof raw.summary === 'string' ? raw.summary : undefined;
    const startUtc = asDate(raw.start);
    let endUtc = asDate(raw.end);
    const duration = raw.duration as { seconds?: number } | undefined;
    if (startUtc instanceof Date && !(endUtc instanceof Date) && duration?.seconds !== undefined) {
      endUtc = new Date(startUtc.getTime() + duration.seconds * 1000);
    }
    if (!(startUtc instanceof Date && endUtc instanceof Date)) continue;
    events.push({ uid, startUtc, endUtc, summary });
  }
  return events;
}

export class IcalChannelConnector {
  readonly channelId = 'ical';

  async fetchExternalCalendar(icalUrl: string): Promise<CalendarEvent[]> {
    const res = await fetch(icalUrl, { redirect: 'follow' });
    if (!res.ok) {
      throw new Error(`iCal fetch failed ${res.status}`);
    }
    const text = await res.text();
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
