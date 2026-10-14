import { FolderSync, Link2, Link2Off, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import {
  connectObsidian,
  disconnectObsidian,
  reconnectObsidian,
  setObsidianFolder,
  syncNow,
  useObsidian,
  type ObsidianState,
} from '../lib/obsidian/controller';
import { Badge, Button, Card, cx, Field, Input } from './ui';

function since(iso?: string): string {
  if (!iso) return 'nunca';
  const s = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (s < 10) return 'agora';
  if (s < 60) return `há ${s} s`;
  return `há ${Math.round(s / 60)} min`;
}

const STATUS: Record<ObsidianState['status'], { label: string; tone: 'brand' | 'amber' | 'slate' | 'red' }> = {
  conectado: { label: 'Conectado', tone: 'brand' },
  permissao: { label: 'Precisa reconectar', tone: 'amber' },
  desconectado: { label: 'Desconectado', tone: 'slate' },
  indisponivel: { label: 'Indisponível neste navegador', tone: 'slate' },
  erro: { label: 'Erro', tone: 'red' },
};

export function ObsidianCard() {
  const o = useObsidian();
  const [folder, setFolder] = useState(o.folder);
  const s = STATUS[o.status];

  return (
    <Card
      title="Obsidian"
      subtitle="Cada paciente vira uma nota no seu cofre, e notas novas criadas pelo agente no terminal entram no app."
      actions={<Badge tone={s.tone}>{s.label}</Badge>}
    >
      {o.status === 'indisponivel' ? (
        <div className="space-y-2 text-sm text-slate-600">
          <p>
            A conexão com pastas do computador funciona no <strong>Google Chrome</strong> ou no <strong>Microsoft Edge</strong>, com o app aberto pelo endereço
            local (<code className="rounded bg-slate-100 px-1">npm run dev</code>) ou publicado em um domínio seu.
          </p>
          <p>Dentro da prévia do Claude, no Safari e no Firefox o navegador não permite escrever em pastas locais.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="Pasta de pacientes dentro do cofre" hint="Criada automaticamente se não existir. Ex.: Pacientes ou Clínica/Pacientes.">
              <Input value={folder} onChange={(e) => setFolder(e.target.value)} onBlur={() => folder !== o.folder && setObsidianFolder(folder)} />
            </Field>
            <div className="flex flex-wrap gap-2">
              {o.status === 'conectado' ? (
                <>
                  <Button variant="secondary" onClick={() => void syncNow()} disabled={o.syncing}>
                    <RefreshCw size={16} className={cx(o.syncing && 'animate-spin')} /> Sincronizar agora
                  </Button>
                  <Button variant="danger" onClick={() => void disconnectObsidian()}>
                    <Link2Off size={16} /> Desconectar
                  </Button>
                </>
              ) : o.status === 'permissao' ? (
                <Button onClick={() => void reconnectObsidian()}>
                  <Link2 size={16} /> Reconectar “{o.vaultName}”
                </Button>
              ) : (
                <Button onClick={() => void connectObsidian()}>
                  <FolderSync size={16} /> Escolher pasta do cofre
                </Button>
              )}
            </div>
          </div>

          {o.vaultName && (
            <p className="text-sm text-slate-600">
              Cofre <strong>{o.vaultName}</strong> · pasta <strong>{o.folder}</strong> · última sincronização {since(o.lastSync)}
            </p>
          )}
          {o.error && <p className="text-sm text-red-600">{o.error}</p>}
          {o.status === 'permissao' && (
            <p className="text-sm text-amber-700">O navegador pede sua autorização de novo depois de reiniciado. Clique em “Reconectar”.</p>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Atividade recente</p>
            {o.log.length === 0 ? (
              <p className="text-sm text-slate-400">Nada sincronizado nesta sessão.</p>
            ) : (
              <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                {o.log.map((e, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0">
                      {e.patientId ? (
                        <a href={`#/pacientes/${e.patientId}`} className="font-semibold text-slate-800 hover:text-brand-700">
                          {e.name}
                        </a>
                      ) : (
                        <span className="font-semibold text-slate-800">{e.name}</span>
                      )}
                      <span className="block text-xs text-slate-500">{e.detail}</span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{new Date(e.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <details className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <summary className="cursor-pointer font-semibold text-slate-700">Como funciona</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Cada paciente vira “Nome.md” na pasta escolhida. A cópia completa fica em “.seu-nutriai/”, que o Obsidian não mostra.</li>
              <li>No Obsidian, você pode editar o topo da nota (dados e medidas), a Anamnese, o Plano alimentar, as Orientações e as Observações. As outras seções são refeitas pelo app.</li>
              <li>Uma nota nova sem <code>id</code> (por exemplo, criada pelo agente estagiário) vira paciente no app, e o estagiário calcula o plano energético.</li>
              <li>Para pedir um novo cálculo pelo Obsidian, mude <code>recalcular: não</code> para <code>recalcular: sim</code>.</li>
              <li>Paciente excluído no app não some do Obsidian: a nota fica com <code>status: excluido</code>.</li>
            </ul>
          </details>
        </div>
      )}
    </Card>
  );
}

/** Indicador compacto para o menu lateral. */
export function ObsidianPill() {
  const o = useObsidian();
  if (o.status === 'indisponivel' || o.status === 'desconectado') return null;
  if (o.status === 'permissao')
    return (
      <button
        type="button"
        onClick={() => void reconnectObsidian()}
        className="mb-3 flex w-full items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-left text-xs font-semibold text-amber-200 hover:bg-amber-300/20"
      >
        <Link2 size={14} /> Reconectar Obsidian
      </button>
    );
  return (
    <a href="#/config" className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-brand-200 hover:bg-white/5">
      <span className={cx('h-2 w-2 rounded-full', o.status === 'erro' ? 'bg-red-400' : 'bg-brand-300', o.syncing && 'animate-pulse')} />
      Obsidian · {o.status === 'erro' ? 'erro' : since(o.lastSync)}
    </a>
  );
}
