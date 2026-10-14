import { BadgeCheck, GraduationCap, Sparkles, TriangleAlert } from 'lucide-react';
import { applyIntern, GOAL_LABELS, inferActivity, inferGoal, ACTIVITY_LABELS } from '../lib/intern';
import { dateTime } from '../lib/format';
import type { Patient } from '../types';
import { Badge, Button, confirmDialog } from './ui';

const TRIGGER: Record<NonNullable<Patient['intern']>['trigger'], string> = {
  'obsidian-novo': 'paciente novo vindo do Obsidian',
  'obsidian-recalcular': 'recálculo pedido no Obsidian',
  app: 'pedido no app',
};

/** Painel do estagiário: justificativas, alertas e revisão do nutricionista. */
export function InternCard({ patient, update }: { patient: Patient; update: (fn: (p: Patient) => Patient) => void }) {
  const r = patient.intern;
  const goal = patient.goalType ?? inferGoal(patient.goal);
  const activity = patient.activityLevel ?? inferActivity(patient.anamnesis.physicalActivity) ?? 'leve';

  const ask = async () => {
    const ok = await confirmDialog({
      title: 'Pedir cálculo ao estagiário',
      message: `O estagiário vai substituir a fórmula, o fator atividade, o ajuste calórico e os macros atuais com base em: ${GOAL_LABELS[goal]}, ${ACTIVITY_LABELS[activity].toLowerCase()}. Você poderá revisar e ajustar depois.`,
      confirmLabel: 'Calcular',
    });
    if (ok) update((p) => applyIntern(p, 'app'));
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-gold-300/60 bg-gradient-to-br from-gold-100/70 to-white">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-brand-950 p-2 text-gold-300">
            <GraduationCap size={18} />
          </span>
          <div>
            <h3 className="font-display text-[1.05rem] font-semibold text-slate-900">Estagiário</h3>
            <p className="text-xs text-slate-500">
              {r ? `Cálculo de ${dateTime(r.generatedAt.slice(0, 16))} · ${TRIGGER[r.trigger]}` : 'Sugere fórmula, ajuste calórico e macros pelo objetivo e pela rotina.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {r && (r.reviewed ? <Badge tone="brand">Revisado</Badge> : <Badge tone="gold">Aguardando sua revisão</Badge>)}
          <Button variant="secondary" onClick={ask}>
            <Sparkles size={16} /> {r ? 'Recalcular' : 'Pedir cálculo'}
          </Button>
          {r && !r.reviewed && (
            <Button onClick={() => update((p) => ({ ...p, intern: p.intern && { ...p.intern, reviewed: true } }))}>
              <BadgeCheck size={16} /> Marcar como revisado
            </Button>
          )}
        </div>
      </header>
      <div className="px-6 pt-3 pb-5">
        {r ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,0.8fr)]">
            <ul className="space-y-1.5 text-sm text-slate-700">
              {r.notes.map((n, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold-500" />
                  {n}
                </li>
              ))}
            </ul>
            {r.alerts.length > 0 && (
              <div className="h-fit rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-amber-800 uppercase">
                  <TriangleAlert size={14} /> Conferir
                </p>
                <ul className="space-y-1 text-sm text-amber-900">
                  {r.alerts.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Objetivo identificado: <strong>{GOAL_LABELS[goal]}</strong> · atividade: <strong>{ACTIVITY_LABELS[activity]}</strong>. Ajuste esses campos em
            “Dados” se estiverem errados.
          </p>
        )}
      </div>
    </section>
  );
}
