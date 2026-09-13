import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  minhaCriatura,
  progressoAtual,
  usuario,
} from "@/components/__tests__/fixtures";
import { BarraLateral } from "@/components/layout/BarraLateral";
import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";

jest.mock("@/lib/api", () => ({
  temSessao: jest.fn(),
  api: {
    eu: jest.fn(),
    minhasCriaturas: jest.fn(),
    meuProgresso: jest.fn(),
    exerciciosConcluidos: jest.fn(),
    trilhasIniciadas: jest.fn(),
    sair: jest.fn(),
  },
}));

// `usePathname` decide qual item fica marcado. Cada teste escolhe a rota.
let caminho: string | null = null;
const substituirRota = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => caminho,
  useRouter: () => ({ replace: substituirRota }),
}));

const mock = jest.requireMock<{
  temSessao: jest.Mock;
  api: {
    eu: jest.Mock;
    minhasCriaturas: jest.Mock;
    meuProgresso: jest.Mock;
    exerciciosConcluidos: jest.Mock;
    trilhasIniciadas: jest.Mock;
    sair: jest.Mock;
  };
}>("@/lib/api");

function montar() {
  return render(
    <ProvedorProgresso>
      <BarraLateral />
    </ProvedorProgresso>,
  );
}

/** O bloco de identidade enquanto o número não chegou: presente, invisível. */
const bloco = () => document.querySelector("[aria-busy]")!;

beforeEach(() => {
  jest.clearAllMocks();
  caminho = null;
  mock.api.sair.mockResolvedValue(undefined);
  mock.temSessao.mockReturnValue(true);
  mock.api.eu.mockResolvedValue(usuario());
  mock.api.minhasCriaturas.mockResolvedValue([minhaCriatura()]);
  mock.api.meuProgresso.mockResolvedValue(progressoAtual());
  mock.api.exerciciosConcluidos.mockResolvedValue([]);
  mock.api.trilhasIniciadas.mockResolvedValue([]);
});

