/** The Procure Mind mark: ruled ledger lines with a closing point, in petrol. */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" className={className}>
      <rect width="28" height="28" rx="7" fill="#0b6f78" />
      <path d="M8 10h12M8 14h12M8 18h7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="19.5" cy="18" r="1.6" fill="#fff" />
    </svg>
  );
}

export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className="text-[17px] font-semibold tracking-[-0.01em] text-ink">Procure Mind</span>
    </span>
  );
}
