import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  minhaCriatura,
  progressoAtual,
  usuario,
} from "@/components/__tests__/fixtures";
import { PainelAutoria } from "@/components/autoria/PainelAutoria";
import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";
import type { ItemEditorial } from "@/lib/types";

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  temSessao: jest.fn(),
  api: {
    eu: jest.fn(),
    minhasCriaturas: jest.fn(),
    meuProgresso: jest.fn(),
    minhaSequencia: jest.fn(),
    exerciciosConcluidos: jest.fn(),
    trilhasIniciadas: jest.fn(),
    autoriaRascunhos: jest.fn(),
    autoriaFilaRevisao: jest.fn(),
    submeterRevisao: jest.fn(),
    aprovarConteudo: jest.fn(),
    devolverConteudo: jest.fn(),
  },
}));

const substituirRota = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: substituirRota }),
}));

const mock = jest.requireMock<{
  temSessao: jest.Mock;
  api: Record<string, jest.Mock>;
}>("@/lib/api");

const ALUNO = usuario().permissoes;
const AUTOR = [...ALUNO, "trilhas.submit_review"];
const ADMIN = [...AUTOR, "trilhas.review"];

const rascunho: ItemEditorial = {
  id: 3,
  tipo: "trilhas",
  titulo: "Trilha nova",
  status_editorial: "RASCUNHO",
};

const emRevisao: ItemEditorial = {
  id: 3,
  tipo: "aulas",
  titulo: "Laços",
  status_editorial: "REVISAO",
};

function montar(permissoes: string[]) {
  mock.api.eu.mockResolvedValue(usuario({ permissoes }));
  return render(
    <ProvedorProgresso>
      <PainelAutoria />
    </ProvedorProgresso>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mock.temSessao.mockReturnValue(true);
  mock.api.minhasCriaturas.mockResolvedValue([minhaCriatura()]);
  mock.api.meuProgresso.mockResolvedValue(progressoAtual());
  mock.api.minhaSequencia.mockResolvedValue({
    atual: 0,
    recorde: 0,
    feito_hoje: false,
    ultimo_dia: null,
  });
  mock.api.exerciciosConcluidos.mockResolvedValue([]);
  mock.api.trilhasIniciadas.mockResolvedValue([]);
  mock.api.autoriaRascunhos.mockResolvedValue([rascunho]);
  mock.api.autoriaFilaRevisao.mockResolvedValue([emRevisao]);
});

describe("PainelAutoria: RBAC", () => {
  it("autor vê os rascunhos e não vê a fila de revisão", async () => {
    montar(AUTOR);

    expect(
      await screen.findByRole("button", {
        name: "Enviar para Revisão: Trilha nova",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Fila de revisão" }),
    ).not.toBeInTheDocument();
    expect(mock.api.autoriaFilaRevisao).not.toHaveBeenCalled();
  });

  it("quem revisa vê Aprovar e Devolver na fila", async () => {
    montar(ADMIN);

    expect(
      await screen.findByRole("button", { name: "Aprovar: Laços" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Devolver: Laços" }),
    ).toBeInTheDocument();
  });

  it("sem permissão nenhum painel aparece e a rota redireciona", async () => {
    montar(ALUNO);

    await waitFor(() => expect(substituirRota).toHaveBeenCalledWith("/trilhas"));
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(mock.api.autoriaRascunhos).not.toHaveBeenCalled();
  });
});

describe("PainelAutoria: ações", () => {
  it("enviar para revisão chama a rota do tipo e tira o item da lista", async () => {
    mock.api.submeterRevisao.mockResolvedValue({
      id: 3,
      status_editorial: "REVISAO",
    });
    montar(AUTOR);

    await userEvent.click(
      await screen.findByRole("button", {
        name: "Enviar para Revisão: Trilha nova",
      }),
    );

    expect(mock.api.submeterRevisao).toHaveBeenCalledWith("trilhas", 3);
    expect(await screen.findByText("Nenhum rascunho esperando envio.")).toBeInTheDocument();
  });

  it("devolver tira o item da fila e recarrega os rascunhos", async () => {
    mock.api.devolverConteudo.mockResolvedValue({
      id: 3,
      status_editorial: "RASCUNHO",
    });
    montar(ADMIN);

    await userEvent.click(
      await screen.findByRole("button", { name: "Devolver: Laços" }),
    );

    expect(mock.api.devolverConteudo).toHaveBeenCalledWith("aulas", 3);
    expect(await screen.findByText("Nada esperando revisão.")).toBeInTheDocument();
    await waitFor(() => expect(mock.api.autoriaRascunhos).toHaveBeenCalledTimes(2));
  });

  it("falha ao carregar mostra o erro sem dizer que a lista está vazia", async () => {
    const { ErroApi } = jest.requireActual("@/lib/api");
    mock.api.autoriaRascunhos.mockRejectedValue(
      new ErroApi(403, "permission_denied", "Sem permissão."),
    );
    montar(AUTOR);

    expect(await screen.findByRole("alert")).toHaveTextContent("Sem permissão.");
    expect(
      screen.queryByText("Nenhum rascunho esperando envio."),
    ).not.toBeInTheDocument();
  });

  it("erro da API aparece e o item fica", async () => {
    const { ErroApi } = jest.requireActual("@/lib/api");
    mock.api.aprovarConteudo.mockRejectedValue(
      new ErroApi(400, "transicao_invalida", "Só conteúdo em revisão aceita esta ação."),
    );
    montar(ADMIN);

    await userEvent.click(
      await screen.findByRole("button", { name: "Aprovar: Laços" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Só conteúdo em revisão aceita esta ação.",
    );
    expect(screen.getByText("Laços")).toBeInTheDocument();
  });
});
