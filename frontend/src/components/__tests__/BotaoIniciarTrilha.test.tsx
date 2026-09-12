import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  minhaCriatura,
  progressoAtual,
  usuario,
} from "@/components/__tests__/fixtures";
import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";
import { BotaoIniciarTrilha } from "@/components/trilhas/BotaoIniciarTrilha";
import { ErroApi } from "@/lib/api";

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    temSessao: jest.fn(),
    api: {
      eu: jest.fn(),
      minhasCriaturas: jest.fn(),
      meuProgresso: jest.fn(),
      exerciciosConcluidos: jest.fn(),
      trilhasIniciadas: jest.fn(),
      iniciarTrilha: jest.fn(),
    },
  };
});

const empurrarRota = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: empurrarRota }),
}));

const mock = jest.requireMock<{
  temSessao: jest.Mock;
  api: {
    eu: jest.Mock;
    minhasCriaturas: jest.Mock;
    meuProgresso: jest.Mock;
    exerciciosConcluidos: jest.Mock;
    trilhasIniciadas: jest.Mock;
    iniciarTrilha: jest.Mock;
  };
}>("@/lib/api");

const DESTINO = "/trilhas/python/exercicios/iniciais-do-nome";

function montar(primeiraFaseSlug: string | null = "iniciais-do-nome") {
  return render(
    <ProvedorProgresso>
      <BotaoIniciarTrilha
        trilhaSlug="python"
        primeiraFaseSlug={primeiraFaseSlug}
      />
    </ProvedorProgresso>,
  );
}

const botao = () => screen.getByRole("button");

beforeEach(() => {
  jest.clearAllMocks();
  mock.temSessao.mockReturnValue(true);
  mock.api.eu.mockResolvedValue(usuario());
  mock.api.minhasCriaturas.mockResolvedValue([minhaCriatura({ ativa: true })]);
  mock.api.meuProgresso.mockResolvedValue(progressoAtual());
  mock.api.exerciciosConcluidos.mockResolvedValue([]);
  mock.api.trilhasIniciadas.mockResolvedValue([]);
  mock.api.iniciarTrilha.mockResolvedValue({
    trilha: "python",
    iniciada_em: "2026-09-12T12:00:00Z",
  });
});

describe("BotaoIniciarTrilha", () => {
  it("grava a entrada antes de navegar", async () => {
    // A ordem é o requisito: navegar sem gravar deixaria a trilha como não
    // iniciada quando o aluno voltasse para a listagem.
    montar();

    await userEvent.click(botao());

    await waitFor(() => expect(empurrarRota).toHaveBeenCalledWith(DESTINO));
    expect(mock.api.iniciarTrilha).toHaveBeenCalledWith("python");
    expect(mock.api.iniciarTrilha.mock.invocationCallOrder[0]).toBeLessThan(
      empurrarRota.mock.invocationCallOrder[0],
    );
  });

  it("falha ao entrar não navega e avisa", async () => {
    mock.api.iniciarTrilha.mockRejectedValue(new Error("sem conexão"));

    montar();
    await userEvent.click(botao());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível entrar na trilha agora.",
    );
    expect(empurrarRota).not.toHaveBeenCalled();
    expect(botao()).toBeEnabled();
  });

  it("sem sessão manda para o login, sem tentar o POST", async () => {
    mock.temSessao.mockReturnValue(false);

    montar();
    await userEvent.click(botao());

    expect(mock.api.iniciarTrilha).not.toHaveBeenCalled();
    expect(empurrarRota).toHaveBeenCalledWith(
      `/entrar?destino=${encodeURIComponent(DESTINO)}`,
    );
  });

  it("sessão expirada no meio do caminho também cai no login", async () => {
    mock.api.iniciarTrilha.mockRejectedValue(
      new ErroApi(401, "nao_autenticado", "sessão expirada"),
    );

    montar();
    await userEvent.click(botao());

    await waitFor(() =>
      expect(empurrarRota).toHaveBeenCalledWith(
        `/entrar?destino=${encodeURIComponent(DESTINO)}`,
      ),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("quem já entrou vê continuar, não iniciar", async () => {
    mock.api.trilhasIniciadas.mockResolvedValue(["python"]);

    montar();

    expect(
      await screen.findByRole("button", { name: "Continuar" }),
    ).toBeInTheDocument();
  });

  it("sem fase publicada o botão não existe", () => {
    // Não há para onde navegar: um botão aqui prometeria o que não entrega.
    montar(null);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("dois cliques seguidos mandam um POST só", async () => {
    let liberar: (v: unknown) => void = () => {};
    mock.api.iniciarTrilha.mockImplementation(
      () => new Promise((r) => (liberar = r)),
    );

    montar();
    await userEvent.click(botao());
    await userEvent.click(botao());

    expect(mock.api.iniciarTrilha).toHaveBeenCalledTimes(1);
    liberar({ trilha: "python", iniciada_em: "2026-09-12T12:00:00Z" });
  });
});
