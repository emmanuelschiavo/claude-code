const nf = (digits: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: digits });

export function num(n: number | undefined, digits = 1): string {
  return n === undefined || !Number.isFinite(n) ? '—' : nf(digits).format(n);
}

export function brl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function date(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function dateTime(iso: string): string {
  return `${date(iso)} ${iso.slice(11, 16)}`;
}

export function todayIso(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

/** Data e hora local no formato yyyy-mm-ddTHH:MM (mesmo das consultas). */
export function nowLocalIso(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
