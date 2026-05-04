/**
 * Defaults match the SEO landing blueprint.
 * Overrides: publish Site Sections in the admin keyed as below (published=true).
 * — Prefer `bodyMarkdown` for paragraphs; either field can hold a short headline.
 */

import type { PublicContentPayload, SiteSectionDto } from './public-types';

export function sectionText(sec: SiteSectionDto | undefined, fallback: string): string {
  if (!sec) return fallback;
  const body = sec.bodyMarkdown?.trim();
  if (body) return body;
  return sec.title?.trim() || fallback;
}

export const SECTION_KEY = {
  heroEyebrow: 'landing-hero-eyebrow',
  heroH1: 'landing-hero-h1',
  heroSub: 'landing-hero-sub',
  brandLine: 'landing-brand-line',
  availabilityIntro: 'landing-availability-intro',
  staysIntro: 'landing-stays-intro',
  whyIntro: 'landing-why-intro',
  experienceBody: 'landing-experience-body',
  galleryIntro: 'landing-gallery-intro',
  whoForIntro: 'landing-who-for-intro',
  locationBody: 'landing-location-body',
  amenitiesIntro: 'landing-amenities-intro',
  amenitiesList: 'landing-amenities-list',
  bannerTitle: 'landing-banner-title',
  bannerCopy: 'landing-banner-copy',
  houseRulesIntro: 'landing-house-rules-intro',
  reviewsIntro: 'landing-reviews-intro',
  seoTitle: 'landing-seo-title',
  seoBlock: 'landing-seo-block',
} as const;

export const MEDIA_KEY = {
  heroCover: 'landing-hero-cover',
  galleryPrefix: 'landing-gallery-',
};

export type ListingPricing = {
  weekday: number;
  friday: number;
  saturday: number;
  sunday: number;
  longWeekend: number;
};

export type ListingCard = {
  id: string;
  title: string;
  short: string;
  bestFor: readonly string[];
  copy: string;
  cta: string;
  guests?: number;
  bedrooms?: number;
  highlights?: readonly string[];
  pricing?: ListingPricing;
  amenities?: readonly string[];
};

export type LandingTexts = {
  heroEyebrow: string;
  heroH1: string;
  heroSub: string;
  brandLine: string;
  chips: readonly string[];
  availabilityTitle: string;
  availabilitySubtitle: string;
  staysTitle: string;
  staysSubtitle: string;
  listings: readonly ListingCard[];
  whyTitle: string;
  whyIntro: string;
  whyBlocks: readonly { title: string; text: string }[];
  experienceTitle: string;
  experienceBodyDefault: string;
  tiles: readonly string[];
  galleryTitle: string;
  galleryIntroDefault: string;
  whoTitle: string;
  whoIntro: string;
  whoCards: readonly { title: string; body: string }[];
  locationTitle: string;
  locationBodyDefault: string;
  locationBulletsDefault: readonly string[];
  amenitiesTitle: string;
  amenitiesIntroDefault: string;
  amenitiesDefault: string[];
  bannerTitleDefault: string;
  bannerCopyDefault: string;
  houseRulesTitle: string;
  houseRulesIntroDefault: string;
  houseRules: readonly { title: string; text: string }[];
  reviewsTitle: string;
  reviewsIntroDefault: string;
  reviewQuotes: readonly string[];
  seoTitle: string;
  seoBodyDefault: string;
  faqTitle: string;
  faqs: readonly { q: string; a: string }[];
  footerNote: string;
};

