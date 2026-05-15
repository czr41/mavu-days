/**
 * Idempotent bootstrap: CMS sections + gallery media aligned with DEFAULT_LANDING in the web app.
 * Uses SEED_PUBLIC_ORIGIN (default http://localhost:3000) for image URLs.
 */
import type { PrismaClient } from '@prisma/client';

const DEFAULT_FAQS_JSON = JSON.stringify(
  [
    {
      q: 'Where is Mavu Days located?',
      a: 'About 65 km from Bangalore. The exact location and directions can be shared after booking confirmation.',
    },
    { q: 'What stay options are available?', a: 'Full Farm, 1BHK Villa, or 2BHK Villa depending on availability.' },
    { q: 'Can I book the entire farm?', a: 'Yes—the Full Farm option includes both villas and the farm spaces.' },
    { q: 'Is Mavu Days suitable for families?', a: 'Yes—for a peaceful family farm stay near Bangalore.' },
    { q: 'Is it good for couples?', a: 'Yes—the 1BHK villa suits couples seeking a quiet getaway.' },
    { q: 'Can I book only one villa?', a: 'Yes—1BHK or 2BHK individually, subject to availability.' },
    {
      q: 'What happens if the Full Farm is booked?',
      a: 'If the Full Farm is booked for your dates, the villa options are not offered for those same dates.',
    },
    { q: 'Can I bring pets?', a: 'Yes—we love fenced-farm weekends with dogs. Share breed and temperament when you book; the fenced two-acre space is built for pups to roam.' },
    { q: 'Is this a party place?', a: 'Designed for peaceful stays—not loud parties.' },
    { q: 'How do I book Mavu Days?', a: 'Check availability here and WhatsApp us to finish your enquiry.' },
  ],
  null,
  2,
);

const WHY_JSON = JSON.stringify(
  [
    { title: 'A Real Mango Farm', text: 'Stay inside a 2-acre mango farm where the experience is simple, natural, and rooted in the land.' },
    { title: 'Close to Bangalore, Far from the Rush', text: 'A comfortable drive brings you into a quieter world of trees, open skies, and slower time.' },
    { title: 'Private Stay Options', text: 'Choose the full farm, the 1BHK villa, or the 2BHK villa based on your group size and privacy needs.' },
    { title: 'Perfect for Quiet Weekends', text: 'Ideal for reading, cooking, resting, conversations, family bonding, stargazing, and screen-free time.' },
    { title: 'Flexible for Different Groups', text: 'Couples, families, friend groups, and small private gatherings can all find a stay format that works.' },
    { title: 'Nature Without Overplanning', text: 'No forced itinerary. Just arrive, settle in, and enjoy the farm at your pace.' },
  ],
  null,
  2,
);

const WHO_JSON = JSON.stringify(
  [
    { title: 'Families', body: 'Space to unplug without worrying about pacing or noise.' },
    { title: 'Couples', body: 'Slow mornings on the villa patio and evenings lit by warm lamp light—not city glare.' },
    { title: 'Friend Groups', body: 'Take the Full Farm booking and tailor the soundtrack to laughter, not playlists.' },
    { title: 'Work-from-Nature Guests', body: 'Swap fluorescent calls for breezes through the grove—Wi-Fi permitting, guilt-free slowdown.' },
    { title: 'Small Celebrations', body: 'Small milestones with the people who matter—house rules favour calm over crowds.' },
    { title: 'Pet Parents', body: 'About two fenced acres to run—see our pet-friendly notes just below.' },
  ],
  null,
  2,
);

const HOUSE_RULES_JSON = JSON.stringify(
  [
    { title: 'Peaceful Stay', text: 'Suited for quiet getaways and family stays. Loud music and disruptive gatherings may not be allowed.' },
    { title: 'Respect the Farm', text: 'Please treat trees, outdoor areas, and surroundings with care.' },
    { title: 'Guest Count', text: 'Book for the correct number of guests; additional guests may need prior approval.' },
    { title: 'Check-in and Check-out', text: 'Timings are shared during booking confirmation.' },
    { title: 'Food and Kitchen', text: 'Share food or kitchen preferences before arrival so the team can guide you.' },
    { title: 'Pets', text: 'Guests with dogs are welcome—share details when you book. Pet notes in these guidelines largely cover resident animals & land care.' },
  ],
  null,
  2,
);