describe("BarraLateral: navegação", () => {
  it("liga o que já tem rota", async () => {
    montar();
    await waitFor(() => expect(bloco()).toHaveClass("opacity-100"));

    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/trilhas", // a marca: leva ao app, nunca à landing pública
      "/trilhas",
      "/desafios",
      "/configuracoes",
    ]);
  });

  it("marca o item da rota aberta", async () => {
    caminho = "/configuracoes";
    montar();
    await waitFor(() => expect(bloco()).toHaveClass("opacity-100"));

    expect(screen.getByRole("link", { name: /CONFIGURAÇÕES/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: /TRILHAS/ })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marca o item também nas rotas filhas dele", async () => {
    caminho = "/trilhas/python-basico/exercicios/media";
    montar();
    await waitFor(() => expect(bloco()).toHaveClass("opacity-100"));

    expect(screen.getByRole("link", { name: /TRILHAS/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

describe("BarraLateral: identidade e XP", () => {
  it("troca o estado neutro pelos dados da conta", async () => {
    montar();

    expect(await screen.findByText("aluno_teste")).toBeInTheDocument();
    expect(screen.getByText("Shellby")).toBeInTheDocument();
    expect(
      document.querySelector('img[src*="shellby_stage_1"]'),
    ).toBeInTheDocument();
  });

  it("prefere a criatura ativa quando há mais de uma", async () => {
    mock.api.minhasCriaturas.mockResolvedValue([
      minhaCriatura({
        id: 2,
        ativa: false,
        sprite: "/criaturas/blaze_stage_1.png",
      }),
      minhaCriatura({ id: 1, ativa: true }),
    ]);

    montar();

    await screen.findByText("aluno_teste");
    expect(
      document.querySelector('img[src*="shellby_stage_1"]'),
    ).toBeInTheDocument();
  });

  it("mantém o estado neutro sem sessão", async () => {
    mock.temSessao.mockReturnValue(false);

    montar();

    expect(screen.getByText("Visitante")).toBeInTheDocument();
    expect(screen.getByText("Sem pet")).toBeInTheDocument();
    expect(mock.api.eu).not.toHaveBeenCalled();
    await waitFor(() => expect(bloco()).toHaveClass("opacity-100"));
  });

  it("quem ainda não escolheu criatura vê o nickname e nenhum sprite", async () => {
    mock.api.minhasCriaturas.mockResolvedValue([]);
    mock.api.meuProgresso.mockResolvedValue(null);

    montar();

    expect(await screen.findByText("aluno_teste")).toBeInTheDocument();
    expect(document.querySelector('img[src*="criaturas"]')).toBeNull();
  });

  it("erro na API não derruba a barra", async () => {
    mock.api.eu.mockRejectedValue(new Error("sem conexão"));

    montar();

    await waitFor(() => expect(mock.api.eu).toHaveBeenCalled());
    expect(screen.getByText("Visitante")).toBeInTheDocument();
    expect(screen.getByText("NÍVEL 1")).toBeInTheDocument();
    // Falhar não pode deixar o bloco invisível para sempre.
    await waitFor(() => expect(bloco()).toHaveClass("opacity-100"));
  });

  it("mostra a barra de XP com os números da conta", async () => {
    // `xp_para_o_proximo` é a faixa inteira do nível, não o que falta: 300 de
    // 600 é metade. Somar os dois inflava o total e a barra ficava atrasada.
    mock.api.meuProgresso.mockResolvedValue(
      progressoAtual({
        xp_total: 4450,
        nivel: { numero: 12, titulo: "Codificador", xp_necessario: 3300 },
        proximo_nivel: { numero: 13, titulo: "", xp_necessario: 3900 },
        xp_no_nivel: 300,
        xp_para_o_proximo: 600,
      }),
    );

    montar();

    expect(await screen.findByText("300 / 600 XP")).toBeInTheDocument();
    expect(screen.getByText("NÍVEL 12")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
  });

  it("ganhar XP anda a barra, sem crescer o total do nível", async () => {
    // A regressão: o denominador era recalculado somando o XP ganho, então a
    // barra avançava menos a cada exercício e nunca chegava ao fim.
    mock.api.meuProgresso.mockResolvedValue(
      progressoAtual({
        nivel: { numero: 3, titulo: "", xp_necessario: 300 },
        proximo_nivel: { numero: 4, titulo: "", xp_necessario: 700 },
        xp_no_nivel: 400,
        xp_para_o_proximo: 400,
      }),
    );

    montar();

    expect(await screen.findByText("400 / 400 XP")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  });

  it("no topo da tabela a barra enche em vez de dividir por nada", async () => {
    // `xp_para_o_proximo` é null no último nível; sem tratar, a conta seria
    // uma divisão por zero e a barra ficaria vazia justo em quem mais avançou.
    mock.api.meuProgresso.mockResolvedValue(
      progressoAtual({
        xp_total: 43500,
        nivel: { numero: 30, titulo: "Lenda", xp_necessario: 43500 },
        proximo_nivel: null,
        xp_no_nivel: 1200,
        xp_para_o_proximo: null,
      }),
    );

    montar();

    expect(await screen.findByText("43500 XP")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  });

  it("enquanto carrega não mostra número inventado nem pisca", async () => {
    // Requisito, não polimento: o bloco existe com as mesmas dimensões e
    // invisível, então não há salto de layout nem "NÍVEL 1" falso na tela.
    let liberar: (v: unknown) => void = () => {};
    mock.api.eu.mockImplementation(() => new Promise((r) => (liberar = r)));

    montar();

    expect(bloco()).toHaveClass("opacity-0");
    expect(bloco()).toHaveAttribute("aria-busy", "true");

    liberar(usuario());
    await waitFor(() => expect(bloco()).toHaveClass("opacity-100"));
    expect(bloco()).toHaveAttribute("aria-busy", "false");
  });
});

describe("BarraLateral: sair", () => {
  it("encerra a sessão e manda para a tela de entrada", async () => {
    montar();
    await waitFor(() => expect(bloco()).toHaveClass("opacity-100"));

    await userEvent.click(screen.getByRole("button", { name: "SAIR" }));

    expect(mock.api.sair).toHaveBeenCalled();
    await waitFor(() => expect(substituirRota).toHaveBeenCalledWith("/entrar"));
  });

  it("falha ao sair mantém o aluno onde está e avisa", async () => {
    // O cookie de sessão é httpOnly: se o POST não chegou, a sessão continua
    // viva. Mandar para /entrar aqui faria parecer que saiu quando não saiu.
    mock.api.sair.mockRejectedValue(new Error("sem conexão"));

    montar();
    await waitFor(() => expect(bloco()).toHaveClass("opacity-100"));

    await userEvent.click(screen.getByRole("button", { name: "SAIR" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível sair agora.",
    );
    expect(substituirRota).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "SAIR" })).toBeEnabled();
  });
});
