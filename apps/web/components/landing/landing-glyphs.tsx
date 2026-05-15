/** Minimal stroke glyphs for landing cards — renders at ~1.65rem square. */

import type { PropsWithChildren, ReactNode } from 'react';

function Svg(props: PropsWithChildren<{ title?: string; className?: string }>) {
  const { children, title, className } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? 'md-glyph'}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

const featurePaths: ReactNode[] = [
  // farm / roots
  <path key={0} d="M12 21c2-9 8-13 10-17M12 21C10 13 8 9 7 7c-3 7-6 14-9 21M14 14c4-7 11-13 17-17" />,
  // distance arrow
  <g key={1}>
    <path d="M3 17h12a3 3 0 003-3V7" />
    <path d="M21 7l-4-4m4 4l-4 4" />
  </g>,
  // farmhouse
  <g key={2}>
    <path d="M4 21V10l8-7 8 7v11" />
    <path d="M9 21v-6h6v6" />
  </g>,
  // sunrise
  <g key={3}>
    <path d="M12 17a4 4 0 004-6H8a4 4 0 004 6zM12 3v4" />
    <path d="M4.2 13.9l3.6-3.6M20 13.9l-3.6-3.6M4 21h16" />
  </g>,
  // people together
  <g key={4}>
    <circle cx={9} cy={7} r={3} />
    <circle cx={17} cy={9} r={2} />
    <path d="M3 21c0-5 4-9 10-9s10 6 11 11" />
  </g>,
  // breeze / nature
  <path key={5} d="M4 20c5-6 10-9 16-10C12 8 7 14 4 20z" />,
];

export function FeatureGlyph({ index }: { index: number }) {
  const i = ((index % featurePaths.length) + featurePaths.length) % featurePaths.length;
  return <Svg>{featurePaths[i]}</Svg>;
}

const whoGlyphs: Record<string, ReactNode> = {
  Families: (
    <>
      <circle cx={11} cy={7} r={2.25} />
      <circle cx={17} cy={10} r={2} />
      <path d="M4 21c0-8 15-13 21-21" />
    </>
  ),
  Couples: (
    <>
      <path d="M12 21s6-10 9-14a4 4 0 00-7-5 7 7 0 00-13 9c4 10 11 14 11 14z" />
    </>
  ),
  'Friend Groups': (
    <>
      <circle cx={8} cy={8} r={2.5} />
      <circle cx={16} cy={7} r={2.5} />
      <circle cx={12} cy={15} r={2.5} />
      <path d="M4 21c2-11 17-17 20-21" />
    </>
  ),
  'Work-from-Nature Guests': (
    <>
      <rect x={3} y={5} width={18} height={12} rx={2} />
      <path d="M8 21h8M2 21h20" />
    </>
  ),
  'Small Celebrations': (
    <>
      <path d="M12 3l2 8-6 9h12l-6-9 2-8" />
      <path d="M8 21h10" />
    </>
  ),
  'Pet Parents': (
    <>
      <ellipse cx={12} cy={14.5} rx={5} ry={3.8} />
      <circle cx={8.5} cy={10.5} r={1.6} />
      <circle cx={15.5} cy={10.5} r={1.6} />
      <circle cx={10.5} cy={8} r={1.25} />
      <circle cx={13.5} cy={8} r={1.25} />
    </>
  ),
};

export function WhoGlyph({ title }: { title: string }) {
  const g = whoGlyphs[title];
  return <Svg title={title}>{g ?? featurePaths[0]}</Svg>;
}