export const DEFAULT_LANDING: LandingTexts = {
  heroEyebrow: 'Private Mango Farm Stay Near Bangalore',
  heroH1: 'Slow Down at Mavu Days',
  heroSub:
    'A peaceful 2-acre mango farm stay about 65 km from Bangalore, created for quiet weekends, family time, mindful escapes, and slow mornings in nature.',
  brandLine: 'A slower kind of weekend, just outside Bangalore.',
  chips: [
    '2-Acre Mango Farm',
    '1BHK, 2BHK & Full Farm Options',
    'Near Bangalore',
    'Private Villa Stay',
    'Ideal for Families & Groups',
  ],
  availabilityTitle: 'Check Your Dates',
  availabilitySubtitle: 'Tell us when you’d like to visit—we’ll match you to Full Farm, 1BHK, or 2BHK openings.',
  staysTitle: 'Choose Your Stay',
  staysSubtitle: 'Quiet couples, young families, or a full-property celebration—stay your way on the same mango farm.',
  listings: [
    {
      id: 'full-farm',
      title: 'Full Farm Stay',
      short:
        'The entire property—both villas plus lawns and walkways—reserved only for your group.',
      bestFor: ['Families', 'Friend groups', 'Private celebrations', 'Longer weekend stays', 'Guests who want complete privacy'],
      guests: 12,
      bedrooms: 2,
      copy:
        'Enjoy the full Mavu Days experience with both villas, open green spaces, quiet corners, and the feeling of having the entire farm to yourself. Wake up to birdsong, stroll the mango paths at your own pace, and spend evenings under open skies.',
      highlights: [
        'Exclusive use of the entire 2-acre property',
        'Both 1BHK and 2BHK villas included',
        'Private open lawns and garden areas',
        'Bonfire area and outdoor seating',
        'Swimming pool access',
        'Caretaker on call throughout your stay',
      ],
      pricing: { weekday: 14999, friday: 17999, saturday: 19999, sunday: 16999, longWeekend: 24999 },
      amenities: ['Swimming Pool', 'Lush Garden', 'Bonfire Area', 'Wi-Fi', 'AC Bedrooms', 'Kitchen Access', 'Ample Parking', 'Caretaker Support'],
      cta: 'Book Full Farm Stay',
    },
    {
      id: '1bhk',
      title: '1BHK Villa Stay',
      short:
        'A snug private villa tucked into the grove—perfect for couples, solo travellers, or a family of three.',
      bestFor: ['Couples', 'Small families', 'Solo retreats', 'Work-from-nature stays', 'Quiet weekend breaks'],
      guests: 3,
      bedrooms: 1,
      copy:
        'Wake up slowly, step outside into nature, and spend your time reading, resting, cooking, walking, or doing nothing at all. The 1BHK villa is your own cosy corner of the farm — private, peaceful, and surrounded by mango trees.',
      highlights: [
        'Private 1-bedroom villa with open veranda',
        'Surrounded by mango trees and greenery',
        'Personal sit-out and outdoor seating',
        'Shared pool access (subject to availability)',
        'Fully equipped kitchen',
        'Caretaker support on request',
      ],
      pricing: { weekday: 5499, friday: 6999, saturday: 7999, sunday: 5999, longWeekend: 9999 },
      amenities: ['AC Bedroom', 'Private Veranda', 'Kitchen Access', 'Wi-Fi', 'Caretaker Support', 'Lush Garden Views', 'Ample Parking'],
      cta: 'Book 1BHK Villa',
    },
    {
      id: '2bhk',
      title: '2BHK Villa Stay',
      short:
        'More room indoors and out—for families or two couples who still want farmhouse privacy.',
      bestFor: ['Families', 'Small groups', 'Two couples', 'Parents with children', 'Longer stays'],
      guests: 6,
      bedrooms: 2,
      copy: 'Spend the day outdoors, gather for meals, and enjoy the quietness of the farm without losing the comfort of a private villa. The 2BHK is spacious enough for families and small groups who want both privacy and shared time.',
      highlights: [
        'Spacious 2-bedroom villa with open veranda',
        'Large covered sit-out area',
        'Shared pool access (subject to availability)',
        'Fully equipped kitchen for self-cooking',
        'Caretaker support on request',
        'Surrounded by farm and open green spaces',
      ],
      pricing: { weekday: 7999, friday: 9999, saturday: 11999, sunday: 8999, longWeekend: 14999 },
      amenities: ['2 AC Bedrooms', 'Private Veranda', 'Kitchen Access', 'Wi-Fi', 'Caretaker Support', 'Garden Views', 'Ample Parking'],
      cta: 'Book 2BHK Villa',
    },
  ],
  whyTitle: 'A Farm Stay Made for Slower Days',
  whyIntro: 'Forget packed itineraries—you get space to breathe and the farm at your tempo.',
  whyBlocks: [
    { title: 'A Real Mango Farm', text: 'Stay inside a 2-acre mango farm where the experience is simple, natural, and rooted in the land.' },
    { title: 'Close to Bangalore, Far from the Rush', text: 'A comfortable drive brings you into a quieter world of trees, open skies, and slower time.' },
    { title: 'Private Stay Options', text: 'Choose the full farm, the 1BHK villa, or the 2BHK villa based on your group size and privacy needs.' },
    { title: 'Perfect for Quiet Weekends', text: 'Ideal for reading, cooking, resting, conversations, family bonding, stargazing, and screen-free time.' },
    { title: 'Flexible for Different Groups', text: 'Couples, families, friend groups, and small private gatherings can all find a stay format that works.' },
    { title: 'Nature Without Overplanning', text: 'No forced itinerary. Just arrive, settle in, and enjoy the farm at your pace.' },
  ],
  experienceTitle: 'What a Day at Mavu Days Feels Like',
  experienceBodyDefault: `Morning is unhurried—coffee on the porch, slow walks beneath the mango canopy, and daylight that feels forgiving. Evening brings quieter air and more room between conversations, with skies that remind you why you left traffic behind.`,
  tiles: [
    'Morning walks through the farm',
    'Slow breakfasts',
    'Family time outdoors',
    'Reading and resting',
    'Stargazing',
    'Quiet conversations',
    'Private villa comfort',
    'Weekend reset near Bangalore',
  ],
  galleryTitle: 'See the Farm Before You Arrive',
  galleryIntroDefault: 'A quick look around the homestead before you arrive.',
  whoTitle: 'Who Mavu Days is Perfect For',
  whoIntro: 'Couples, families, friends, remote weeks, and toast-sized celebrations.',
  whoCards: [
    {
      title: 'Families',
      body: 'Space to unplug without worrying about pacing or noise.',
    },
    {
      title: 'Couples',
      body: 'Slow mornings on the villa patio and evenings lit by warm lamp light—not city glare.',
    },
    {
      title: 'Friend Groups',
      body: 'Take the Full Farm booking and tailor the soundtrack to laughter, not playlists.',
    },
    {
      title: 'Work-from-Nature Guests',
      body: 'Swap fluorescent calls for breezes through the grove—Wi-Fi permitting, guilt-free slowdown.',
    },
    {
      title: 'Small Celebrations',
      body: 'Small milestones with the people who matter—house rules favour calm over crowds.',
    },
  ],
  locationTitle: 'A Farm Stay Near Bangalore, Without Going Too Far',
  locationBodyDefault:
    'Mavu Days sits about 65 km from Bangalore—close enough for a comfortable drive, quiet enough for a real reset.',
  locationBulletsDefault: [
    'Around 65 km from Bangalore',
    'Suited for weekend trips',
    'Good for overnight and two-night stays',
    'Peaceful farm setting',
    'Away from city noise',
  ],
  amenitiesTitle: 'Amenities at Mavu Days',
  amenitiesIntroDefault: 'Simple comforts that honour privacy and outdoors time.',
  amenitiesDefault: ['Private villa options', 'Full farm booking', 'Open farm space', 'Parking', 'Outdoor seating', 'Family-friendly stay'],
  bannerTitleDefault: 'Ready to Plan Your Farm Stay?',
  bannerCopyDefault: 'Choose your dates, select your preferred stay option, and book a quiet escape at Mavu Days.',
  houseRulesTitle: 'Before You Book',
  houseRulesIntroDefault:
    'Mavu Days is designed as a peaceful farm stay. To keep the experience comfortable for all guests and respectful to the land, please review the stay guidelines before booking.',
  houseRules: [
    { title: 'Peaceful Stay', text: 'Suited for quiet getaways and family stays. Loud music and disruptive gatherings may not be allowed.' },
    { title: 'Respect the Farm', text: 'Please treat trees, outdoor areas, and surroundings with care.' },
    { title: 'Guest Count', text: 'Book for the correct number of guests; additional guests may need prior approval.' },
    { title: 'Check-in and Check-out', text: 'Timings are shared during booking confirmation.' },
    { title: 'Food and Kitchen', text: 'Share food or kitchen preferences before arrival so the team can guide you.' },
    { title: 'Pets', text: 'Confirm pet details before booking if pets are allowed.' },
  ],
  reviewsTitle: 'Guest Moments at Mavu Days',
  reviewsIntroDefault: 'Stories from travellers who chased quiet—and found it.',
  reviewQuotes: [
    'Peaceful, private, and exactly what we needed for a weekend away from Bangalore.',
    'A beautiful farm setting with enough space for the family to relax and unwind.',
    'The perfect place to disconnect from city noise and spend slow time with loved ones.',
  ],
  seoTitle: 'A Private Farm Stay Near Bangalore for Slow Weekends',
  seoBodyDefault: `Mavu Days is a mango farm getaway roughly 65 km from Bengaluru blending 1BHK, 2BHK, or full-property availability for guests craving privacy and nature—not resort crowds.\n\nTravellers often find us searching for Bangalore farm stays, quiet villa weekends, mango farm bungalows, or family homestead stays within a comfortable Saturday drive.`,
  faqTitle: 'Frequently Asked Questions',
  faqs: [
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
    {
      q: 'Can I bring pets?',
      a: 'Please confirm before booking. Pet rules apply if pets are allowed.',
    },
    { q: 'Is this a party place?', a: 'Designed for peaceful stays—not loud parties.' },
    { q: 'How do I book Mavu Days?', a: 'Check availability here and WhatsApp us to finish your enquiry.' },
  ],
  footerNote: 'Plan your next slow weekend at Mavu Days.',
};

