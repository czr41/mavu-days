import { GalleryFullView } from '@/components/landing/gallery-category-groups';
import { loadLandingPayload } from '@/lib/landing-data';

export const metadata = {
  title: 'Gallery | Mavu Days',
  description: 'Photos of rooms, outdoor spaces, porch and sitout, views, and more at Mavu Days farm stay.',
};

export default async function GalleryPage() {
  const { merged, orgName } = await loadLandingPayload();
  return <GalleryFullView items={merged.gallery} heroImageUrl={merged.heroImageUrl} orgName={orgName} />;
}
