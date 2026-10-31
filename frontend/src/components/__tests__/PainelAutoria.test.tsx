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
    autoriaMeusEnvios: jest.fn(),
    publicarConteudo: jest.fn(),
    detalheEditorial: jest.fn(),
    submeterRevisao: jest.fn(),
    aprovarConteudo: jest.fn(),
    devolverConteudo: jest.fn(),
    editarRascunho: jest.fn(),
    excluirRascunho: jest.fn(),
    criarFlashcard: jest.fn(),
    criarAula: jest.fn(),
    criarExercicio: jest.fn(),
    criarQuestao: jest.fn(),
  },
}));

// O Monaco não sobe no jsdom: um textarea faz o papel do editor.
jest.mock("@/components/exercicio/EditorDeCodigo", () => ({
  EditorDeCodigo: ({ valor }: { valor: string }) => (
    <textarea aria-label="Código" value={valor} readOnly />
  ),
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

// A fila mora na segunda aba: quem revisa precisa abri-la antes de agir.
async function irParaFila() {
  await userEvent.click(await screen.findByRole("tab", { name: /REVISÃO DE CONTEÚDO/ }));
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
  mock.api.autoriaMeusEnvios.mockResolvedValue({
    em_revisao: [],
    devolvidos: [],
    excluidos: [],
  });
});

describe("PainelAutoria: RBAC", () => {
  it("sem trilhas.create nenhum botão de criação aparece", async () => {
    montar(AUTOR);
    await screen.findByRole("button", { name: "Enviar para Revisão: Trilha nova" });
    expect(screen.queryByRole("group", { name: "Criar conteúdo" })).toBeNull();
  });

  it.each([
    ["trilhas.create_trilha", "+ NOVA TRILHA"],
    ["trilhas.create_aula", "+ NOVA AULA"],
    ["trilhas.create_exercicio", "+ NOVO EXERCÍCIO"],
  ])("com %s aparece só o botão %s", async (granular, rotulo) => {
    montar([...AUTOR, "trilhas.create", granular]);

    const grupo = await screen.findByRole("group", { name: "Criar conteúdo" });
    const botoes = within(grupo).getAllByText(/^\+ /).map((b) => b.textContent);
    expect(botoes).toEqual([rotulo]);
  });

  it("nova trilha segue para o editor completo", async () => {
    montar([...AUTOR, "trilhas.create", "trilhas.create_trilha"]);

    expect(await screen.findByRole("link", { name: "+ NOVA TRILHA" })).toHaveAttribute(
      "href",
      "/autoria/novo",
    );
  });

  it("mostra quem criou cada item e resume a lista vazia no topo", async () => {
    mock.api.autoriaRascunhos.mockResolvedValue([{ ...rascunho, criado_por: "ana" }]);
    montar(AUTOR);

    expect(await screen.findByText("CRIADO POR: ana")).toBeInTheDocument();
    // Aprovados vem vazio no beforeEach: some como seção e fica só no resumo.
    const resumo = await screen.findByRole("list", { name: "Resumo" });
    expect(within(resumo).getByText("Prontos para publicar")).toBeInTheDocument();
    expect(within(resumo).getByText("Nada aprovado esperando publicação.")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Prontos para publicar" })).toBeNull();
  });

  it("tudo vazio vira uma tela só, que convida a criar a primeira trilha", async () => {
    mock.api.autoriaRascunhos.mockResolvedValue([]);
    montar([...AUTOR, "trilhas.create", "trilhas.create_trilha"]);

    expect(await screen.findByText("Seu espaço de criação está pronto!")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Resumo" })).toBeNull();
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("autor vê os rascunhos e não vê a fila de revisão", async () => {
    montar(AUTOR);

    expect(
      await screen.findByRole("button", {
        name: "Enviar para Revisão: Trilha nova",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Revisão de conteúdo" }),
    ).not.toBeInTheDocument();
    // Sem a fila, sobram produção e meus envios.
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "CRIAÇÃO E PUBLICAÇÃO",
      "MEUS ENVIOS",
    ]);
    expect(mock.api.autoriaFilaRevisao).not.toHaveBeenCalled();
  });

  it("quem revisa vê Aprovar e Devolver na fila", async () => {
    montar(ADMIN);
    await irParaFila();

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

describe("PainelAutoria: abas", () => {
  const CRIADOR_REVISOR = [...ADMIN, "trilhas.create", "trilhas.create_trilha"];

  it("a aba de revisão só existe com trilhas.review", async () => {
    const { unmount } = montar(AUTOR);
    await screen.findByRole("button", { name: "Enviar para Revisão: Trilha nova" });
    expect(screen.queryByRole("tab", { name: /REVISÃO DE CONTEÚDO/ })).toBeNull();
    unmount();

    montar(ADMIN);
    expect(await screen.findByRole("tab", { name: /REVISÃO DE CONTEÚDO/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /CRIAÇÃO E PUBLICAÇÃO/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("o selo da aba conta a fila sem abri-la", async () => {
    montar(ADMIN);

    const aba = await screen.findByRole("tab", { name: /REVISÃO DE CONTEÚDO/ });
    await waitFor(() => expect(within(aba).getByText("1")).toBeInTheDocument());
  });

  it("as três abas seguem a ordem produção, fila, envios", async () => {
    montar(ADMIN);

    await screen.findByRole("tab", { name: /REVISÃO DE CONTEÚDO/ });
    expect(screen.getAllByRole("tab").map((t) => t.textContent?.replace(/\d+$/, ""))).toEqual([
      "CRIAÇÃO E PUBLICAÇÃO",
      "REVISÃO DE CONTEÚDO",
      "MEUS ENVIOS",
    ]);
  });

  it("topo em ordem: título, subtítulo, abas e só então os botões de criação", async () => {
    montar(CRIADOR_REVISOR);

    const grupo = await screen.findByRole("group", { name: "Criar conteúdo" });
    const ordem = [
      screen.getByRole("heading", { name: "Produção de Conteúdo" }),
      screen.getByText(/^Crie conteúdo, envie rascunhos/),
      screen.getByRole("tablist"),
      grupo,
    ];
    for (let i = 1; i < ordem.length; i++) {
      expect(
        ordem[i - 1].compareDocumentPosition(ordem[i]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it("trocar de aba troca o conteúdo, os botões de criação só ficam na primeira, e volta", async () => {
    montar(CRIADOR_REVISOR);

    expect(await screen.findByRole("group", { name: "Criar conteúdo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Produção de Conteúdo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aprovar: Laços" })).toBeNull();

    await irParaFila();

    // Os botões de criação são da aba 1: na fila somem da tela.
    expect(screen.queryByRole("group", { name: "Criar conteúdo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "+ NOVA TRILHA" })).toBeNull();
    expect(screen.queryByRole("link", { name: "+ NOVA TRILHA" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Enviar para Revisão: Trilha nova" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Revisão de Conteúdo" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Aprovar: Laços" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /CRIAÇÃO E PUBLICAÇÃO/ }));

    expect(screen.getByRole("group", { name: "Criar conteúdo" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Enviar para Revisão: Trilha nova" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aprovar: Laços" })).toBeNull();
  });

  it("fila vazia mostra que está tudo em dia", async () => {
    mock.api.autoriaFilaRevisao.mockResolvedValue([]);
    montar(ADMIN);
    await irParaFila();

    expect(
      await screen.findByText("Tudo em dia! Nenhum conteúdo pendente para revisão."),
    ).toBeInTheDocument();
    expect(within(screen.getByRole("tab", { name: /REVISÃO DE CONTEÚDO/ })).queryByText("0")).toBeNull();
  });

  it("quem só revisa cai direto na fila, sem abas", async () => {
    montar([...ALUNO, "trilhas.review"]);

    expect(await screen.findByRole("button", { name: "Aprovar: Laços" })).toBeInTheDocument();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByRole("heading", { name: "Revisão de Conteúdo" })).toBeInTheDocument();
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
    expect(await screen.findByText("Tudo em dia! Nenhum conteúdo pendente.")).toBeInTheDocument();
  });

  it("devolver tira o item da fila e recarrega os rascunhos", async () => {
    mock.api.devolverConteudo.mockResolvedValue({
      id: 3,
      status_editorial: "RASCUNHO",
    });
    montar(ADMIN);
    await irParaFila();

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
    expect(
      await screen.findByText("Tudo em dia! Nenhum conteúdo pendente para revisão."),
    ).toBeInTheDocument();
    await waitFor(() => expect(mock.api.autoriaRascunhos).toHaveBeenCalledTimes(2));
  });

  it("rascunho devolvido sai da criação: lá só fica o rascunho puro", async () => {
    mock.api.autoriaRascunhos.mockResolvedValue([
      rascunho,
      { ...rascunho, id: 4, titulo: "Trilha devolvida", parecer: "Faltou um exemplo." },
    ]);
    montar(AUTOR);

    await screen.findByRole("button", { name: "Enviar para Revisão: Trilha nova" });
    expect(screen.queryByText("Trilha devolvida")).toBeNull();
    expect(screen.queryByRole("note", { name: "Motivo da devolução" })).toBeNull();
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
    await irParaFila();

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
    questoes: [],
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
    trilha_slug: "logica",
    codigo_inicial: "def dobro(n):\n    ...\n",
    especificacao: {
      linguagem: "PYTHON",
      funcao: "dobro",
      codigo_inicial: "def dobro(n):\n    ...\n",
      requisitos: [],
      limite_de_caracteres: 10_000,
      codigo_aprovado: "",
      exemplos: [],
    },
    testes: [],
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
    await irParaFila();

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
    expect(
      screen.getByText("Tudo em dia! Nenhum conteúdo pendente para revisão."),
    ).toBeInTheDocument();
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
    // O código inicial abre no mesmo editor do aluno, que executa mas não envia.
    expect(within(modal).getByLabelText("Código")).toHaveValue("def dobro(n):\n    ...\n");
    expect(within(modal).getByRole("button", { name: "Executar" })).toBeInTheDocument();
    expect(within(modal).queryByRole("button", { name: "Enviar" })).toBeNull();

    await userEvent.click(
      within(modal).getByRole("button", { name: "Enviar para Revisão" }),
    );

    expect(mock.api.submeterRevisao).toHaveBeenCalledWith("exercicios", 7);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      await screen.findByText("Tudo em dia! Nenhum conteúdo pendente."),
    ).toBeInTheDocument();
  });

  it("fecha no Esc e no clique fora, sem agir", async () => {
    mock.api.detalheEditorial.mockResolvedValue(detalheAula);
    montar(ADMIN);
    await irParaFila();

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
    await irParaFila();

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
    expect(await screen.findByText("Tudo em dia! Nenhum conteúdo pendente.")).toBeInTheDocument();
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

  it("clicar na trilha abre o editor; sem trilhas.create abre a leitura", async () => {
    const { unmount } = montar(CRIADOR);
    expect(
      await screen.findByRole("link", { name: "Abrir no editor: Trilha nova" }),
    ).toHaveAttribute("href", "/autoria/novo?trilha_id=3");
    unmount();

    montar(AUTOR);
    expect(
      await screen.findByRole("button", { name: "Ver conteúdo: Trilha nova" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Abrir no editor: Trilha nova" })).toBeNull();
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

describe("PainelAutoria: criação rápida", () => {
  const CRIA_TUDO = [
    ...AUTOR,
    "trilhas.create",
    "trilhas.create_aula",
    "trilhas.create_exercicio",
  ];

  it("nova aula escolhe a trilha em rascunho, cria e recarrega os rascunhos", async () => {
    const u = userEvent.setup();
    mock.api.criarAula.mockResolvedValue({
      id: 9,
      trilha: 3,
      titulo: "Laços",
      slug: "lacos",
      conteudo: "# Laços",
    });
    montar(CRIA_TUDO);

    await u.click(await screen.findByRole("button", { name: "+ NOVA AULA" }));
    const modal = screen.getByRole("dialog", { name: "Nova aula" });
    await within(modal).findByRole("option", { name: "Trilha nova" });
    await u.selectOptions(within(modal).getByLabelText("VINCULAR À TRILHA"), "3");
    await u.type(within(modal).getByLabelText("TÍTULO DA AULA"), "Laços");
    await u.type(within(modal).getByLabelText("TEXTO (MARKDOWN)"), "# Laços");
    const chamadasAntes = mock.api.autoriaRascunhos.mock.calls.length;
    await u.click(within(modal).getByRole("button", { name: "CRIAR AULA" }));

    expect(mock.api.criarAula).toHaveBeenCalledWith({
      trilha: 3,
      titulo: "Laços",
      conteudo: "# Laços",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      'Aula "Laços" criada em Trilha nova.',
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() =>
      expect(mock.api.autoriaRascunhos.mock.calls.length).toBeGreaterThan(chamadasAntes),
    );
  });

  it("novo exercício escolhe trilha, aula e tipo, e cria o teórico", async () => {
    const u = userEvent.setup();
    mock.api.detalheEditorial.mockResolvedValue({
      id: 3,
      nome: "Trilha nova",
      aulas: [{ id: 4, titulo: "Laços" }],
    });
    mock.api.criarExercicio.mockResolvedValue({ id: 11, titulo: "Soma", tipo: "TEORICO" });
    montar(CRIA_TUDO);

    await u.click(await screen.findByRole("button", { name: "+ NOVO EXERCÍCIO" }));
    const modal = screen.getByRole("dialog", { name: "Novo exercício" });
    await within(modal).findByRole("option", { name: "Trilha nova" });
    await u.selectOptions(within(modal).getByLabelText("VINCULAR À TRILHA"), "3");
    expect(mock.api.detalheEditorial).toHaveBeenCalledWith("trilhas", 3);
    await within(modal).findByRole("option", { name: "Laços" });
    await u.selectOptions(within(modal).getByLabelText("VINCULAR À AULA"), "4");

    // Quiz troca o formulário pelo de múltipla escolha; teórico volta ao de exercício.
    await u.click(within(modal).getByRole("button", { name: "QUIZ" }));
    expect(within(modal).getByRole("form", { name: "Nova questão" })).toBeInTheDocument();
    await u.click(within(modal).getByRole("button", { name: "TEÓRICO" }));

    await u.type(within(modal).getByLabelText("TÍTULO DO EXERCÍCIO"), "Soma");
    await u.type(within(modal).getByLabelText("ENUNCIADO"), "Some dois números.");
    await u.click(within(modal).getByRole("button", { name: "SALVAR EXERCÍCIO" }));

    expect(mock.api.criarExercicio).toHaveBeenCalledWith({
      aula: 4,
      titulo: "Soma",
      enunciado: "Some dois números.",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      'Exercício "Soma" criado em Trilha nova.',
    );
  });

  it.each([
    ["link", "+ NOVA TRILHA", /^Cria uma trilha completa do zero/],
    ["button", "+ NOVA AULA", /^Adiciona uma aula avulsa/],
    ["button", "+ NOVO EXERCÍCIO", /^Cria um exercício \(Teórico, Múltipla Escolha ou Código\)/],
  ])("o ? é um ícone dentro do %s %s, que o descreve", async (papel, nome, dica) => {
    montar([...CRIA_TUDO, "trilhas.create_trilha"]);

    const botao = await screen.findByRole(papel, { name: nome });
    expect(botao).toHaveAccessibleDescription(dica);
    // O ícone mora dentro do botão e não captura o clique.
    const icone = botao.querySelector("svg");
    expect(icone).not.toBeNull();
    expect(icone!.parentElement).toHaveClass("pointer-events-none");
    expect(screen.queryByRole("button", { name: /^Ajuda/ })).toBeNull();
  });

  it("sem trilha em rascunho, o modal explica o que fazer primeiro", async () => {
    mock.api.autoriaRascunhos.mockResolvedValue([]);
    montar(CRIA_TUDO);

    await userEvent.click(await screen.findByRole("button", { name: "+ NOVA AULA" }));

    expect(
      await within(screen.getByRole("dialog")).findByText(/Crie uma trilha primeiro/),
    ).toBeInTheDocument();
  });
});

describe("PainelAutoria: meus envios", () => {
  async function irParaEnvios() {
    await userEvent.click(await screen.findByRole("tab", { name: "MEUS ENVIOS" }));
  }

  it("mostra as três seções com o parecer, o atalho de correção e a exclusão", async () => {
    mock.api.autoriaMeusEnvios.mockResolvedValue({
      em_revisao: [{ ...emRevisao, status_editorial: "REVISAO" }],
      devolvidos: [
        { ...rascunho, id: 4, titulo: "Trilha devolvida", parecer: "Faltou um exemplo." },
      ],
      excluidos: [
        {
          tipo: "trilhas",
          titulo: "Lógica",
          motivo: "Conteúdo duplicado.",
          excluido_por: "admin",
          excluido_em: "2026-10-29T12:00:00Z",
        },
      ],
    });
    montar(AUTOR);
    await irParaEnvios();

    expect(await screen.findByRole("heading", { name: "Meus Envios e Feedback" })).toBeInTheDocument();
    const espera = await screen.findByRole("region", { name: "Aguardando Revisão" });
    expect(within(espera).getByText("Laços")).toBeInTheDocument();
    // Só informativo: nenhum botão no card de quem espera.
    expect(within(espera).queryByRole("button")).toBeNull();

    const devolvidos = screen.getByRole("region", { name: "Devolvidos para Correção" });
    expect(within(devolvidos).getByRole("note", { name: "Motivo da devolução" })).toHaveTextContent(
      "Faltou um exemplo.",
    );
    expect(
      within(devolvidos).getByRole("link", { name: "Corrigir Rascunho: Trilha devolvida" }),
    ).toHaveAttribute("href", "/autoria/novo?trilha_id=4");

    const historico = screen.getByRole("region", { name: "Histórico de Exclusão" });
    expect(historico).toHaveTextContent(
      'O admin admin excluiu sua trilha "Lógica" pelo motivo: Conteúdo duplicado.',
    );
  });

  it("exclusão sem motivo e sem autor conhecido ainda se explica", async () => {
    mock.api.autoriaMeusEnvios.mockResolvedValue({
      em_revisao: [],
      devolvidos: [],
      excluidos: [
        {
          tipo: "aulas",
          titulo: null,
          motivo: null,
          excluido_por: null,
          excluido_em: "2026-10-29T12:00:00Z",
        },
      ],
    });
    montar(AUTOR);
    await irParaEnvios();

    expect(
      await screen.findByText("Um administrador excluiu sua aula sem informar o motivo."),
    ).toBeInTheDocument();
    expect(screen.getByText("Nada esperando revisão no momento.")).toBeInTheDocument();
  });

  it("busca de novo a cada visita à aba e mostra o erro da API", async () => {
    const { ErroApi } = jest.requireActual("@/lib/api");
    montar(AUTOR);
    expect(mock.api.autoriaMeusEnvios).not.toHaveBeenCalled();

    await irParaEnvios();
    await screen.findByText("Nenhum conteúdo seu foi excluído.");
    mock.api.autoriaMeusEnvios.mockRejectedValue(new ErroApi(429, "throttled", "Calma."));
    await userEvent.click(screen.getByRole("tab", { name: /CRIAÇÃO E PUBLICAÇÃO/ }));
    await irParaEnvios();

    expect(await screen.findByRole("alert")).toHaveTextContent("Calma.");
    expect(mock.api.autoriaMeusEnvios).toHaveBeenCalledTimes(2);
  });
});
