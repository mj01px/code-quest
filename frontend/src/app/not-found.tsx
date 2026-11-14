import Link from "next/link";

// 404 de toda rota sem not-found.tsx próprio. Sem este arquivo o Next mostra a
// página padrão dele, em inglês e fora do visual do CodeQuest.
export default function NaoEncontrado() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <section
        aria-labelledby="titulo-404"
        className="flex w-full max-w-[560px] flex-col gap-4 border-[3px] border-brand bg-panel p-7 shadow-frame"
      >
        <p className="rotulo m-0 text-brand">Erro 404</p>
        <h1 id="titulo-404" className="titulo m-0 font-display text-[15px] leading-[1.6] text-ink">
          Página não encontrada
        </h1>
        <p className="m-0 font-body text-base leading-[1.6] text-ink-body">
          Este endereço não existe ou o conteúdo ainda não foi publicado.
        </p>
        <Link
          href="/"
          className="rotulo flex min-h-11 w-fit items-center border-2 border-brand px-4 py-2 text-brand hover:bg-brand-shadow/30 focus-visible:bg-brand-shadow/30"
        >
          Voltar ao início
        </Link>
      </section>
    </main>
  );
}
