import { Check, Download, RotateCcw, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { ObsidianCard } from '../components/ObsidianPanel';
import { Button, Card, confirmDialog, Field, Input, PageHeader } from '../components/ui';
import { saveFile } from '../lib/download';
import { todayIso } from '../lib/format';
import { actions, EMPTY_PROFILE, useDb } from '../lib/store';
import type { ProfessionalProfile } from '../types';

export function SettingsView() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

  const download = () => saveFile(`seu-nutriai-backup-${todayIso()}.json`, new Blob([actions.exportJson()], { type: 'application/json' }));

  const restore = async (file: File) => {
    try {
      actions.importJson(await file.text());
      setMessage('Backup restaurado.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Seu NutriAI" title="Configurações" subtitle="Seus dados profissionais e o backup do consultório." />

      <ProfileCard />

      <ObsidianCard />

      <Card title="Backup dos dados" subtitle="Os dados ficam salvos neste navegador. Exporte um backup regularmente.">
        <div className="flex flex-wrap gap-2">
          <Button onClick={download}>
            <Download size={16} /> Exportar backup
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Restaurar backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (
                f &&
                (await confirmDialog({ title: 'Restaurar backup', message: 'Todos os dados atuais serão substituídos pelos do arquivo.', confirmLabel: 'Restaurar', danger: true }))
              )
                restore(f);
            }}
          />
        </div>
        {message && <p className="mt-3 text-sm text-brand-700">{message}</p>}
      </Card>

      <Card title="Recomeçar do zero" subtitle="Apaga pacientes, consultas e alimentos personalizados e carrega a paciente de exemplo.">
        <Button
          variant="danger"
          className="border border-red-200"
          onClick={async () =>
            (await confirmDialog({ title: 'Apagar todos os dados', message: 'Esta ação apaga TODOS os dados deste navegador e não pode ser desfeita.', confirmLabel: 'Apagar tudo', danger: true })) &&
            actions.reset()
          }
        >
          <RotateCcw size={16} /> Apagar tudo e recomeçar
        </Button>
      </Card>
    </div>
  );
}

function ProfileCard() {
  const saved = useDb((db) => db.profile);
  const [p, setP] = useState<ProfessionalProfile>({ ...EMPTY_PROFILE, ...saved });
  const [done, setDone] = useState(false);
  const set = (k: keyof ProfessionalProfile, v: string) => {
    setP({ ...p, [k]: v });
    setDone(false);
  };
  const fields: [keyof ProfessionalProfile, string, string][] = [
    ['name', 'Nome profissional', 'Ex.: Dra. Mariana Lopes'],
    ['crn', 'CRN', 'Ex.: 3-12345'],
    ['clinic', 'Consultório / clínica', ''],
    ['phone', 'Telefone / WhatsApp', ''],
    ['email', 'E-mail', ''],
    ['instagram', 'Instagram', '@'],
    ['address', 'Endereço', ''],
  ];
  return (
    <Card title="Perfil profissional" subtitle="Aparece no cabeçalho e no rodapé dos PDFs entregues ao paciente.">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([k, label, ph]) => (
          <Field key={k} label={label} className={k === 'address' ? 'sm:col-span-2' : undefined}>
            <Input value={p[k]} placeholder={ph} onChange={(e) => set(k, e.target.value)} />
          </Field>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <Button
          onClick={() => {
            actions.updateProfile(p);
            setDone(true);
          }}
        >
          Salvar perfil
        </Button>
        {done && (
          <span className="inline-flex items-center gap-1 text-sm text-brand-700">
            <Check size={16} /> Perfil salvo
          </span>
        )}
      </div>
    </Card>
  );
}
