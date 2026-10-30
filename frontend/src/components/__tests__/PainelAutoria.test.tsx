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
    autoriaAprovados: jest.fn(),
    publicarConteudo: jest.fn(),
    detalheEditorial: jest.fn(),
    submeterRevisao: jest.fn(),
    aprovarConteudo: jest.fn(),
    devolverConteudo: jest.fn(),
    editarRascunho: jest.fn(),
    excluirRascunho: jest.fn(),
    criarFlashcard: jest.fn(),
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
  mock.api.autoriaAprovados.mockResolvedValue([]);
});

describe("PainelAutoria: RBAC", () => {
  it("botão NOVO CONTEÚDO só para quem cria conteúdo", async () => {
    const { unmount } = montar(AUTOR);
    await screen.findByRole("button", { name: "Enviar para Revisão: Trilha nova" });
    expect(screen.queryByRole("link", { name: "NOVO CONTEÚDO" })).toBeNull();
    unmount();

    montar([...AUTOR, "trilhas.create"]);
    expect(await screen.findByRole("link", { name: "NOVO CONTEÚDO" })).toHaveAttribute(
      "href",
      "/autoria/novo",
    );
  });

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

    // O motivo é obrigatório: sem texto o botão de enviar fica travado.
    const modal = await screen.findByRole("dialog");
    const enviar = within(modal).getByRole("button", { name: "DEVOLVER" });
    expect(enviar).toBeDisabled();
    await userEvent.type(
      within(modal).getByLabelText(/MOTIVO DA DEVOLUÇÃO/),
      "Faltou exemplo.",
    );
    await userEvent.click(enviar);

    expect(mock.api.devolverConteudo).toHaveBeenCalledWith("aulas", 3, "Faltou exemplo.");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await screen.findByText("Nada esperando revisão.")).toBeInTheDocument();
    await waitFor(() => expect(mock.api.autoriaRascunhos).toHaveBeenCalledTimes(2));
  });

  it("rascunho devolvido mostra o motivo da revisão", async () => {
    mock.api.autoriaRascunhos.mockResolvedValue([
      { ...rascunho, parecer: "Faltou um exemplo." },
    ]);
    montar(AUTOR);

    expect(
      await screen.findByRole("note", { name: "Motivo da devolução" }),
    ).toHaveTextContent("Faltou um exemplo.");
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
    flashcards: [{ id: 4, pergunta: "Laço infinito?", resposta: "Nunca termina." }],
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
    await userEvent.click(within(modal).getByRole("button", { pressed: false }));
    expect(within(modal).getByText("Nunca termina.")).toBeInTheDocument();

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

    const visualizacao = await abrir("Laços");
    await within(visualizacao).findByText("Um laço repete um bloco.");
    await userEvent.click(
      within(visualizacao).getByRole("button", { name: "Devolver" }),
    );

    // Devolver troca a visualização pelo modal do motivo.
    const modal = await screen.findByRole("dialog");
    await userEvent.type(within(modal).getByRole("textbox"), "Revise o enunciado.");
    await userEvent.click(within(modal).getByRole("button", { name: "DEVOLVER" }));

    expect(await within(modal).findByRole("alert")).toHaveTextContent(
      "O status atual é Aprovado.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("PainelAutoria: editar e excluir rascunho", () => {
  const CRIADOR = [...AUTOR, "trilhas.create"];

  it("lápis e lixeira só para quem cria conteúdo", async () => {
    montar(AUTOR);
    await screen.findByRole("button", { name: "Enviar para Revisão: Trilha nova" });
    expect(screen.queryByRole("button", { name: "Excluir: Trilha nova" })).toBeNull();
  });

  it("excluir pede confirmação, chama a API e recarrega a lista", async () => {
    mock.api.excluirRascunho.mockResolvedValue(null);
    montar(CRIADOR);

    await userEvent.click(
      await screen.findByRole("button", { name: "Excluir: Trilha nova" }),
    );
    const modal = screen.getByRole("dialog");
    expect(mock.api.excluirRascunho).not.toHaveBeenCalled();

    mock.api.autoriaRascunhos.mockResolvedValue([]);
    await userEvent.click(within(modal).getByRole("button", { name: "EXCLUIR" }));

    expect(mock.api.excluirRascunho).toHaveBeenCalledWith("trilhas", 3);
    expect(await screen.findByText("Nenhum rascunho esperando envio.")).toBeInTheDocument();
  });

  it("erro ao excluir fica no modal", async () => {
    const { ErroApi } = jest.requireActual("@/lib/api");
    mock.api.excluirRascunho.mockRejectedValue(
      new ErroApi(400, "validacao", "Só rascunho pode ser editado ou excluído."),
    );
    montar(CRIADOR);

    await userEvent.click(
      await screen.findByRole("button", { name: "Excluir: Trilha nova" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "EXCLUIR" }));

    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent(
      "Só rascunho pode ser editado ou excluído.",
    );
  });

  it("lápis da trilha abre o editor completo", async () => {
    montar(CRIADOR);

    expect(
      await screen.findByRole("link", { name: "Editar: Trilha nova" }),
    ).toHaveAttribute("href", "/autoria/novo?trilha_id=3");
    expect(mock.api.detalheEditorial).not.toHaveBeenCalled();
  });

  it("editar aula carrega os campos, salva e recarrega", async () => {
    mock.api.autoriaRascunhos.mockResolvedValue([
      { id: 4, tipo: "aulas", titulo: "Laços", status_editorial: "RASCUNHO" },
    ]);
    mock.api.detalheEditorial.mockResolvedValue({
      id: 4,
      titulo: "Laços",
      slug: "lacos",
      conteudo: "Texto",
      ordem: 1,
      pre_requisito: null,
      exercicios: [],
      flashcards: [],
      questoes: [],
    });
    mock.api.editarRascunho.mockResolvedValue({});
    montar(CRIADOR);

    await userEvent.click(await screen.findByRole("button", { name: "Editar: Laços" }));
    const titulo = await screen.findByLabelText("TÍTULO");
    expect(titulo).toHaveValue("Laços");
    await userEvent.clear(titulo);
    await userEvent.type(titulo, "Repetição");
    await userEvent.click(screen.getByRole("button", { name: "SALVAR" }));

    expect(mock.api.editarRascunho).toHaveBeenCalledWith("aulas", 4, {
      titulo: "Repetição",
      conteudo: "Texto",
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(mock.api.autoriaRascunhos).toHaveBeenCalledTimes(2));
  });

  it("editar exercício usa título e enunciado", async () => {
    mock.api.autoriaRascunhos.mockResolvedValue([
      { id: 8, tipo: "exercicios", titulo: "Soma", status_editorial: "RASCUNHO" },
    ]);
    mock.api.detalheEditorial.mockResolvedValue({
      id: 8,
      titulo: "Soma",
      slug: "soma",
      enunciado: "Some dois números.",
      tipo: "TEORICO",
      dificuldade: "INICIANTE",
      ordem: 1,
      codigo_inicial: null,
    });
    mock.api.editarRascunho.mockResolvedValue({});
    montar(CRIADOR);

    await userEvent.click(await screen.findByRole("button", { name: "Editar: Soma" }));
    const enunciado = await screen.findByLabelText("ENUNCIADO");
    expect(enunciado).toHaveValue("Some dois números.");
    await userEvent.type(enunciado, " E mostre.");
    await userEvent.click(screen.getByRole("button", { name: "SALVAR" }));

    expect(mock.api.editarRascunho).toHaveBeenCalledWith("exercicios", 8, {
      titulo: "Soma",
      enunciado: "Some dois números. E mostre.",
    });
  });
});

describe("PainelAutoria: prontos para publicar", () => {
  const aprovada: ItemEditorial = {
    id: 5,
    tipo: "aulas",
    titulo: "Aula pronta",
    status_editorial: "APROVADO",
  };

  it("marca o item com o selo APROVADO", async () => {
    mock.api.autoriaAprovados.mockResolvedValue([aprovada]);
    montar(AUTOR);

    const regiao = await screen.findByRole("region", { name: "Prontos para publicar" });
    expect(await within(regiao).findByText("APROVADO")).toBeInTheDocument();
  });

  it("quem cria exclui o aprovado depois de confirmar; aula aprovada não tem lápis", async () => {
    mock.api.autoriaAprovados.mockResolvedValue([aprovada]);
    mock.api.excluirRascunho.mockResolvedValue(null);
    montar([...AUTOR, "trilhas.create"]);

    const lixeira = await screen.findByRole("button", { name: "Excluir: Aula pronta" });
    expect(screen.queryByRole("button", { name: "Editar: Aula pronta" })).toBeNull();
    await userEvent.click(lixeira);
    const modal = screen.getByRole("dialog");
    expect(mock.api.excluirRascunho).not.toHaveBeenCalled();

    mock.api.autoriaAprovados.mockResolvedValue([]);
    await userEvent.click(within(modal).getByRole("button", { name: "EXCLUIR" }));

    expect(mock.api.excluirRascunho).toHaveBeenCalledWith("aulas", 5);
    expect(
      await screen.findByText("Nada aprovado esperando publicação."),
    ).toBeInTheDocument();
  });

  it("sem trilhas.create não há lixeira nos aprovados", async () => {
    mock.api.autoriaAprovados.mockResolvedValue([aprovada]);
    montar(AUTOR);

    await screen.findByRole("button", { name: "Publicar: Aula pronta" });
    expect(screen.queryByRole("button", { name: "Excluir: Aula pronta" })).toBeNull();
  });

  it("autor publica o aprovado e abre a trilha no editor", async () => {
    mock.api.autoriaAprovados.mockResolvedValue([
      { id: 5, tipo: "trilhas", titulo: "Trilha pronta", status_editorial: "APROVADO" },
    ]);
    mock.api.publicarConteudo.mockResolvedValue({ id: 5, status_editorial: "PUBLICADO" });
    montar(AUTOR);

    expect(
      await screen.findByRole("link", { name: "Abrir no editor: Trilha pronta" }),
    ).toHaveAttribute("href", "/autoria/novo?trilha_id=5");
    await userEvent.click(screen.getByRole("button", { name: "Publicar: Trilha pronta" }));

    expect(mock.api.publicarConteudo).toHaveBeenCalledWith("trilhas", 5);
    expect(
      await screen.findByText("Nada aprovado esperando publicação."),
    ).toBeInTheDocument();
  });
});
