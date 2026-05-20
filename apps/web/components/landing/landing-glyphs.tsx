/** Stroke glyphs built from primitives (lines, rects, polygons, circles) for landing tiles. */


import type { PropsWithChildren, ReactNode } from 'react';

function Svg(props: PropsWithChildren<{ title?: string; className?: string; strokeWidth?: number }>) {
  const { children, title, className } = props;
  const strokeW = typeof props.strokeWidth === 'number' ? props.strokeWidth : 1.65;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeW}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      className={className ?? 'md-glyph'}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

const STROKE_MINIMAL = 1.35;

/** Tighter mono-line metaphors for USP flip row (paired with taller cards). */
const featurePathsMinimal: ReactNode[] = [
  /* farm — roof + grove trunks */
  <g key={0}>
    <polygon points="12,6 19,13 5,13" strokeLinejoin="round" />
    <line x1={9} x2={9} y1={13} y2={21} />
    <line x1={12} x2={12} y1={13} y2={21} />
    <line x1={15} x2={15} y1={13} y2={21} />
    <line x1={6} x2={18} y1={21} y2={21} strokeLinecap="square" />
  </g>,
  /* road — chevron route + waypoint */
  <g key={1}>
    <polyline points="5,19 11,13 17,17 21,11" strokeLinejoin="round" />
    <rect x={18.75} y={7.75} width={3.5} height={3.5} rx={0.75} />
  </g>,
  /* private stays — schematic gable cabin */
  <g key={2}>
    <polygon points="12,5 20,13 4,13" strokeLinejoin="round" />
    <rect x={8} y={13} width={8} height={8} rx={1.25} />
    <rect x={10} y={16} width={4} height={5} rx={0.75} />
  </g>,
  /* slow weekend — mug + vapor as vertical bars */
  <g key={3}>
    <rect x={7.75} y={13} width={10.25} height={8} rx={1.75} />
    <rect x={18.75} y={14.75} width={2.85} height={5.85} rx={0.85} />
    <line x1={10} x2={10} y1={8.75} y2={11} opacity={0.45} strokeLinecap="square" />
    <line x1={12.85} x2={12.85} y1={7.85} y2={11} opacity={0.45} strokeLinecap="square" />
    <line x1={15.7} x2={15.7} y1={8.95} y2={11} opacity={0.45} strokeLinecap="square" />
  </g>,
  /* groups — three aligned circles */
  <g key={4}>
    <circle cx={8} cy={11.5} r={2.85} />
    <circle cx={16} cy={11.5} r={2.85} />
    <circle cx={12} cy={16.85} r={2.65} />
  </g>,
  /* nature — sun block + layered horizon slabs */
  <g key={5}>
    <circle cx={18.75} cy={7.85} r={2.65} />
    <rect x={3.25} y={15.85} width={17.15} height={2.85} rx={0.85} opacity={0.55} strokeLinecap="square" />
    <rect x={6.85} y={18.95} width={13.95} height={2} rx={0.65} opacity={0.45} strokeLinecap="square" />
  </g>,
];

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

/** `minimal` uses thinner strokes + simpler paths for hover flip tiles. */
export function FeatureGlyph({ index, variant = 'default' }: { index: number; variant?: 'default' | 'minimal' }) {
  const list = variant === 'minimal' ? featurePathsMinimal : featurePaths;
  const i = ((index % list.length) + list.length) % list.length;
  const strokeW = variant === 'minimal' ? STROKE_MINIMAL : 1.65;
  return <Svg strokeWidth={strokeW}>{list[i]}</Svg>;
}

const whoGlyphs: Record<string, ReactNode> = {
  Families: (
    <>
      {/* Triad heads — schematic “crew” */}
      <circle cx={12} cy={8.85} r={2.65} />
      <circle cx={7.95} cy={17.15} r={2.75} />
      <circle cx={16.05} cy={17.15} r={2.75} />
    </>
  ),
  Couples: (
    <>
      {/* Offset rings — Vesica motif */}
      <circle cx={10.15} cy={12.95} r={4.85} opacity={0.55} />
      <circle cx={13.95} cy={12.95} r={4.85} />
    </>
  ),
  'Friend Groups': (
    <>
      {/* Four circles on a lattice */}
      <circle cx={8.25} cy={8} r={2.65} />
      <circle cx={15.75} cy={8} r={2.65} />
      <circle cx={6.95} cy={14.95} r={2.65} />
      <circle cx={17.05} cy={14.95} r={2.65} />
    </>
  ),
  'Work-from-Nature Guests': (
    <>
      {/* Laptop stack — rects + hinge strip */}
      <rect x={3.95} y={6.95} width={16.1} height={10.85} rx={1.85} />
      <rect x={6.95} y={9.95} width={10.1} height={6.95} rx={0.95} opacity={0.35} strokeLinecap="square" />
      <rect x={8.95} y={18.95} width={6.1} height={1.95} rx={0.85} opacity={0.55} strokeLinecap="square" />
      <line x1={3.25} x2={20.75} y1={17.95} y2={17.95} strokeLinecap="square" />
    </>
  ),
  'Small Celebrations': (
    <>
      {/* Cone + band — marquee / party tent read */}
      <polygon points="12,4 19.5,21.5 4.5,21.5" strokeLinejoin="round" />
      <line x1={5.95} x2={18.05} y1={18.95} y2={18.95} strokeLinecap="square" />
    </>
  ),
  'Pet Parents': (
    <>
      {/* Rounded pad + three oval toe pads as circles */}
      <rect x={8.95} y={15.95} width={6.1} height={4.95} rx={2.25} />
      <circle cx={10.25} cy={11.95} r={1.85} />
      <circle cx={12} cy={10.85} r={1.95} />
      <circle cx={13.85} cy={11.95} r={1.85} />
    </>
  ),
};

export function WhoGlyph({ title }: { title: string }) {
  const g = whoGlyphs[title];
  return <Svg title={title}>{g ?? featurePaths[0]}</Svg>;
}
