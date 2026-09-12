import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="border border-edge-soft bg-panel p-6">
      <p className="rotulo text-brand">Erro 404</p>
      <h1 className="titulo mt-3 text-lg text-ink-soft">Conteúdo não encontrado</h1>
      <p className="mt-3 max-w-prose text-xs leading-relaxed text-ink-muted">
        Esta trilha, fase ou exercício não existe ou ainda não foi publicado.
      </p>
      <Link
        href="/trilhas"
        className="rotulo mt-6 inline-block border border-brand px-4 py-2 text-brand hover:bg-brand-shadow/30"
      >
        Ver todas as trilhas
      </Link>
    </div>
  );
}
