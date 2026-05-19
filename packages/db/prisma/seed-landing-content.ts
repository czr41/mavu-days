/**
 * Idempotent bootstrap: CMS sections + gallery media aligned with DEFAULT_LANDING in the web app.
 * Uses SEED_PUBLIC_ORIGIN (default http://localhost:3000) for image URLs.
 */
import type { PrismaClient } from '@prisma/client';

const DEFAULT_FAQS_JSON = JSON.stringify(
  [
    {
      q: 'Where is Mavu Days located?',
      a: 'About 65 km from Bangalore near Channapatna—pinned as “Mavu Days, Farm House” on Google Maps; use Get Directions on this page for the route.',
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
    { title: 'Farm Walks', text: 'Wander through mango trees & fresh air' },
    { title: 'Quiet Weekends', text: 'Unplug & enjoy peaceful, unhurried days' },
    { title: 'Outdoor Evenings', text: 'Firefly skies, warm nights & good conversations' },
    { title: 'Private Stay Options', text: 'Choose 1BHK, 2BHK or the entire farm' },
    { title: 'Family Friendly', text: 'Safe, spacious & built for family memories' },
    { title: 'Nature Escape', text: 'Green, open & close to everything that matters' },
  ],
  null,
  2,
);

const WHO_JSON = JSON.stringify(
  [
    { title: 'Families', body: 'Room to unplug—no pacing or noise worries.' },
    { title: 'Couples', body: 'Slow mornings on the patio; evenings in lamp light, not city glare.' },
    { title: 'Friend Groups', body: 'Full Farm or villas—soundtrack of laughter, not playlists.' },
    { title: 'Work-from-Nature Guests', body: 'Calls with grove breezes—Wi‑Fi when you need it.' },
    { title: 'Small Celebrations', body: 'Milestones with your people—calm over crowds.' },
    { title: 'Pet Parents', body: 'Two fenced acres—see the pet note below amenities.' },
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
        'Peaceful 2-acre mango farm stay near Bangalore—quiet weekends, family time, and slow mornings in nature.',
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
    {
      key: 'landing-availability-eyebrow',
      title: 'Availability eyebrow',
      bodyMarkdown: 'Book your stay',
      sortOrder: 19,
    },
    { key: 'landing-availability-title', title: 'Availability section title', bodyMarkdown: 'Check Your Dates', sortOrder: 20 },
    {
      key: 'landing-availability-intro',
      title: 'Availability intro',
      bodyMarkdown:
        'Share your dates—we match openings for Full Farm, 1BHK, or 2BHK.',
      sortOrder: 21,
    },
    { key: 'landing-stays-title', title: 'Stays section title', bodyMarkdown: 'Choose Your Stay', sortOrder: 30 },
    {
      key: 'landing-stays-intro',
      title: 'Stays intro',
      bodyMarkdown:
        'Couples, families, or the full farm—same mango homestead, your pace.',
      sortOrder: 31,
    },
    { key: 'landing-stays-eyebrow', title: 'Stays eyebrow', bodyMarkdown: 'Your stay options', sortOrder: 32 },
    { key: 'landing-why-title', title: 'Why section title', bodyMarkdown: 'A Farm Stay Made for Slower Days', sortOrder: 40 },
    {
      key: 'landing-why-intro',
      title: 'Why intro',
      bodyMarkdown: 'Forget packed itineraries—you get space to breathe and live life at your tempo.',
      sortOrder: 41,
    },
    { key: 'landing-why-blocks', title: 'Why blocks (JSON)', bodyMarkdown: WHY_JSON, sortOrder: 42 },
    { key: 'landing-experience-eyebrow', title: 'Experiences eyebrow', bodyMarkdown: 'Slow living on the farm', sortOrder: 43 },
    { key: 'landing-experience-story-eyebrow', title: 'Experience story eyebrow', bodyMarkdown: 'Our homestead', sortOrder: 44 },
    { key: 'landing-experience-rhythm-eyebrow', title: 'Experience rhythm eyebrow', bodyMarkdown: 'The daily rhythm', sortOrder: 45 },
    { key: 'landing-experience-title', title: 'Experience title', bodyMarkdown: 'What a Day at Mavu Days Feels Like', sortOrder: 50 },
    {
      key: 'landing-experience-body',
      title: 'Experience body',
      bodyMarkdown:
        'Slow mornings under the mango canopy, daylight that feels forgiving, and evenings with room to breathe—your unrushed farm day.',
      sortOrder: 51,
    },
    {
      key: 'landing-experience-tiles',
      title: 'Experience tiles (one per line)',
      bodyMarkdown:
        'Morning walks through the farm\nSlow breakfasts\nFamily time outdoors\nReading and resting\nStargazing\nQuiet conversations\nPrivate villa comfort\nWeekend reset near Bangalore',
      sortOrder: 52,
    },
    { key: 'landing-gallery-title', title: 'Gallery title', bodyMarkdown: 'See the farm before you arrive', sortOrder: 60 },
    { key: 'landing-gallery-intro', title: 'Gallery intro', bodyMarkdown: 'A quick look around the homestead before you arrive.', sortOrder: 61 },
    { key: 'landing-gallery-eyebrow', title: 'Gallery eyebrow', bodyMarkdown: 'First look', sortOrder: 62 },
    { key: 'landing-who-title', title: 'Who section title', bodyMarkdown: 'Who Mavu Days is Perfect For', sortOrder: 70 },
    { key: 'landing-who-for-intro', title: 'Who intro', bodyMarkdown: 'Couples, families, groups, workations, small celebrations.', sortOrder: 71 },
    { key: 'landing-who-eyebrow', title: 'Who eyebrow', bodyMarkdown: 'Who it suits', sortOrder: 72 },
    { key: 'landing-who-cards', title: 'Who cards (JSON)', bodyMarkdown: WHO_JSON, sortOrder: 73 },
    { key: 'landing-pet-friendly-eyebrow', title: 'Pet-friendly eyebrow', bodyMarkdown: 'Pet-friendly stay', sortOrder: 77 },
    { key: 'landing-pet-friendly-title', title: 'Pet-friendly title', bodyMarkdown: 'Room for dogs to gallop—not just tagging along', sortOrder: 78 },
    {
      key: 'landing-pet-friendly-lead',
      title: 'Pet-friendly lead',
      bodyMarkdown:
        'The farm sits inside fenced grounds so your pup can sniff, sprint, and nap in the shade while you unwind on the veranda.',
      sortOrder: 79,
    },
    {
      key: 'landing-pet-friendly-body',
      title: 'Pet-friendly body',
      bodyMarkdown: `Mavu Days is roughly two fenced acres of mango paths, lawns, and open pockets of grass—the kind of space city dogs rarely get without a long drive. Let them leash-off once you know the layout (we will point out the gate on arrival).

We genuinely enjoy hosting pet parents. When you skim our house guidelines, anything about animals on the farm refers to how the owners maintain the homestead and resident animals—not a tightening list of restrictions for visiting dogs.

Mention breed and temperament when you book so we ready the right greeting; then pack the leash for the driveway and the tennis ball for the lawn.`,
      sortOrder: 80,
    },
    { key: 'landing-location-title', title: 'Location title', bodyMarkdown: 'Near Yet Far Enough', sortOrder: 81 },
    {
      key: 'landing-location-body',
      title: 'Location body',
      bodyMarkdown: '~65 km from Bangalore—farm roads, mango groves, and a quiet reset.',
      sortOrder: 82,
    },
    {
      key: 'landing-location-bullets',
      title: 'Location bullets (one per line)',
      bodyMarkdown:
        '65 km from Bangalore (~1.5 hrs drive)\n25 km from Channapatna\n35 km from Ramanagara\nWell-connected roads all the way',
      sortOrder: 83,
    },
    { key: 'landing-location-eyebrow', title: 'Location eyebrow', bodyMarkdown: 'Getting here', sortOrder: 84 },
    { key: 'landing-amenities-title', title: 'Amenities title', bodyMarkdown: 'Amenities at Mavu Days', sortOrder: 90 },
    {
      key: 'landing-amenities-intro',
      title: 'Amenities intro',
      bodyMarkdown: 'Simple comforts that honour privacy and outdoors time.',
      sortOrder: 91,
    },
    { key: 'landing-amenities-eyebrow', title: 'Amenities eyebrow', bodyMarkdown: 'Comforts included', sortOrder: 92 },
    {
      key: 'landing-amenities-list',
      title: 'Amenities list (one per line)',
      bodyMarkdown:
        'Wi-Fi\nAC Bedrooms\nFully Equipped Kitchen\nPet Friendly\nFenced Ground\nOutdoor Seating & Lawn\nBonfire (Extra)\nParking Available',
      sortOrder: 93,
    },
    { key: 'landing-banner-title', title: 'Banner title', bodyMarkdown: 'Ready to book your farm weekend?', sortOrder: 100 },
    {
      key: 'landing-banner-copy',
      title: 'Banner copy',
      bodyMarkdown: 'Pick dates and a stay option—then confirm on WhatsApp.',
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
    { key: 'landing-house-rules-eyebrow', title: 'House rules eyebrow', bodyMarkdown: 'Please read first', sortOrder: 112 },
    { key: 'landing-house-rules', title: 'House rules (JSON)', bodyMarkdown: HOUSE_RULES_JSON, sortOrder: 113 },
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
    { key: 'landing-reviews-eyebrow', title: 'Reviews eyebrow', bodyMarkdown: 'Guest love', sortOrder: 123 },
    { key: 'landing-faq-title', title: 'FAQ title', bodyMarkdown: 'Frequently Asked Questions', sortOrder: 130 },
    { key: 'landing-faq-eyebrow', title: 'FAQ eyebrow', bodyMarkdown: 'Common questions', sortOrder: 131 },
    { key: 'landing-faqs', title: 'FAQs (JSON)', bodyMarkdown: DEFAULT_FAQS_JSON, sortOrder: 132 },
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
  const mediaRows: {
    key: string;
    publicUrl: string;
    alt: string;
    galleryCategory?: 'ROOM' | 'OUTDOOR' | 'PORCH' | 'VIEW' | 'OTHER';
  }[] = [
    {
      key: 'landing-hero-cover',
      publicUrl: '/hero.jpg',
      alt: 'Mavu Days — private mango farm stay near Bangalore',
    },
    { key: 'gallery-room-1', publicUrl: '/1bhk.jpg', alt: '1BHK bedroom and living space', galleryCategory: 'ROOM' },
    { key: 'gallery-room-2', publicUrl: '/2bhk.jpg', alt: '2BHK villa interior', galleryCategory: 'ROOM' },
    {
      key: 'gallery-outdoor-1',
      publicUrl: '/full-farm.jpg',
      alt: 'Farm lawn and outdoor areas',
      galleryCategory: 'OUTDOOR',
    },
    { key: 'gallery-porch-1', publicUrl: '/hero.jpg', alt: 'Porch and sitout seating', galleryCategory: 'PORCH' },
    { key: 'gallery-view-1', publicUrl: '/2bhk.jpg', alt: 'Open sky and farm views', galleryCategory: 'VIEW' },
  ];
  for (const row of mediaRows) {
    const { galleryCategory, ...rest } = row;
    await prisma.mediaAsset.upsert({
      where: { organizationId_key: { organizationId, key: row.key } },
      create: { organizationId, ...rest, galleryCategory: galleryCategory ?? null },
      update: { galleryCategory: galleryCategory ?? null },
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

  console.log(`[seed] Landing CMS sections + media ensured for org.`);
}
