import { render, screen, waitFor } from "@testing-library/react";

import {
  minhaCriatura,
  progressoAtual,
  usuario,
} from "@/components/__tests__/fixtures";
import { IdentidadeDoAluno } from "@/components/layout/IdentidadeDoAluno";
import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";

jest.mock("@/lib/api", () => ({
  temSessao: jest.fn(),
  api: {
    eu: jest.fn(),
    minhasCriaturas: jest.fn(),
    meuProgresso: jest.fn(),
    exerciciosConcluidos: jest.fn(),
  },
}));

const mock = jest.requireMock<{
  temSessao: jest.Mock;
  api: {
    eu: jest.Mock;
    minhasCriaturas: jest.Mock;
    meuProgresso: jest.Mock;
    exerciciosConcluidos: jest.Mock;
  };
}>("@/lib/api");

function montar(no: React.ReactNode) {
  return render(<ProvedorProgresso>{no}</ProvedorProgresso>);
}

const NEUTRO = { nome: "Visitante", nivel: 1, xp: 0, xpDoProximoNivel: 1000 };

/** O bloco enquanto o número não chegou: presente, mas invisível.
 *  Ancorado no atributo, e não no texto: o nome muda quando o perfil chega. */
const bloco = () => document.querySelector("[aria-busy]")!;

beforeEach(() => {
  jest.clearAllMocks();
  mock.temSessao.mockReturnValue(true);
  mock.api.eu.mockResolvedValue(usuario());
  mock.api.minhasCriaturas.mockResolvedValue([minhaCriatura()]);
  mock.api.meuProgresso.mockResolvedValue(progressoAtual());
  mock.api.exerciciosConcluidos.mockResolvedValue([]);
});

describe("IdentidadeDoAluno", () => {
  it("troca o nome neutro pelo nickname", async () => {
    montar(<IdentidadeDoAluno {...NEUTRO} />);

    expect(await screen.findByText("aluno_teste")).toBeInTheDocument();
  });

  it("troca o ovo pela criatura escolhida", async () => {
    montar(<IdentidadeDoAluno {...NEUTRO} />);

    expect(
      await screen.findByAltText("Shellby, sua criatura"),
    ).toBeInTheDocument();
  });

  it("prefere a criatura ativa quando há mais de uma", async () => {
    mock.api.minhasCriaturas.mockResolvedValue([
      minhaCriatura({ id: 2, ativa: false, sprite: "/criaturas/blaze_stage_1.png" }),
      minhaCriatura({ id: 1, ativa: true }),
    ]);

    montar(<IdentidadeDoAluno {...NEUTRO} />);

    const imagem = await screen.findByAltText("Shellby, sua criatura");
    expect(imagem.getAttribute("src")).toContain("shellby_stage_1");
  });

  it("mantém o estado neutro sem sessão", async () => {
    mock.temSessao.mockReturnValue(false);

    montar(<IdentidadeDoAluno {...NEUTRO} />);

    expect(screen.getByText("Visitante")).toBeInTheDocument();
    expect(mock.api.eu).not.toHaveBeenCalled();
    // Sem sessão não há o que esperar: o bloco aparece na hora.
    await waitFor(() => expect(bloco()).toHaveClass("opacity-100"));
  });

  it("quem ainda não escolheu criatura vê o nickname e o avatar padrão", async () => {
    mock.api.minhasCriaturas.mockResolvedValue([]);
    mock.api.meuProgresso.mockResolvedValue(null);

    montar(<IdentidadeDoAluno {...NEUTRO} />);

    expect(await screen.findByText("aluno_teste")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("erro na API não derruba a sidebar", async () => {
    mock.api.eu.mockRejectedValue(new Error("sem conexão"));

    montar(<IdentidadeDoAluno {...NEUTRO} nivel={7} />);

    await waitFor(() => expect(mock.api.eu).toHaveBeenCalled());
    expect(screen.getByText("Visitante")).toBeInTheDocument();
    expect(screen.getByText("Nível 7")).toBeInTheDocument();
    // Falhar não pode deixar o bloco invisível para sempre.
    await waitFor(() => expect(bloco()).toHaveClass("opacity-100"));
  });

  it("mostra a barra de XP com os números da conta", async () => {
    mock.api.meuProgresso.mockResolvedValue(
      progressoAtual({
        xp_total: 4450,
        nivel: { numero: 12, titulo: "Codificador", xp_necessario: 3300 },
        proximo_nivel: { numero: 13, titulo: "", xp_necessario: 3900 },
        xp_no_nivel: 300,
        xp_para_o_proximo: 600,
      }),
    );

    montar(<IdentidadeDoAluno {...NEUTRO} />);

    expect(await screen.findByText("300 / 600 XP")).toBeInTheDocument();
    expect(screen.getByText("Nível 12")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
  });

  it("no topo da tabela a barra enche em vez de dividir por nada", async () => {
    // `xp_para_o_proximo` é null no último nível; sem tratar, a conta seria
    // uma divisão por zero e a barra ficaria vazia justo em quem mais avançou.
    mock.api.meuProgresso.mockResolvedValue(
      progressoAtual({
        nivel: { numero: 30, titulo: "Lenda", xp_necessario: 43500 },
        proximo_nivel: null,
        xp_no_nivel: 1200,
        xp_para_o_proximo: null,
      }),
    );

    montar(<IdentidadeDoAluno {...NEUTRO} />);

    expect(await screen.findByText("1200 XP")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  });

  it("enquanto carrega não mostra número inventado nem pisca", async () => {
    // Requisito, não polimento: o bloco existe com as mesmas dimensões e
    // invisível, então não há salto de layout nem "Nível 1" falso na tela.
    let liberar: (v: unknown) => void = () => {};
    mock.api.eu.mockImplementation(() => new Promise((r) => (liberar = r)));

    montar(<IdentidadeDoAluno {...NEUTRO} />);

    expect(bloco()).toHaveClass("opacity-0");
    expect(bloco()).toHaveAttribute("aria-busy", "true");

    liberar(usuario());
    await waitFor(() => expect(bloco()).toHaveClass("opacity-100"));
    expect(bloco()).toHaveAttribute("aria-busy", "false");
  });
});
