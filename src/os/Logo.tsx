// Logo Nexus : un reseau de noeuds relies a un coeur central (le "nexus").
// Concept inchange, execution affinee : liens vers un centre, noeuds nets.
export default function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Liens vers le coeur */}
      <path
        d="M12 12 12 5M12 12 5.5 18M12 12 18.5 18"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.45"
      />
      {/* Noeuds exterieurs */}
      <circle cx="12" cy="5" r="2.2" fill="var(--accent)" />
      <circle cx="5.5" cy="18" r="2.2" fill="var(--accent)" />
      <circle cx="18.5" cy="18" r="2.2" fill="var(--accent)" />
      {/* Coeur central */}
      <circle
        cx="12"
        cy="12"
        r="2.6"
        fill="#09090b"
        stroke="var(--accent)"
        strokeWidth="1.6"
      />
    </svg>
  );
}
