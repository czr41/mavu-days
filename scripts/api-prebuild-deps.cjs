/** Build workspace packages needed before `apps/api` runs `tsc` (dist & .d.ts for @mavu/db are not committed). */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');
const workspaces = ['@mavu/contracts', '@mavu/channels-ical', '@mavu/db'];

for (const ws of workspaces) {
  const r = spawnSync('npm', ['run', 'build', '-w', ws], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  const code = r.status === null ? 1 : r.status;
  if (code !== 0) process.exit(code);
}
