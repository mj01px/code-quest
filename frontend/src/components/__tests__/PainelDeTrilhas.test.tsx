import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BotaoConclusao } from "@/components/trilhas/BotaoConclusao";
import { PainelDeTrilhas } from "@/components/trilhas/PainelDeTrilhas";
import { CHAVE, esquecerCache, instantaneo } from "@/lib/progresso";
import type { TrilhaDetalhe } from "@/lib/types";

import { aula, exercicioResumo, trilhaResumo } from "./fixtures";

const TRILHA = trilhaResumo({ total_aulas: 2, total_exercicios: 4 });

const DESTAQUE: TrilhaDetalhe = {
  ...TRILHA,
  aulas: [
    aula({
      exercicios: [
        exercicioResumo({ id: 1, slug: "media", titulo: "Média" }),
        exercicioResumo({ id: 2, slug: "trocar", titulo: "Trocar valores" }),
      ],
    }),
    aula({
      id: 11,
      titulo: "Condicionais",
      slug: "condicionais",
      ordem: 2,
      exercicios: [
        exercicioResumo({ id: 3, slug: "par", titulo: "Par ou ímpar" }),
        exercicioResumo({ id: 4, slug: "maior", titulo: "O maior de três" }),
      ],
    }),
  ],
};

function comProgresso(fases: string[]): void {
  window.localStorage.setItem(CHAVE, JSON.stringify({ [TRILHA.slug]: fases }));
  esquecerCache();
}

beforeEach(() => {
  window.localStorage.clear();
  esquecerCache();
});

describe("PainelDeTrilhas", () => {
  it("convida a começar quando o aluno ainda não fez nada", () => {
    render(<PainelDeTrilhas trilhas={[TRILHA]} destaque={DESTAQUE} />);

    expect(screen.getByText("Comece por aqui")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Começar" })).toHaveAttribute(
      "href",
      "/trilhas/logica-de-programacao",
    );
  });

  it("oferece continuar de onde parou e aponta para a fase seguinte", () => {
    comProgresso(["media", "trocar"]);

    render(<PainelDeTrilhas trilhas={[TRILHA]} destaque={DESTAQUE} />);

    expect(screen.getByText("Continuar de onde parou")).toBeInTheDocument();
    // Primeira fase não concluída, na ordem da trilha.
    expect(screen.getByText("Módulo 2 · Par ou ímpar")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retomar" })).toHaveAttribute(
      "href",
      "/trilhas/logica-de-programacao/exercicios/par",
    );
  });

  it("anuncia a trilha concluída quando não sobra fase", () => {
    comProgresso(["media", "trocar", "par", "maior"]);

    render(<PainelDeTrilhas trilhas={[TRILHA]} destaque={DESTAQUE} />);

    expect(screen.getByText("Trilha concluída")).toBeInTheDocument();
    expect(screen.getByText("4 fases concluídas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Revisar" })).toBeInTheDocument();
  });

  it("reflete o percentual real na barra do destaque", () => {
    comProgresso(["media"]);

    render(<PainelDeTrilhas trilhas={[TRILHA]} destaque={DESTAQUE} />);

    const [destaque] = screen.getAllByRole("progressbar");
    expect(destaque).toHaveAttribute("aria-valuenow", "25");
  });

  it("passa o progresso adiante para o card da trilha", () => {
    comProgresso(["media", "trocar", "par"]);

    render(<PainelDeTrilhas trilhas={[TRILHA]} destaque={DESTAQUE} />);

    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("funciona sem o detalhe do destaque", () => {
    comProgresso(["media"]);

    render(<PainelDeTrilhas trilhas={[TRILHA]} />);

    // Sem a trilha inteira não dá para dizer onde parou, mas o card da lista
    // continua mostrando o percentual.
    expect(screen.getByText("Comece por aqui")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });
});

describe("BotaoConclusao", () => {
  it("alterna o rótulo e grava o progresso", async () => {
    render(<BotaoConclusao trilhaSlug="logica" faseSlug="tabuada" />);

    const botao = screen.getByRole("button", { name: /Marcar como concluído/ });
    expect(botao).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(botao);

    expect(screen.getByRole("button")).toHaveTextContent("Concluído");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    expect(instantaneo()).toEqual({ logica: ["tabuada"] });
  });

  it("desmarca no segundo clique", async () => {
    render(<BotaoConclusao trilhaSlug="logica" faseSlug="tabuada" />);

    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("button")).toHaveTextContent(
      "Marcar como concluído",
    );
    expect(instantaneo()).toEqual({});
  });

  it("abre já concluído quando o navegador guardou a fase", () => {
    window.localStorage.setItem(CHAVE, JSON.stringify({ logica: ["tabuada"] }));
    esquecerCache();

    render(<BotaoConclusao trilhaSlug="logica" faseSlug="tabuada" />);

    expect(screen.getByRole("button")).toHaveTextContent("Concluído");
  });

  it("deixa claro que o progresso é só deste navegador", () => {
    render(<BotaoConclusao trilhaSlug="logica" faseSlug="tabuada" />);

    expect(screen.getByText(/só neste navegador/)).toBeInTheDocument();
  });
});
