import { AlertTriangle, X } from 'lucide-react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useEffect, useState } from 'react';

export function cx(...c: (string | false | undefined | null)[]): string {
  return c.filter(Boolean).join(' ');
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold tracking-[0.14em] text-gold-600 uppercase">{eyebrow}</p>}
        <h1 className="text-[1.75rem] leading-tight font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, subtitle, actions, children, className, flush }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={cx('rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,50,42,0.04),0_8px_24px_-12px_rgba(15,50,42,0.08)]', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-1">
          <div className="min-w-0">
            <h3 className="text-[1.05rem] font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        </header>
      )}
      <div className={flush ? 'pt-3 pb-2' : 'px-6 pt-4 pb-6'}>{children}</div>
    </section>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';

export function Button({ variant = 'primary', className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: 'bg-brand-800 text-white shadow-sm hover:bg-brand-900',
    gold: 'bg-gold-500 text-white shadow-sm hover:bg-gold-600',
    secondary: 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50',
    ghost: 'text-brand-700 hover:bg-brand-50',
    danger: 'text-red-600 hover:bg-red-50',
  };
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        styles[variant],
        className,
      )}
      {...rest}
    />
  );
}

export function IconButton({ label, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx('rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30', className)}
      {...rest}
    />
  );
}

/** Largura total, exceto quando o chamador define uma largura (w-*). */
function widthOr(className?: string): string {
  return /(^|\s)w-/.test(className ?? '') ? '' : 'w-full';
}

const fieldBase =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-[inset_0_1px_1px_rgba(15,50,42,0.03)] outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 disabled:bg-slate-50';

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(fieldBase, widthOr(className), className)} {...rest} />;
}

/** Input numérico que aceita vazio (undefined). */
export function NumberInput({
  value,
  onChange,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      className={cx(fieldBase, 'tabular-nums', widthOr(className), className)}
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? undefined : Number(v));
      }}
      {...rest}
    />
  );
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(fieldBase, widthOr(className), className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(fieldBase, 'min-h-20', widthOr(className), className)} {...rest} />;
}

/** Seletor em pílulas para poucas opções exclusivas. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
}: {
  value: T;
  options: { value: T; label: ReactNode; hint?: string }[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" className="inline-flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.hint}
            onClick={() => onChange(o.value)}
            className={cx(
              'rounded-xl font-semibold transition',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm',
              active ? 'bg-white text-brand-800 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

type Tone = 'brand' | 'sky' | 'amber' | 'slate' | 'gold';

export function Stat({ label, value, sub, icon, tone = 'brand' }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; tone?: Tone }) {
  const tones: Record<Tone, string> = {
    brand: 'bg-brand-50 text-brand-700',
    sky: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
    gold: 'bg-gold-100 text-gold-600',
  };
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,50,42,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
        {icon && <div className={cx('rounded-xl p-2', tones[tone])}>{icon}</div>}
      </div>
      <p className="mt-2 font-display text-[1.65rem] leading-none font-semibold text-slate-900 tabular-nums">{value}</p>
      {sub && <p className="mt-1.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'brand' | 'amber' | 'red' | 'slate' | 'sky' | 'gold' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700 ring-brand-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200',
    gold: 'bg-gold-100 text-gold-600 ring-gold-300',
  };
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', tones[tone])}>{children}</span>;
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-950/40 p-4 backdrop-blur-[2px] sm:p-8" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx('w-full rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200', wide ? 'max-w-5xl' : 'max-w-lg')}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <IconButton label="Fechar" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </header>
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</footer>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      <div className="mb-1 rounded-2xl bg-brand-50 p-3 text-brand-600">{icon}</div>
      <p className="font-display text-base font-semibold text-slate-800">{title}</p>
      {children && <div className="max-w-sm text-sm text-slate-500">{children}</div>}
    </div>
  );
}

/**
 * Barra de adequação (0–150%), com marca em 100%.
 * range: ideal entre 90 e 110% (macros); min: atingir 100% (micros);
 * limit: não passar de 100% (sódio).
 */
export function Adequacy({ value, kind = 'range' }: { value: number; kind?: 'range' | 'min' | 'limit' }) {
  const pct = Math.max(0, Math.min(value, 150));
  const tone =
    kind === 'limit'
      ? value > 100
        ? 'bg-red-400'
        : 'bg-brand-500'
      : kind === 'min'
        ? value < 100
          ? 'bg-amber-400'
          : 'bg-brand-500'
        : value < 90
          ? 'bg-amber-400'
          : value > 110
            ? 'bg-red-400'
            : 'bg-brand-500';
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cx('h-full rounded-full', tone)} style={{ width: `${(pct / 150) * 100}%` }} />
      <div className="absolute inset-y-0 w-px bg-slate-400/60" style={{ left: `${(100 / 150) * 100}%` }} />
    </div>
  );
}

// ---------- Confirmação (substitui window.confirm) ----------

interface ConfirmRequest {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

let pushConfirm: ((r: ConfirmRequest) => void) | undefined;

export function confirmDialog(opts: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    if (!pushConfirm) return resolve(false);
    pushConfirm({ ...opts, resolve });
  });
}

export function ConfirmHost() {
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  useEffect(() => {
    pushConfirm = setReq;
    return () => {
      pushConfirm = undefined;
    };
  }, []);
  if (!req) return null;
  const close = (ok: boolean) => {
    req.resolve(ok);
    setReq(null);
  };
  return (
    <Modal
      title={req.title}
      onClose={() => close(false)}
      footer={
        <>
          <Button variant="secondary" onClick={() => close(false)}>
            Cancelar
          </Button>
          <Button autoFocus className={req.danger ? 'bg-red-600 hover:bg-red-700' : undefined} onClick={() => close(true)}>
            {req.confirmLabel ?? 'Confirmar'}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {req.danger && <AlertTriangle className="mt-0.5 shrink-0 text-red-500" size={20} />}
        <p className="text-sm text-slate-600">{req.message ?? 'Deseja continuar?'}</p>
      </div>
    </Modal>
  );
}
