import { render, screen } from "@testing-library/react";

import { ProximoPassoDaLeitura } from "@/components/licao/ProximoPassoDaLeitura";
import { chaveDaFase } from "@/lib/progresso";

let concluidas: string[] = [];

jest.mock("@/components/progresso/ProvedorProgresso", () => ({
  useProgresso: () => ({ chaves: new Set(concluidas) }),
}));

const SLUG = "logica-de-programacao";
const TRILHA = `/trilhas/${SLUG}`;
const QUIZ = `${TRILHA}/aulas/variaveis-e-tipos/quiz`;
const PROXIMO = `${TRILHA}/aulas/repeticao`;
const FASES = ["par-ou-impar", "maior-de-tres", "classificar-nota"];

function montar(props: { rotaQuiz?: string | null; rotaProximoModulo?: string | null } = {}) {
  render(
    <ProximoPassoDaLeitura
      trilhaSlug={SLUG}
      fases={FASES}
      rotaQuiz={props.rotaQuiz ?? null}
      rotaProximoModulo={props.rotaProximoModulo === undefined ? PROXIMO : props.rotaProximoModulo}
      rotaTrilha={TRILHA}
    />,
  );
}

function link(nome: string) {
  return screen.queryByRole("link", { name: nome });
}

describe("ProximoPassoDaLeitura", () => {
  beforeEach(() => {
    concluidas = [];
  });

  it("módulo recém-iniciado: leva ao primeiro exercício, sem próximo módulo", () => {
    montar();

    expect(link("Praticar")).toHaveAttribute("href", `${TRILHA}/exercicios/par-ou-impar`);
    expect(link("Próximo módulo")).toBeNull();
  });

  it("no meio do módulo: leva ao próximo exercício pendente", () => {
    concluidas = [chaveDaFase(SLUG, "par-ou-impar")];
    montar();

    expect(link("Praticar")).toHaveAttribute("href", `${TRILHA}/exercicios/maior-de-tres`);
    expect(link("Próximo módulo")).toBeNull();
  });

  it("com quiz e módulo pendente: o caminho é o quiz", () => {
    montar({ rotaQuiz: QUIZ });

    expect(link("Fazer o quiz")).toHaveAttribute("href", QUIZ);
    expect(link("Praticar")).toBeNull();
    expect(link("Próximo módulo")).toBeNull();
  });

  it("módulo completo: libera o próximo módulo", () => {
    concluidas = FASES.map((slug) => chaveDaFase(SLUG, slug));
    montar({ rotaQuiz: QUIZ });

    expect(link("Próximo módulo")).toHaveAttribute("href", PROXIMO);
    expect(link("Praticar")).toBeNull();
    expect(link("Fazer o quiz")).toBeNull();
  });

  it("último módulo completo: volta para a trilha", () => {
    concluidas = FASES.map((slug) => chaveDaFase(SLUG, slug));
    montar({ rotaProximoModulo: null });

    expect(link("Voltar para a trilha")).toHaveAttribute("href", TRILHA);
  });
});
