// Cobre só a listagem: nas rotas de detalhe o Suspense quebraria o 404.
export default function Carregando() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="rotulo text-ink-muted">Carregando trilhas…</span>
      <ul className="mt-8 flex flex-col gap-3">
        {[0, 1, 2, 3].map((indice) => (
          <li
            key={indice}
            className="h-24 animate-pulse border border-edge bg-panel"
          />
        ))}
      </ul>
    </div>
  );
}