function sectionMap(sections: SiteSectionDto[]) {
  const m = new Map<string, SiteSectionDto>();
  for (const s of sections) m.set(s.key, s);
  return m;
}

function parseLineList(text: string, fallback: readonly string[]): string[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length ? lines : [...fallback];
}

export type MergedLanding = {
  texts: LandingTexts;
  merged: Record<string, string>;
  heroImageUrl?: string | null;
  gallery: { url: string; alt: string; key: string }[];
};

function cloneDefault(): LandingTexts {
  return JSON.parse(JSON.stringify(DEFAULT_LANDING)) as LandingTexts;
}

function buildGallery(
  payload: PublicContentPayload | null,
): { url: string; alt: string; key: string }[] {
  const media = payload?.media ?? [];
  const seoAlts = [
    'Mavu Days mango farm stay near Bangalore',
    'Private 1BHK villa at Mavu Days farm stay',
    '2BHK villa stay near Bangalore at Mavu Days',
    'Peaceful farm stay near Bangalore for families',
    'Weekend getaway near Bangalore at a mango farm',
  ];
  let idx = 0;
  const list = [...media].sort((a, b) => a.key.localeCompare(b.key));
  const items: { url: string; alt: string; key: string }[] = [];
  for (const m of list) {
    const k = m.key.toLowerCase();
    const isGallery =
      k === MEDIA_KEY.heroCover.toLowerCase()
        ? false
        : k.startsWith(MEDIA_KEY.galleryPrefix) || k.includes('landing-gallery');
    if (!isGallery) continue;
    if (k === MEDIA_KEY.heroCover.toLowerCase()) continue;
    items.push({
      url: m.publicUrl,
      key: m.key,
      alt: (m.alt?.trim() || seoAlts[idx % seoAlts.length]) ?? seoAlts[0],
    });
    idx += 1;
  }
  return items;
}

