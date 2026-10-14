import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cx } from './ui';

export interface Toast {
  id: number;
  tone: 'success' | 'info' | 'error';
  title: string;
  body?: string;
  href?: string;
}

let push: ((t: Omit<Toast, 'id'>) => void) | undefined;
let seq = 0;

export function toast(t: Omit<Toast, 'id'>) {
  push?.(t);
}

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    push = (t) => {
      const item = { ...t, id: ++seq };
      setItems((xs) => [...xs.slice(-3), item]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== item.id)), 9000);
    };
    return () => {
      push = undefined;
    };
  }, []);
  const Icon = { success: CheckCircle2, info: Info, error: TriangleAlert };
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {items.map((t) => {
        const I = Icon[t.tone];
        return (
          <div key={t.id} className="pointer-events-auto flex gap-3 rounded-2xl bg-brand-950 p-4 text-sm text-brand-100 shadow-2xl ring-1 ring-white/10">
            <I size={18} className={cx('mt-0.5 shrink-0', t.tone === 'error' ? 'text-amber-300' : 'text-gold-300')} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">{t.title}</p>
              {t.body && <p className="mt-0.5 text-brand-200">{t.body}</p>}
              {t.href && (
                <a href={t.href} className="mt-1 inline-block font-semibold text-gold-300 hover:underline">
                  Abrir
                </a>
              )}
            </div>
            <button type="button" aria-label="Fechar" className="self-start text-brand-300 hover:text-white" onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))}>
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