type SectionSeed = { key: string; title: string; bodyMarkdown: string; sortOrder: number };

function buildSectionRows(): SectionSeed[] {
  return [
    { key: 'landing-hero-eyebrow', title: 'Hero eyebrow', bodyMarkdown: 'Private Mango Farm Stay Near Bangalore', sortOrder: 10 },
    { key: 'landing-hero-h1', title: 'Hero headline', bodyMarkdown: 'Slow Down at\nMavu Days', sortOrder: 11 },
    {
      key: 'landing-hero-sub',
      title: 'Hero subcopy',
      bodyMarkdown:
        'A peaceful 2-acre mango farm stay about 65 km from Bangalore, created for quiet weekends, family time, mindful escapes, and slow mornings in nature.',
      sortOrder: 12,
    },
    { key: 'landing-brand-line', title: 'Brand line', bodyMarkdown: 'A slower kind of weekend, just outside Bangalore.', sortOrder: 13 },
    {
      key: 'landing-hero-chips',
      title: 'Hero chips (one per line)',
      bodyMarkdown:
        '2-Acre Mango Farm\n1BHK, 2BHK & Full Farm Options\nNear Bangalore\nPrivate Villa Stay\nFenced Ground · Great for Dogs\nIdeal for Families & Groups',
      sortOrder: 14,
    },
    {
      key: 'landing-about-strip-labels',
      title: 'About strip labels (one per line, order matches icons)',
      bodyMarkdown: 'Up to 12 Guests\n1BHK, 2BHK & Full Farm\n65 km from Bangalore\n2-Acre Mango Farm',
      sortOrder: 15,
    },
    { key: 'landing-availability-title', title: 'Availability section title', bodyMarkdown: 'Check Your Dates', sortOrder: 20 },
    {
      key: 'landing-availability-intro',
      title: 'Availability intro',
      bodyMarkdown:
        'Tell us when you’d like to visit—we’ll match you to Full Farm, 1BHK, or 2BHK openings.',
      sortOrder: 21,
    },
    { key: 'landing-stays-title', title: 'Stays section title', bodyMarkdown: 'Choose Your Stay', sortOrder: 30 },
    {
      key: 'landing-stays-intro',
      title: 'Stays intro',
      bodyMarkdown:
        'Quiet couples, young families, or a full-property celebration—stay your way on the same mango farm.',
      sortOrder: 31,
    },
    { key: 'landing-why-title', title: 'Why section title', bodyMarkdown: 'A Farm Stay Made for Slower Days', sortOrder: 40 },
    {
      key: 'landing-why-intro',
      title: 'Why intro',
      bodyMarkdown: 'Forget packed itineraries—you get space to breathe and the farm at your tempo.',
      sortOrder: 41,
    },
    { key: 'landing-why-blocks', title: 'Why blocks (JSON)', bodyMarkdown: WHY_JSON, sortOrder: 42 },
    { key: 'landing-experience-title', title: 'Experience title', bodyMarkdown: 'What a Day at Mavu Days Feels Like', sortOrder: 50 },
    {
      key: 'landing-experience-body',
      title: 'Experience body',
      bodyMarkdown: `Morning is unhurried—coffee on the porch, slow walks beneath the mango canopy, and daylight that feels forgiving. Evening brings quieter air and more room between conversations, with skies that remind you why you left traffic behind.`,
      sortOrder: 51,
    },
    {
      key: 'landing-experience-tiles',
      title: 'Experience tiles (one per line)',
      bodyMarkdown:
        'Morning walks through the farm\nSlow breakfasts\nFamily time outdoors\nReading and resting\nStargazing\nQuiet conversations\nPrivate villa comfort\nWeekend reset near Bangalore',
      sortOrder: 52,
    },
    { key: 'landing-gallery-title', title: 'Gallery title', bodyMarkdown: 'See the Farm Before You Arrive', sortOrder: 60 },
    {
      key: 'landing-gallery-intro',
      title: 'Gallery intro',
      bodyMarkdown: 'A quick look around the homestead before you arrive.',
      sortOrder: 61,
    },
    { key: 'landing-who-title', title: 'Who section title', bodyMarkdown: 'Who Mavu Days is Perfect For', sortOrder: 70 },
    { key: 'landing-who-for-intro', title: 'Who intro', bodyMarkdown: 'Couples, families, friends, remote weeks, and toast-sized celebrations.', sortOrder: 71 },
    { key: 'landing-who-cards', title: 'Who cards (JSON)', bodyMarkdown: WHO_JSON, sortOrder: 72 },
    { key: 'landing-pet-friendly-eyebrow', title: 'Pet-friendly eyebrow', bodyMarkdown: 'Pet-friendly stay', sortOrder: 73 },
    { key: 'landing-pet-friendly-title', title: 'Pet-friendly title', bodyMarkdown: 'Room for dogs to gallop—not just tagging along', sortOrder: 74 },
    {
      key: 'landing-pet-friendly-lead',
      title: 'Pet-friendly lead',
      bodyMarkdown:
        'The farm sits inside fenced grounds so your pup can sniff, sprint, and nap in the shade while you unwind on the veranda.',
      sortOrder: 75,
    },
    {
      key: 'landing-pet-friendly-body',
      title: 'Pet-friendly body',
      bodyMarkdown: `Mavu Days is roughly two fenced acres of mango paths, lawns, and open pockets of grass—the kind of space city dogs rarely get without a long drive. Let them leash-off once you know the layout (we will point out the gate on arrival).

We genuinely enjoy hosting pet parents. When you skim our house guidelines, anything about animals on the farm refers to how the owners maintain the homestead and resident animals—not a tightening list of restrictions for visiting dogs.

Mention breed and temperament when you book so we ready the right greeting; then pack the leash for the driveway and the tennis ball for the lawn.`,
      sortOrder: 76,
    },
    { key: 'landing-location-title', title: 'Location title', bodyMarkdown: 'A Farm Stay Near Bangalore, Without Going Too Far', sortOrder: 80 },
    {
      key: 'landing-location-body',
      title: 'Location body',
      bodyMarkdown:
        'Mavu Days sits about 65 km from Bangalore—close enough for a comfortable drive, quiet enough for a real reset.',
      sortOrder: 81,
    },
    {
      key: 'landing-location-bullets',
      title: 'Location bullets (one per line)',
      bodyMarkdown:
        'Around 65 km from Bangalore\nSuited for weekend trips\nGood for overnight and two-night stays\nPeaceful farm setting\nAway from city noise',
      sortOrder: 82,
    },
    { key: 'landing-amenities-title', title: 'Amenities title', bodyMarkdown: 'Amenities at Mavu Days', sortOrder: 90 },
    {
      key: 'landing-amenities-intro',
      title: 'Amenities intro',
      bodyMarkdown: 'Simple comforts that honour privacy and outdoors time.',
      sortOrder: 91,
    },
    {
      key: 'landing-amenities-list',
      title: 'Amenities list (one per line)',
      bodyMarkdown:
        'Private villa options\nFull farm booking\nOpen farm space\nParking\nOutdoor seating\nFamily-friendly stay',
      sortOrder: 92,
    },
    { key: 'landing-banner-title', title: 'Banner title', bodyMarkdown: 'Ready to Plan Your Farm Stay?', sortOrder: 100 },
    {
      key: 'landing-banner-copy',
      title: 'Banner copy',
      bodyMarkdown:
        'Choose your dates, select your preferred stay option, and book a quiet escape at Mavu Days.',
      sortOrder: 101,
    },
    { key: 'landing-house-rules-title', title: 'House rules title', bodyMarkdown: 'Before You Book', sortOrder: 110 },
    {
      key: 'landing-house-rules-intro',
      title: 'House rules intro',
      bodyMarkdown:
        'Mavu Days is designed as a peaceful farm stay. To keep the experience comfortable for all guests and respectful to the land, please review the stay guidelines before booking.',
      sortOrder: 111,
    },
    { key: 'landing-house-rules', title: 'House rules (JSON)', bodyMarkdown: HOUSE_RULES_JSON, sortOrder: 112 },
    { key: 'landing-reviews-title', title: 'Reviews title', bodyMarkdown: 'Guest Moments at Mavu Days', sortOrder: 120 },
    {
      key: 'landing-reviews-intro',
      title: 'Reviews intro',
      bodyMarkdown: 'Stories from travellers who chased quiet—and found it.',
      sortOrder: 121,
    },
    {
      key: 'landing-review-quotes',
      title: 'Fallback review quotes (one per line; used if no imported reviews)',
      bodyMarkdown:
        'Peaceful, private, and exactly what we needed for a weekend away from Bangalore.\nA beautiful farm setting with enough space for the family to relax and unwind.\nThe perfect place to disconnect from city noise and spend slow time with loved ones.',
      sortOrder: 122,
    },
    { key: 'landing-faq-title', title: 'FAQ title', bodyMarkdown: 'Frequently Asked Questions', sortOrder: 130 },
    { key: 'landing-faqs', title: 'FAQs (JSON)', bodyMarkdown: DEFAULT_FAQS_JSON, sortOrder: 131 },
    {
      key: 'landing-seo-title',
      title: 'SEO collapsed title',
      bodyMarkdown: 'A Private Farm Stay Near Bangalore for Slow Weekends',
      sortOrder: 140,
    },
    {
      key: 'landing-seo-block',
      title: 'SEO body',
      bodyMarkdown: `Mavu Days is a mango farm getaway roughly 65 km from Bengaluru blending 1BHK, 2BHK, or full-property availability for guests craving privacy and nature—not resort crowds.

Travellers often find us searching for Bangalore farm stays, quiet villa weekends, mango farm bungalows, or family homestead stays within a comfortable Saturday drive.`,
      sortOrder: 141,
    },
    { key: 'landing-footer-note', title: 'Footer note', bodyMarkdown: 'Plan your next slow weekend at Mavu Days.', sortOrder: 150 },
  ];
}

