// Rotas e rótulos das aulas, usados no servidor e no navegador. Carregar trilha
// e aula com a sessão do aluno fica em lib/aulasNoServidor.ts.

export function rotaDaAula(trilhaSlug: string, aulaSlug: string): string {
  return `/trilhas/${trilhaSlug}/aulas/${aulaSlug}`;
}

export function rotaDoExercicio(trilhaSlug: string, exercicioSlug: string): string {
  return `/trilhas/${trilhaSlug}/exercicios/${exercicioSlug}`;
}

export function numeroDoModulo(posicao: number): string {
  return String(posicao).padStart(2, "0");
}
