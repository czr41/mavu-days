import { PLT_LABEL } from '@/lib/guest-review-platform-labels';

/**
 * Badge / glyph for synced guest-review source — logos for Google Maps + Airbnb so cards are easy to scan.
 */

type Props = {
  platform: string;
  /** Default card header uses `md`. */
  size?: 'sm' | 'md';
  className?: string;
};

/** Google multi-colour “G”, Airbnb coral Bélo, or concise text for manual imports (Booking.com / Direct / Other). */
export function GuestReviewPlatformBadge({ platform, size = 'md', className = '' }: Props) {
  const w = size === 'sm' ? 18 : 24;
  const h = size === 'sm' ? 18 : 24;
  const base = `${className} md-review-platform-badge`.trim();

  if (platform === 'GOOGLE') {
    return (
      <span className={base} title="Google Maps" aria-label="Review from Google Maps">
        <svg width={w} height={h} viewBox="0 0 24 24" role="presentation" xmlns="http://www.w3.org/2000/svg">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      </span>
    );
  }

  if (platform === 'AIRBNB') {
    return (
      <span className={base} title="Airbnb" aria-label="Review from Airbnb">
        <svg width={w} height={h} viewBox="0 0 24 24" role="presentation" xmlns="http://www.w3.org/2000/svg">
          <path
            fill="#FF385C"
            d="M12.001 18.275c-1.353-1.697-2.148-3.184-2.413-4.457-.263-1.027-.16-1.848.291-2.465.477-.71 1.188-1.056 2.121-1.056s1.643.345 2.12 1.063c.446.61.558 1.432.286 2.465-.291 1.298-1.085 2.785-2.412 4.458zm9.601 1.14c-.185 1.246-1.034 2.28-2.2 2.783-2.253.98-4.483-.583-6.392-2.704 3.157-3.951 3.74-7.028 2.385-9.018-.795-1.14-1.933-1.695-3.394-1.695-2.944 0-4.563 2.49-3.927 5.382.37 1.565 1.352 3.343 2.917 5.332-.98 1.085-1.91 1.856-2.732 2.333-.636.344-1.245.558-1.828.609-2.679.399-4.778-2.2-3.825-4.88.132-.345.395-.98.845-1.961l.025-.053c1.464-3.178 3.242-6.79 5.285-10.795l.053-.132.58-1.116c.45-.822.635-1.19 1.351-1.643.346-.21.77-.315 1.246-.315.954 0 1.698.558 2.016 1.007.158.239.345.557.582.953l.558 1.089.08.159c2.041 4.004 3.821 7.608 5.279 10.794l.026.025.533 1.22.318.764c.243.613.294 1.222.213 1.858zm1.22-2.39c-.186-.583-.505-1.271-.9-2.094v-.03c-1.889-4.006-3.642-7.608-5.307-10.844l-.111-.163C15.317 1.461 14.468 0 12.001 0c-2.44 0-3.476 1.695-4.535 3.898l-.081.16c-1.669 3.236-3.421 6.843-5.303 10.847v.053l-.559 1.22c-.21.504-.317.768-.345.847C-.172 20.74 2.611 24 5.98 24c.027 0 .132 0 .265-.027h.372c1.75-.213 3.554-1.325 5.384-3.317 1.829 1.989 3.635 3.104 5.382 3.317h.372c.133.027.239.027.265.027 3.37.003 6.152-3.261 4.802-6.975z"
          />
        </svg>
      </span>
    );
  }

  const label = PLT_LABEL[platform] ?? platform;
  return (
    <span
      className={`${base} md-review-platform-badge--text`}
      title={label}
      aria-label={`Review source: ${label}`}
      style={{
        fontSize: size === 'sm' ? '0.7rem' : '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        color: 'var(--body-muted, #5c6d5f)',
      }}
    >
      {label}
    </span>
  );
}
