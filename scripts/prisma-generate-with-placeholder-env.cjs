const { spawnSync } = require('node:child_process');
const path = require('path');

const placeholders = {
  DATABASE_URL: 'postgresql://prisma:prisma@127.0.0.1:5432/prisma',
  DIRECT_URL: 'postgresql://prisma:prisma@127.0.0.1:5432/prisma',
};

const env = { ...process.env };
for (const [key, value] of Object.entries(placeholders)) {
  if (!env[key]) env[key] = value;
}

const dbPkg = path.join(__dirname, '..', 'packages', 'db');
const r = spawnSync('npx', ['prisma', 'generate'], {
  cwd: dbPkg,
  stdio: 'inherit',
  env,
  shell: true,
});

process.exit(r.status === null ? 1 : r.status);
