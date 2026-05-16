/**
 * One-off / dev helper: set a user's password hash (same bcrypt rounds as apps/api auth).
 *
 * Usage:
 *   npm run reset-password -w @mavu/db -- <newPassword>
 *     when exactly one OWNER or ADMIN exists
 *   npm run reset-password -w @mavu/db -- <email> <newPassword>
 *   RESET_PASSWORD=... tsx prisma/reset-password.ts [<email>]
 */
import { PrismaClient, MembershipRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const adminRoles: MembershipRole[] = [MembershipRole.OWNER, MembershipRole.ADMIN];

async function main() {
  const args = process.argv.slice(2).filter((a) => a.length > 0);
  let email: string | undefined;
  let password: string | undefined;

  if (args.length === 1) {
    password = args[0];
  } else if (args.length >= 2) {
    email = args[0]?.trim();
    password = args[1];
  }
  password = password ?? process.env.RESET_PASSWORD;
  if (!password) {
    console.error('Usage: tsx prisma/reset-password.ts <newPassword>');
    console.error('   or: tsx prisma/reset-password.ts <email> <newPassword>');
    process.exit(1);
  }

  let resolvedEmail = email;
  if (!resolvedEmail) {
    const rows = await prisma.membership.findMany({
      where: { role: { in: adminRoles } },
      select: { user: { select: { email: true } } },
    });
    const emails = [...new Set(rows.map((r) => r.user.email))];
    if (emails.length === 0) {
      console.error('No OWNER or ADMIN users found. Register first or pass an email explicitly.');
      process.exit(1);
    }
    if (emails.length > 1) {
      console.error('Multiple OWNER/ADMIN users; pass email as first argument:\n' + emails.sort().join('\n'));
      process.exit(1);
    }
    resolvedEmail = emails[0];
    console.log(`Single admin/owner account: ${resolvedEmail}`);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await prisma.user.updateMany({
    where: { email: resolvedEmail },
    data: { passwordHash },
  });
  if (result.count === 0) {
    console.error(`No user with email: ${resolvedEmail}`);
    process.exit(1);
  }
  console.log('Password updated.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
