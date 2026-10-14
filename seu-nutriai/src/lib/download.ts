// Salva um arquivo gerado no navegador. Dentro de um artefato do Claude o
// download direto é bloqueado, então usa a capacidade `downloads` quando existir.

interface DownloadsApi {
  save(req: { filename: string; data: Blob }): Promise<unknown>;
}

type ClaudeHost = { use?: (name: string) => Promise<unknown> };

export async function saveFile(filename: string, data: Blob): Promise<void> {
  const host = (window as unknown as { claude?: ClaudeHost }).claude;
  if (host?.use) {
    const downloads = (await host.use('downloads')) as DownloadsApi | null;
    if (downloads) {
      try {
        await downloads.save({ filename, data });
      } catch {
        // Recusado pelo usuário ou indisponível: nada a fazer.
      }
      return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(data);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
