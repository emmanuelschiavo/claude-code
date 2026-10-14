/** Marca Seu NutriAI: folha estilizada em dourado + logotipo. */
export function BrandMark({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const text = tone === 'light' ? 'text-white' : 'text-brand-950';
  return (
    <a href="#/" className="flex items-center gap-2.5" aria-label="Seu NutriAI — início">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <rect width="34" height="34" rx="10" fill="#d1ad6c" />
        <path d="M10 23.5c0-7.5 5.5-13 14-13.5-.4 8.4-5.9 14-13.4 14" fill="#0a211c" />
        <path d="M10.6 24 19 15.6" stroke="#d1ad6c" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className={`font-display text-[1.2rem] leading-none tracking-tight ${text}`}>
        <span className="font-medium opacity-80">Seu </span>
        <span className="font-semibold">Nutri</span>
        <span className="font-semibold text-gold-400">AI</span>
      </span>
    </a>
  );
}
