"use client";

export interface PropsErro {
  error: Error & { digest?: string };
  reset: () => void;
  titulo: string;
  mensagem?: string;
}

const API_FORA =
  "A API do CodeQuest não respondeu. Se você está rodando o projeto localmente, confirme que o backend Django está no ar.";

// Corpo compartilhado pelos error.tsx das rotas do app.
export function ErroDeCarregamento({ error, reset, titulo, mensagem = API_FORA }: PropsErro) {
  return (
    <div role="alert" className="border border-edge-soft bg-panel p-6">
      <h1 className="titulo text-lg text-ink-soft">{titulo}</h1>
      <p className="mt-3 max-w-prose text-xs leading-relaxed text-ink-muted">
        {mensagem}
      </p>
      {error.digest ? (
        <p className="rotulo mt-3 text-ink-muted/60">
          Referência: {error.digest}
        </p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="rotulo mt-6 cursor-pointer border border-brand px-4 py-2 text-brand hover:bg-brand-shadow/30"
      >
        Tentar de novo
      </button>
    </div>
  );
}
