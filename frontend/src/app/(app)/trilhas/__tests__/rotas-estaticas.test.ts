// O catálogo exige login (2026-11-16). Página pré-gerada no build guardaria o
// conteúdo (inclusive as respostas do quiz) e o serviria sem sessão nenhuma.
// Estas páginas precisam buscar por request, com o cookie do aluno.
import * as exercicio from "../../../(foco)/trilhas/[trilhaSlug]/exercicios/[exercicioSlug]/page";
import * as trilha from "../[trilhaSlug]/page";

jest.mock("@/lib/sessaoNoServidor", () => ({}));
jest.mock("next/navigation", () => ({ notFound: jest.fn(), redirect: jest.fn() }));

describe.each([
  ["trilha", trilha],
  ["exercício", exercicio],
])("página de %s", (_nome, pagina) => {
  it("não é pré-gerada no build", () => {
    expect("generateStaticParams" in pagina).toBe(false);
    expect("dynamicParams" in pagina).toBe(false);
    expect("revalidate" in pagina).toBe(false);
  });
});
