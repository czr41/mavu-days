/**
 * Loads repo-root `.env`, then runs a command from `packages/db` with env inherited.
 * Avoids relying on dotenv-cli’s `dotenv` shim, which npm often drops from PATH on Windows.
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const pkgRoot = dirname(scriptDir);
const repoEnv = resolve(pkgRoot, '../../.env');

if (!existsSync(repoEnv)) {
  console.error(`@mavu/db: expected env file at ${repoEnv}`);
  process.exit(1);
}

dotenv.config({ path: repoEnv });

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node with-repo-env-run.mjs <command> [...args]');
  process.exit(1);
}

const [command, ...rest] = args;
const result = spawnSync(command, rest, {
  cwd: pkgRoot,
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

process.exit(result.status ?? (result.signal ? 1 : 0));