/** Merge editable fields from CMS. */
export function mergeLandingContent(payload: PublicContentPayload | null): MergedLanding {
  const dm = cloneDefault();
  const sections = payload?.sections ?? [];
  const sm = sectionMap(sections);
  const merged: Record<string, string> = {};

  const pick = (key: string, fb: string) => {
    const v = sectionText(sm.get(key), fb);
    merged[key] = v;
    return v;
  };

  dm.heroEyebrow = pick(SECTION_KEY.heroEyebrow, dm.heroEyebrow);
  dm.heroH1 = pick(SECTION_KEY.heroH1, dm.heroH1);
  dm.heroSub = pick(SECTION_KEY.heroSub, dm.heroSub);
  dm.brandLine = pick(SECTION_KEY.brandLine, dm.brandLine);

  dm.availabilitySubtitle = pick(SECTION_KEY.availabilityIntro, dm.availabilitySubtitle);
  dm.staysSubtitle = pick(SECTION_KEY.staysIntro, dm.staysSubtitle);
  dm.whyIntro = pick(SECTION_KEY.whyIntro, dm.whyIntro);

  dm.experienceBodyDefault = pick(SECTION_KEY.experienceBody, dm.experienceBodyDefault);
  dm.galleryIntroDefault = pick(SECTION_KEY.galleryIntro, dm.galleryIntroDefault);
  dm.whoIntro = pick(SECTION_KEY.whoForIntro, dm.whoIntro);

  dm.locationBodyDefault = pick(SECTION_KEY.locationBody, dm.locationBodyDefault);
  dm.amenitiesIntroDefault = pick(SECTION_KEY.amenitiesIntro, dm.amenitiesIntroDefault);

  dm.amenitiesDefault = parseLineList(pick(SECTION_KEY.amenitiesList, dm.amenitiesDefault.join('\n')), dm.amenitiesDefault);

  dm.bannerTitleDefault = pick(SECTION_KEY.bannerTitle, dm.bannerTitleDefault);
  dm.bannerCopyDefault = pick(SECTION_KEY.bannerCopy, dm.bannerCopyDefault);

  dm.houseRulesIntroDefault = pick(SECTION_KEY.houseRulesIntro, dm.houseRulesIntroDefault);
  dm.reviewsIntroDefault = pick(SECTION_KEY.reviewsIntro, dm.reviewsIntroDefault);

  dm.seoTitle = pick(SECTION_KEY.seoTitle, dm.seoTitle);
  dm.seoBodyDefault = pick(SECTION_KEY.seoBlock, dm.seoBodyDefault);

  const heroMedia =
    payload?.media?.find((m) => m.key.toLowerCase() === MEDIA_KEY.heroCover.toLowerCase()) ?? undefined;
  const heroImageUrl = heroMedia?.publicUrl;

  const gallery = buildGallery(payload);

  return { texts: dm, merged, heroImageUrl: heroImageUrl ?? null, gallery };
}
