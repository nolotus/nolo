// Nolo brand head mark. Geometry copied verbatim from public/brand/nolo-head.svg
// (the single geometry source); color follows currentColor.
const NoloHeadMark = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
    <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M63 32L68 13" strokeWidth="5.5" />
      <path d="M17 80V46Q17 31 32 31H68Q83 31 83 46V80" strokeWidth="8" />
      <rect x="30" y="52" width="11" height="15" rx="5.5" strokeWidth="4" />
      <rect x="59" y="52" width="11" height="15" rx="5.5" strokeWidth="4" />
    </g>
  </svg>
);

export default NoloHeadMark;
