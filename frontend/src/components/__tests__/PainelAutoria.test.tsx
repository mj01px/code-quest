import { render, screen, waitFor, within } from "@testing-library/react";
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
    detalheEditorial: jest.fn(),
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

describe("PainelAutoria: modal de visualização", () => {
  const detalheAula = {
    id: 3,
    titulo: "Laços",
    slug: "lacos",
    conteudo: "Um laço repete um bloco.",
    ordem: 1,
    pre_requisito: null,
    exercicios: [{ id: 9, titulo: "Tabuada" }],
  };

  const exercicio: ItemEditorial = {
    id: 7,
    tipo: "exercicios",
    titulo: "Dobro",
    status_editorial: "RASCUNHO",
  };

  const detalheExercicio = {
    id: 7,
    titulo: "Dobro",
    slug: "dobro",
    enunciado: "Devolva o dobro de n.",
    dificuldade_label: "Iniciante",
    aula_titulo: "Funções",
    trilha_nome: "Lógica",
    codigo_inicial: "def dobro(n):\n    ...\n",
  };

  async function abrir(titulo: string) {
    await userEvent.click(
      await screen.findByRole("button", { name: `Ver conteúdo: ${titulo}` }),
    );
    return screen.getByRole("dialog", { name: titulo });
  }

  it("abre a aula da fila, mostra o conteúdo e aprova de dentro do modal", async () => {
    mock.api.detalheEditorial.mockResolvedValue(detalheAula);
    mock.api.aprovarConteudo.mockResolvedValue({
      id: 3,
      status_editorial: "APROVADO",
    });
    montar(ADMIN);

    const modal = await abrir("Laços");

    expect(mock.api.detalheEditorial).toHaveBeenCalledWith("aulas", 3);
    expect(
      await within(modal).findByText("Um laço repete um bloco."),
    ).toBeInTheDocument();
    expect(within(modal).getByText("Tabuada")).toBeInTheDocument();

    await userEvent.click(within(modal).getByRole("button", { name: "Aprovar" }));

    expect(mock.api.aprovarConteudo).toHaveBeenCalledWith("aulas", 3);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("Nada esperando revisão.")).toBeInTheDocument();
  });

  it("abre o exercício em rascunho com enunciado e código e submete", async () => {
    mock.api.autoriaRascunhos.mockResolvedValue([exercicio]);
    mock.api.detalheEditorial.mockResolvedValue(detalheExercicio);
    mock.api.submeterRevisao.mockResolvedValue({
      id: 7,
      status_editorial: "REVISAO",
    });
    montar(AUTOR);

    const modal = await abrir("Dobro");

    expect(
      await within(modal).findByText("Devolva o dobro de n."),
    ).toBeInTheDocument();
    expect(within(modal).getByLabelText("Código inicial")).toHaveTextContent(
      "def dobro(n):",
    );

    await userEvent.click(
      within(modal).getByRole("button", { name: "Enviar para Revisão" }),
    );

    expect(mock.api.submeterRevisao).toHaveBeenCalledWith("exercicios", 7);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      screen.getByText("Nenhum rascunho esperando envio."),
    ).toBeInTheDocument();
  });

  it("fecha no Esc e no clique fora, sem agir", async () => {
    mock.api.detalheEditorial.mockResolvedValue(detalheAula);
    montar(ADMIN);

    await abrir("Laços");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();

    const modal = await abrir("Laços");
    await userEvent.click(modal.parentElement!);
    expect(screen.queryByRole("dialog")).toBeNull();

    expect(mock.api.aprovarConteudo).not.toHaveBeenCalled();
    expect(screen.getByText("Laços")).toBeInTheDocument();
  });

  it("erro na ação fica no modal aberto", async () => {
    const { ErroApi } = jest.requireActual("@/lib/api");
    mock.api.detalheEditorial.mockResolvedValue(detalheAula);
    mock.api.devolverConteudo.mockRejectedValue(
      new ErroApi(400, "transicao_invalida", "O status atual é Aprovado."),
    );
    montar(ADMIN);

    const modal = await abrir("Laços");
    await within(modal).findByText("Um laço repete um bloco.");
    await userEvent.click(within(modal).getByRole("button", { name: "Devolver" }));

    expect(await within(modal).findByRole("alert")).toHaveTextContent(
      "O status atual é Aprovado.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
