import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseIcs, buildIcsFeed } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('channels-ical', () => {
  test('parse golden fixture', () => {
    const fixture = readFileSync(resolve(__dirname, '../fixtures/sample.ics'), 'utf8');
    const evs = parseIcs(fixture);
    expect(evs.length).toBeGreaterThanOrEqual(1);
    expect(evs[0]?.uid).toBe('fixture-evt-1');
    expect(evs[0]?.summary).toContain('Golden');
    expect(isNaN(evs[0]!.startUtc.getTime())).toBe(false);
    expect(isNaN(evs[0]!.endUtc.getTime())).toBe(false);
  });

  test('build ICS round-trip shape', () => {
    const ics = buildIcsFeed('Test', [
      {
        uid: 'x:@y',
        startUtc: new Date('2030-01-01T00:00:00.000Z'),
        endUtc: new Date('2030-01-03T00:00:00.000Z'),
        summary: 'Hold',
      },
    ]);
    expect(ics.includes('BEGIN:VCALENDAR')).toBe(true);
    expect(parseIcs(ics).length).toBeGreaterThanOrEqual(1);
  });
});
