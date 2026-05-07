/**
 * Idempotent demo inventory for the Mavu Days landing + booking matrix.
 *
 * Run after migrations and after registering an org whose slug matches SEED_ORG_SLUG (default mavu-days).
 */
import {
  OrgHomepageKind,
  PrismaClient,
  RentableUnitKind,
  RentableUnitMatrixRole,
} from '@prisma/client';

import { seedLandingCmsIfEmpty } from './seed-landing-content.ts';

const prisma = new PrismaClient();

async function main() {
  const orgSlug = process.env.SEED_ORG_SLUG ?? 'mavu-days';
  const propertySlug = process.env.SEED_PROPERTY_SLUG ?? 'mavu-farm';
  const siteBase = (process.env.SEED_PUBLIC_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '');

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) {
    console.warn(
      `[seed] No organization with slug "${orgSlug}". Register via POST /auth/register with organizationSlug "${orgSlug}", then run: npm run db:seed`,
    );
    return;
  }

  await prisma.orgSiteSettings.upsert({
    where: { organizationId: org.id },
    create: { organizationId: org.id, homepageKind: OrgHomepageKind.MATRIX_THREE_SKU },
    update: { homepageKind: OrgHomepageKind.MATRIX_THREE_SKU },
  });

  const property = await prisma.property.upsert({
    where: {
      organizationId_slug: { organizationId: org.id, slug: propertySlug },
    },
    create: {
      organizationId: org.id,
      name: 'Mavu Days Farm',
      slug: propertySlug,
    },
    update: { name: 'Mavu Days Farm' },
  });

  const units: { slug: string; name: string; kind: RentableUnitKind }[] = [
    { slug: 'full-farm', name: 'Full Farm Stay', kind: RentableUnitKind.WHOLE_HOME },
    { slug: '1bhk-villa', name: '1BHK Villa', kind: RentableUnitKind.WHOLE_HOME },
    { slug: '2bhk-villa', name: '2BHK Villa', kind: RentableUnitKind.WHOLE_HOME },
  ];

  for (const u of units) {
    await prisma.rentableUnit.upsert({
      where: {
        propertyId_slug: { propertyId: property.id, slug: u.slug },
      },
      create: {
        propertyId: property.id,
        slug: u.slug,
        name: u.name,
        kind: u.kind,
      },
      update: { name: u.name, kind: u.kind },
    });
  }

  const fullFarm = await prisma.rentableUnit.findFirstOrThrow({
    where: { propertyId: property.id, slug: 'full-farm' },
    select: { id: true },
  });
  const bhk1 = await prisma.rentableUnit.findFirstOrThrow({
    where: { propertyId: property.id, slug: '1bhk-villa' },
    select: { id: true },
  });
  const bhk2 = await prisma.rentableUnit.findFirstOrThrow({
    where: { propertyId: property.id, slug: '2bhk-villa' },
    select: { id: true },
  });

  await prisma.rentableUnitListing.upsert({
    where: { rentableUnitId: fullFarm.id },
    create: {
      rentableUnitId: fullFarm.id,
      published: true,
      sortOrder: 0,
      matrixRole: RentableUnitMatrixRole.FULL_FARM,
      cardTitle: 'Full Farm Stay',
      cardShort:
        'The entire property—both villas plus lawns and walkways—reserved only for your group.',
      bestFor: ['Families', 'Friend groups', 'Private celebrations', 'Longer weekend stays', 'Guests who want complete privacy'],
      descriptionMarkdown:
        'Enjoy the full Mavu Days experience with both villas, open green spaces, quiet corners, and the feeling of having the entire farm to yourself. Wake up to birdsong, stroll the mango paths at your own pace, and spend evenings under open skies.',
      highlights: [
        'Exclusive use of the entire 2-acre property',
        'Both 1BHK and 2BHK villas included',
        'Private open lawns and garden areas',
        'Bonfire area and outdoor seating',
        'Swimming pool access',
        'Caretaker on call throughout your stay',
      ],
      amenities: ['Swimming Pool', 'Lush Garden', 'Bonfire Area', 'Wi-Fi', 'AC Bedrooms', 'Kitchen Access', 'Ample Parking', 'Caretaker Support'],
      ctaLabel: 'Book Full Farm Stay',
      weekdayPriceMinor: 14999,
      fridayPriceMinor: 17999,
      saturdayPriceMinor: 19999,
      sundayPriceMinor: 16999,
      longWeekendPriceMinor: 24999,
      guestsHint: 12,
      bedroomsHint: 2,
      seoTitle: 'Full Farm Stay | Mavu Days — Private Mango Farm Near Bangalore',
      seoDescription:
        'Book the entire Mavu Days mango farm near Bangalore. Exclusive use of both villas, open lawns, pool, and all spaces for up to 12 guests.',
      detailHeroUrl: `${siteBase}/full-farm.jpg`,
    },
    update: {
      published: true,
      sortOrder: 0,
      matrixRole: RentableUnitMatrixRole.FULL_FARM,
      cardTitle: 'Full Farm Stay',
      cardShort:
        'The entire property—both villas plus lawns and walkways—reserved only for your group.',
      bestFor: ['Families', 'Friend groups', 'Private celebrations', 'Longer weekend stays', 'Guests who want complete privacy'],
      descriptionMarkdown:
        'Enjoy the full Mavu Days experience with both villas, open green spaces, quiet corners, and the feeling of having the entire farm to yourself. Wake up to birdsong, stroll the mango paths at your own pace, and spend evenings under open skies.',
      highlights: [
        'Exclusive use of the entire 2-acre property',
        'Both 1BHK and 2BHK villas included',
        'Private open lawns and garden areas',
        'Bonfire area and outdoor seating',
        'Swimming pool access',
        'Caretaker on call throughout your stay',
      ],
      amenities: ['Swimming Pool', 'Lush Garden', 'Bonfire Area', 'Wi-Fi', 'AC Bedrooms', 'Kitchen Access', 'Ample Parking', 'Caretaker Support'],
      ctaLabel: 'Book Full Farm Stay',
      weekdayPriceMinor: 14999,
      fridayPriceMinor: 17999,
      saturdayPriceMinor: 19999,
      sundayPriceMinor: 16999,
      longWeekendPriceMinor: 24999,
      guestsHint: 12,
      bedroomsHint: 2,
      seoTitle: 'Full Farm Stay | Mavu Days — Private Mango Farm Near Bangalore',
      seoDescription:
        'Book the entire Mavu Days mango farm near Bangalore. Exclusive use of both villas, open lawns, pool, and all spaces for up to 12 guests.',
      detailHeroUrl: `${siteBase}/full-farm.jpg`,
    },
  });

  await prisma.rentableUnitListing.upsert({
    where: { rentableUnitId: bhk1.id },
    create: {
      rentableUnitId: bhk1.id,
      published: true,
      sortOrder: 10,
      matrixRole: RentableUnitMatrixRole.VILLA_1BHK,
      cardTitle: '1BHK Villa Stay',
      cardShort:
        'A snug private villa tucked into the grove—perfect for couples, solo travellers, or a family of three.',
      bestFor: ['Couples', 'Small families', 'Solo retreats', 'Work-from-nature stays', 'Quiet weekend breaks'],
      descriptionMarkdown:
        'Wake up slowly, step outside into nature, and spend your time reading, resting, cooking, walking, or doing nothing at all. The 1BHK villa is your own cosy corner of the farm — private, peaceful, and surrounded by mango trees.',
      highlights: [
        'Private 1-bedroom villa with open veranda',
        'Surrounded by mango trees and greenery',
        'Personal sit-out and outdoor seating',
        'Shared pool access (subject to availability)',
        'Fully equipped kitchen',
        'Caretaker support on request',
      ],
      amenities: ['AC Bedroom', 'Private Veranda', 'Kitchen Access', 'Wi-Fi', 'Caretaker Support', 'Lush Garden Views', 'Ample Parking'],
      ctaLabel: 'Book 1BHK Villa',
      weekdayPriceMinor: 5499,
      fridayPriceMinor: 6999,
      saturdayPriceMinor: 7999,
      sundayPriceMinor: 5999,
      longWeekendPriceMinor: 9999,
      guestsHint: 3,
      bedroomsHint: 1,
      seoTitle: '1BHK Villa Stay | Mavu Days — Private Mango Farm Near Bangalore',
      seoDescription:
        'A cosy 1BHK private villa tucked into the mango grove at Mavu Days, near Bangalore. Perfect for couples and small families.',
      detailHeroUrl: `${siteBase}/1bhk.jpg`,
    },
    update: {
      published: true,
      sortOrder: 10,
      matrixRole: RentableUnitMatrixRole.VILLA_1BHK,
      cardTitle: '1BHK Villa Stay',
      cardShort:
        'A snug private villa tucked into the grove—perfect for couples, solo travellers, or a family of three.',
      bestFor: ['Couples', 'Small families', 'Solo retreats', 'Work-from-nature stays', 'Quiet weekend breaks'],
      descriptionMarkdown:
        'Wake up slowly, step outside into nature, and spend your time reading, resting, cooking, walking, or doing nothing at all. The 1BHK villa is your own cosy corner of the farm — private, peaceful, and surrounded by mango trees.',
      highlights: [
        'Private 1-bedroom villa with open veranda',
        'Surrounded by mango trees and greenery',
        'Personal sit-out and outdoor seating',
        'Shared pool access (subject to availability)',
        'Fully equipped kitchen',
        'Caretaker support on request',
      ],
      amenities: ['AC Bedroom', 'Private Veranda', 'Kitchen Access', 'Wi-Fi', 'Caretaker Support', 'Lush Garden Views', 'Ample Parking'],
      ctaLabel: 'Book 1BHK Villa',
      weekdayPriceMinor: 5499,
      fridayPriceMinor: 6999,
      saturdayPriceMinor: 7999,
      sundayPriceMinor: 5999,
      longWeekendPriceMinor: 9999,
      guestsHint: 3,
      bedroomsHint: 1,
      seoTitle: '1BHK Villa Stay | Mavu Days — Private Mango Farm Near Bangalore',
      seoDescription:
        'A cosy 1BHK private villa tucked into the mango grove at Mavu Days, near Bangalore. Perfect for couples and small families.',
      detailHeroUrl: `${siteBase}/1bhk.jpg`,
    },
  });

  await prisma.rentableUnitListing.upsert({
    where: { rentableUnitId: bhk2.id },
    create: {
      rentableUnitId: bhk2.id,
      published: true,
      sortOrder: 20,
      matrixRole: RentableUnitMatrixRole.VILLA_2BHK,
      cardTitle: '2BHK Villa Stay',
      cardShort:
        'More room indoors and out—for families or two couples who still want farmhouse privacy.',
      bestFor: ['Families', 'Small groups', 'Two couples', 'Parents with children', 'Longer stays'],
      descriptionMarkdown:
        'Spend the day outdoors, gather for meals, and enjoy the quietness of the farm without losing the comfort of a private villa. The 2BHK is spacious enough for families and small groups who want both privacy and shared time.',
      highlights: [
        'Spacious 2-bedroom villa with open veranda',
        'Large covered sit-out area',
        'Shared pool access (subject to availability)',
        'Fully equipped kitchen for self-cooking',
        'Caretaker support on request',
        'Surrounded by farm and open green spaces',
      ],
      amenities: ['2 AC Bedrooms', 'Private Veranda', 'Kitchen Access', 'Wi-Fi', 'Caretaker Support', 'Garden Views', 'Ample Parking'],
      ctaLabel: 'Book 2BHK Villa',
      weekdayPriceMinor: 7999,
      fridayPriceMinor: 9999,
      saturdayPriceMinor: 11999,
      sundayPriceMinor: 8999,
      longWeekendPriceMinor: 14999,
      guestsHint: 6,
      bedroomsHint: 2,
      seoTitle: '2BHK Villa Stay | Mavu Days — Private Mango Farm Near Bangalore',
      seoDescription:
        'Spacious 2BHK private villa at Mavu Days, a mango farm stay near Bangalore. Ideal for families and small groups.',
      detailHeroUrl: `${siteBase}/2bhk.jpg`,
    },
    update: {
      published: true,
      sortOrder: 20,
      matrixRole: RentableUnitMatrixRole.VILLA_2BHK,
      cardTitle: '2BHK Villa Stay',
      cardShort:
        'More room indoors and out—for families or two couples who still want farmhouse privacy.',
      bestFor: ['Families', 'Small groups', 'Two couples', 'Parents with children', 'Longer stays'],
      descriptionMarkdown:
        'Spend the day outdoors, gather for meals, and enjoy the quietness of the farm without losing the comfort of a private villa. The 2BHK is spacious enough for families and small groups who want both privacy and shared time.',
      highlights: [
        'Spacious 2-bedroom villa with open veranda',
        'Large covered sit-out area',
        'Shared pool access (subject to availability)',
        'Fully equipped kitchen for self-cooking',
        'Caretaker support on request',
        'Surrounded by farm and open green spaces',
      ],
      amenities: ['2 AC Bedrooms', 'Private Veranda', 'Kitchen Access', 'Wi-Fi', 'Caretaker Support', 'Garden Views', 'Ample Parking'],
      ctaLabel: 'Book 2BHK Villa',
      weekdayPriceMinor: 7999,
      fridayPriceMinor: 9999,
      saturdayPriceMinor: 11999,
      sundayPriceMinor: 8999,
      longWeekendPriceMinor: 14999,
      guestsHint: 6,
      bedroomsHint: 2,
      seoTitle: '2BHK Villa Stay | Mavu Days — Private Mango Farm Near Bangalore',
      seoDescription:
        'Spacious 2BHK private villa at Mavu Days, a mango farm stay near Bangalore. Ideal for families and small groups.',
      detailHeroUrl: `${siteBase}/2bhk.jpg`,
    },
  });

  await seedLandingCmsIfEmpty(prisma, org.id);

  console.log(
    `[seed] Org "${orgSlug}": MATRIX_THREE_SKU site settings + listings for ${units.map((x) => x.slug).join(', ')} on property "${propertySlug}".`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
