import { Download, RotateCcw, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button, Card } from '../components/ui';
import { todayIso } from '../lib/format';
import { actions } from '../lib/store';

export function SettingsView() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

  const download = () => {
    const blob = new Blob([actions.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `evonutri-backup-${todayIso()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const restore = async (file: File) => {
    try {
      actions.importJson(await file.text());
      setMessage('Backup restaurado com sucesso.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
        <p className="text-sm text-slate-500">Os dados ficam salvos neste navegador.</p>
      </div>

      <Card title="Backup dos dados">
        <p className="mb-4 text-sm text-slate-600">
          Exporte regularmente um arquivo de backup. Ele também serve para levar os dados para outro computador.
        </p>
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
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && confirm('Restaurar substitui todos os dados atuais. Continuar?')) restore(f);
              e.target.value = '';
            }}
          />
        </div>
        {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
      </Card>

      <Card title="Restaurar dados de exemplo">
        <p className="mb-4 text-sm text-slate-600">Apaga todos os pacientes, consultas e alimentos personalizados e carrega a paciente de exemplo.</p>
        <Button
          variant="danger"
          className="border border-red-200"
          onClick={() => confirm('Isso apaga TODOS os dados. Tem certeza?') && actions.reset()}
        >
          <RotateCcw size={16} /> Apagar tudo e recomeçar
        </Button>
      </Card>
    </div>
  );
}
