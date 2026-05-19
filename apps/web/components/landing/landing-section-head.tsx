import type { ReactNode } from 'react';

export type LandingSectionHeadProps = {
  /** Upper label — must differ from main title copy; uppercase applied via `.md-section-label`. */
  eyebrow?: string | null;
  title: ReactNode;
  /** Subtitle block (use `<p className="md-lead">…</p>` or similar). */
  lead?: ReactNode;
  align?: 'center' | 'left';
  /** Side lines beside eyebrow; best on centered eyebrows only */
  eyebrowDecoration?: boolean;
  className?: string;
};

/**
 * Canonical marketing section header:
 * eyebrow → serif title (`title` slot) → optional lead — consistent typography site-wide.
 */
export function LandingSectionHead({
  eyebrow,
  title,
  lead,
  align = 'center',
  eyebrowDecoration = true,
  className = '',
}: LandingSectionHeadProps) {
  const trimmedEyebrow = eyebrow?.trim();
  const useLines = Boolean(trimmedEyebrow && align === 'center' && eyebrowDecoration);

  const headClass = ['md-section-head', align === 'center' ? 'md-section-head-center' : 'md-section-head-left', className]
    .filter(Boolean)
    .join(' ');

  const labelClass = [useLines ? 'md-eyebrow-line' : '', 'md-section-label', align === 'left' ? 'md-section-label-left' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <header className={headClass}>
      {trimmedEyebrow ? <p className={labelClass}>{trimmedEyebrow}</p> : null}
      {title}
      {lead ?? null}
    </header>
  );
}
