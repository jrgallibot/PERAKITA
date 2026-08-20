export function BrandLogo({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <svg
      aria-label="PeraKita"
      className={className}
      height={size}
      role="img"
      viewBox="0 0 64 64"
      width={size}
    >
      <rect fill="#0D9488" height="64" rx="16" width="64" />
      <circle cx="32" cy="35" fill="#F0FDFA" r="18" />
      <path
        d="M28 24h8.5c4.2 0 7 2.2 7 5.6 0 2.4-1.4 4.2-3.8 5.1 2.8.8 4.5 2.8 4.5 5.6 0 4-3.1 6.7-8.2 6.7H28V24zm5.2 9.4h3c1.9 0 3-1 3-2.5s-1.1-2.4-3-2.4h-3v4.9zm0 10.2h3.6c2.2 0 3.5-1.1 3.5-2.8s-1.3-2.7-3.5-2.7h-3.6v5.5z"
        fill="#0D9488"
      />
      <path d="M44 14c4.2 1.8 7 5.2 7 9.2 0-4.6-3.2-8.4-7-9.2z" fill="#99F6E4" />
      <path d="M44 14c-1.2 3.6-1 7.2.6 10.2 2.2-2.6 3.2-6.2-.6-10.2z" fill="#5EEAD4" />
    </svg>
  );
}