export async function seedLandingCmsIfEmpty(prisma: PrismaClient, organizationId: string) {
  const siteBase = (process.env.SEED_PUBLIC_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '');

  const gallery: { key: string; publicUrl: string; alt: string }[] = [
    { key: 'landing-gallery-01', publicUrl: `${siteBase}/hero.jpg`, alt: 'Mavu Days farm and grounds' },
    { key: 'landing-gallery-02', publicUrl: `${siteBase}/1bhk.jpg`, alt: '1BHK villa' },
    { key: 'landing-gallery-03', publicUrl: `${siteBase}/2bhk.jpg`, alt: '2BHK villa' },
    { key: 'landing-gallery-04', publicUrl: `${siteBase}/full-farm.jpg`, alt: 'Full farm stay' },
    { key: 'landing-gallery-05', publicUrl: `${siteBase}/hero.jpg`, alt: 'Outdoor spaces' },
    { key: 'landing-gallery-06', publicUrl: `${siteBase}/1bhk.jpg`, alt: 'Private veranda' },
    { key: 'landing-gallery-07', publicUrl: `${siteBase}/2bhk.jpg`, alt: 'Living space' },
    { key: 'landing-gallery-08', publicUrl: `${siteBase}/full-farm.jpg`, alt: 'Mango grove' },
  ];

  await prisma.mediaAsset.upsert({
    where: { organizationId_key: { organizationId, key: 'landing-hero-cover' } },
    create: {
      organizationId,
      key: 'landing-hero-cover',
      publicUrl: `${siteBase}/hero.jpg`,
      alt: 'Mavu Days — private mango farm stay near Bangalore',
    },
    update: {},
  });

  for (const g of gallery) {
    await prisma.mediaAsset.upsert({
      where: { organizationId_key: { organizationId, key: g.key } },
      create: { organizationId, key: g.key, publicUrl: g.publicUrl, alt: g.alt },
      update: {},
    });
  }

  for (const row of buildSectionRows()) {
    const existing = await prisma.siteSection.findUnique({
      where: { organizationId_key: { organizationId, key: row.key } },
    });
    if (existing) continue;
    await prisma.siteSection.create({
      data: {
        organizationId,
        key: row.key,
        title: row.title,
        bodyMarkdown: row.bodyMarkdown,
        sortOrder: row.sortOrder,
        published: true,
      },
    });
  }

  console.log(`[seed] Landing CMS sections + media ensured for org (${siteBase}).`);
}
