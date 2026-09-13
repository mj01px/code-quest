export default function Carregando() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="rotulo text-ink-muted">Sorteando os desafios de hoje…</span>
      <div className="mt-8 h-44 animate-pulse border-2 border-brand bg-panel" />
      <ul className="mt-8 flex flex-col gap-4">
        {[0, 1, 2].map((indice) => (
          <li
            key={indice}
            className="h-40 animate-pulse border border-edge bg-panel"
          />
        ))}
      </ul>
    </div>
  );
}
