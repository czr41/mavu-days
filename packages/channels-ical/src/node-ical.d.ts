declare module 'node-ical' {
  /** CJS `module.exports` — use default import from ESM (`import x from 'node-ical'`). */
  const nodeIcal: {
    parseICS(data: string): Record<string, unknown>;
    sync: { parseICS(data: string): Record<string, unknown> };
  };
  export default nodeIcal;
}
