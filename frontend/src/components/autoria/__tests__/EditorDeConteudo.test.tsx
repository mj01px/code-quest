import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  aula,
  exercicioResumo,
  minhaCriatura,
  progressoAtual,
  usuario,
} from "@/components/__tests__/fixtures";
import { EditorDeConteudo } from "@/components/autoria/EditorDeConteudo";
import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";

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
    criarTrilha: jest.fn(),
    criarAula: jest.fn(),
    criarExercicio: jest.fn(),
    criarQuestao: jest.fn(),
    detalheEditorial: jest.fn(),
    publicarConteudo: jest.fn(),
    editarRascunho: jest.fn(),
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

const AUTOR = [...usuario().permissoes, "trilhas.create", "trilhas.submit_review"];

function montar(permissoes = AUTOR, trilhaId: number | null = null) {
  mock.api.eu.mockResolvedValue(usuario({ permissoes }));
  return render(
    <ProvedorProgresso>
      <EditorDeConteudo trilhaId={trilhaId} />
    </ProvedorProgresso>,
  );
}

// Trilha salva com uma aula que já tem um exercício, um card e uma questão.
function trilhaSalva(status_editorial = "RASCUNHO") {
  return {
    id: 9,
    nome: "TS do zero",
    slug: "ts-do-zero",
    descricao: "Tipos",
    resumo: "",
    sobre: "",
    ordem: 1,
    status_editorial,
    aulas: [
      aula({
        id: 4,
        titulo: "Tipos básicos",
        exercicios: [exercicioResumo({ id: 2, titulo: "Soma" })],
        flashcards: [{ id: 1, pergunta: "O que é any?", resposta: "Qualquer tipo" }],
        questoes: [
          {
            id: 6,
            enunciado: "Qual é primitivo?",
            opcoes: ["string", "Array", "Map", "Set"],
            resposta_correta: "A",
          },
        ],
      }),
    ],
  };
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
  mock.api.criarTrilha.mockResolvedValue({
    id: 9,
    nome: "TS do zero",
    slug: "ts-do-zero",
    descricao: "Tipos",
    dificuldade: "AVANCADO",
  });
  mock.api.criarAula.mockResolvedValue({
    id: 4,
    trilha: 9,
    titulo: "Tipos básicos",
    slug: "tipos-basicos",
    conteudo: "# Oi",
  });
  mock.api.criarExercicio.mockResolvedValue({
    id: 2,
    aula: 4,
    titulo: "Soma",
    slug: "soma",
    enunciado: "Some",
    dificuldade: "INICIANTE",
    tipo: "TEORICO",
  });
});

describe("EditorDeConteudo", () => {
  it("quem não cria conteúdo volta para /autoria", async () => {
    montar(usuario().permissoes);

    await waitFor(() => expect(substituirRota).toHaveBeenCalledWith("/autoria"));
  });

  it("cria a trilha, uma aula com prévia e um exercício teórico", async () => {
    const u = userEvent.setup();
    montar();

    await u.type(await screen.findByLabelText("NOME DA TRILHA"), "TS do zero");
    await u.type(screen.getByLabelText("DESCRIÇÃO CURTA"), "Tipos");
    await u.click(screen.getByRole("radio", { name: "AVANÇADO" }));
    await u.click(screen.getByRole("button", { name: "CRIAR TRILHA" }));

    expect(mock.api.criarTrilha).toHaveBeenCalledWith({
      nome: "TS do zero",
      descricao: "Tipos",
      dificuldade: "AVANCADO",
    });

    await u.type(await screen.findByLabelText("TÍTULO DA AULA"), "Tipos básicos");
    await u.type(screen.getByLabelText("TEXTO (MARKDOWN)"), "# Oi");
    expect(screen.getByRole("heading", { name: "Oi" })).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "ADICIONAR AULA" }));

    expect(mock.api.criarAula).toHaveBeenCalledWith({
      trilha: 9,
      titulo: "Tipos básicos",
      conteudo: "# Oi",
    });

    await u.click(await screen.findByRole("button", { name: "+ ADICIONAR EXERCÍCIO" }));
    await u.type(screen.getByLabelText("TÍTULO DO EXERCÍCIO"), "Soma");
    await u.type(screen.getByLabelText("ENUNCIADO"), "Some");
    expect(
      screen.getAllByRole("radio", { name: /TEÓRICO|MÚLTIPLA ESCOLHA|EXERCÍCIO DE CÓDIGO/ }),
    ).toHaveLength(3);
    // Teórico não pede função nem testes: isso é só do exercício de código.
    expect(screen.queryByLabelText(/FUNÇÃO|ARGUMENTOS|ESPERADO/i)).toBeNull();
    await u.click(screen.getByRole("button", { name: "SALVAR EXERCÍCIO" }));

    expect(mock.api.criarExercicio).toHaveBeenCalledWith({
      aula: 4,
      titulo: "Soma",
      enunciado: "Some",
    });
    expect(await screen.findByText("Soma")).toBeInTheDocument();
  });

  it("retoma a trilha salva com aulas, exercícios, cards e questões", async () => {
    mock.api.detalheEditorial.mockResolvedValue(trilhaSalva());
    montar(AUTOR, 9);

    expect(await screen.findByLabelText("NOME DA TRILHA")).toHaveValue("TS do zero");
    expect(screen.getByLabelText("DESCRIÇÃO CURTA")).toHaveValue("Tipos");
    expect(mock.api.detalheEditorial).toHaveBeenCalledWith("trilhas", 9);
    expect(screen.getByRole("heading", { name: "Editar trilha" })).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Dados da trilha" })).toBeNull();
    expect(screen.getByText("Soma")).toBeInTheDocument();
    expect(screen.getByText("O que é any?")).toBeInTheDocument();
    expect(screen.getByText("Qual é primitivo?")).toBeInTheDocument();
    // Rascunho ainda não se publica.
    expect(screen.queryByRole("button", { name: "PUBLICAR TRILHA" })).toBeNull();
    expect(screen.getByLabelText("TÍTULO DA AULA")).toBeInTheDocument();
  });

  it("cria questão de múltipla escolha com 4 opções e a correta", async () => {
    const u = userEvent.setup();
    mock.api.detalheEditorial.mockResolvedValue(trilhaSalva());
    mock.api.criarQuestao.mockResolvedValue({
      id: 7,
      enunciado: "Quanto é 1 + 1?",
      opcoes: ["1", "2", "3", "4"],
      resposta_correta: "B",
    });
    montar(AUTOR, 9);

    await u.click(await screen.findByRole("button", { name: "+ ADICIONAR EXERCÍCIO" }));
    await u.click(screen.getByRole("radio", { name: "MÚLTIPLA ESCOLHA" }));
    await u.type(screen.getByLabelText("ENUNCIADO DA QUESTÃO"), "Quanto é 1 + 1?");
    for (const [letra, texto] of [["A", "1"], ["B", "2"], ["C", "3"], ["D", "4"]]) {
      await u.type(screen.getByLabelText(`OPÇÃO ${letra}`), texto);
    }
    await u.selectOptions(screen.getByLabelText("RESPOSTA CORRETA"), "B");
    await u.click(screen.getByRole("button", { name: "SALVAR EXERCÍCIO" }));

    expect(mock.api.criarQuestao).toHaveBeenCalledWith({
      aula: 4,
      enunciado: "Quanto é 1 + 1?",
      opcoes: ["1", "2", "3", "4"],
      resposta_correta: "B",
    });
    expect(await screen.findByText("Quanto é 1 + 1?")).toBeInTheDocument();
  });

  it("cria exercício de código com função e casos de teste em JSON", async () => {
    const u = userEvent.setup();
    mock.api.detalheEditorial.mockResolvedValue(trilhaSalva());
    mock.api.criarExercicio.mockResolvedValue({
      id: 8,
      aula: 4,
      titulo: "Média",
      slug: "media",
      enunciado: "Calcule",
      dificuldade: "INICIANTE",
      tipo: "CODIGO",
    });
    montar(AUTOR, 9);

    await u.click(await screen.findByRole("button", { name: "+ ADICIONAR EXERCÍCIO" }));
    await u.click(screen.getByRole("radio", { name: "EXERCÍCIO DE CÓDIGO" }));
    await u.type(screen.getByLabelText("TÍTULO DO EXERCÍCIO"), "Média");
    await u.type(screen.getByLabelText("ENUNCIADO"), "Calcule");
    await u.type(screen.getByLabelText(/NOME DA FUNÇÃO/), "media");
    await u.type(screen.getByLabelText(/ARGUMENTOS 1/), "8, 6");
    await u.type(screen.getByLabelText(/ESPERADO 1/), "7.5");
    await u.click(screen.getByRole("button", { name: "+ CASO DE TESTE" }));
    await u.type(screen.getByLabelText(/ARGUMENTOS 2/), "[[1], {{}"); // `[[` e `{{` digitam `[` e `{`
    await u.type(screen.getByLabelText(/ESPERADO 2/), '"oi"');
    await u.click(screen.getByRole("button", { name: "SALVAR EXERCÍCIO" }));

    expect(mock.api.criarExercicio).toHaveBeenCalledWith({
      aula: 4,
      titulo: "Média",
      enunciado: "Calcule",
      funcao: "media",
      testes: [
        { argumentos: [8, 6], esperado: 7.5 },
        { argumentos: [[1], {}], esperado: "oi" },
      ],
    });
    expect(await screen.findByText("Média")).toBeInTheDocument();
    expect(screen.getAllByText("CÓDIGO").length).toBeGreaterThan(0);
  });

  it("caso de teste que não é JSON não chega à API", async () => {
    const u = userEvent.setup();
    mock.api.detalheEditorial.mockResolvedValue(trilhaSalva());
    montar(AUTOR, 9);

    await u.click(await screen.findByRole("button", { name: "+ ADICIONAR EXERCÍCIO" }));
    await u.click(screen.getByRole("radio", { name: "EXERCÍCIO DE CÓDIGO" }));
    await u.type(screen.getByLabelText("TÍTULO DO EXERCÍCIO"), "Média");
    await u.type(screen.getByLabelText("ENUNCIADO"), "Calcule");
    await u.type(screen.getByLabelText(/NOME DA FUNÇÃO/), "media");
    await u.type(screen.getByLabelText(/ESPERADO 1/), "oi sem aspas");
    await u.click(screen.getByRole("button", { name: "SALVAR EXERCÍCIO" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/JSON/);
    expect(mock.api.criarExercicio).not.toHaveBeenCalled();
  });

  it("edita nome e descrição da trilha em rascunho", async () => {
    const u = userEvent.setup();
    mock.api.detalheEditorial.mockResolvedValue(trilhaSalva());
    mock.api.editarRascunho.mockResolvedValue({});
    montar(AUTOR, 9);

    const nome = await screen.findByLabelText("NOME DA TRILHA");
    const salvar = screen.getByRole("button", { name: "SALVAR DADOS DA TRILHA" });
    // Sem mudança, não há o que salvar.
    expect(salvar).toBeDisabled();
    await u.clear(nome);
    await u.type(nome, "TS avançado");
    await u.click(salvar);

    expect(mock.api.editarRascunho).toHaveBeenCalledWith("trilhas", 9, {
      nome: "TS avançado",
      descricao: "Tipos",
    });
    expect(await screen.findByRole("status")).toHaveTextContent("DADOS DA TRILHA SALVOS.");
    expect(salvar).toBeDisabled();
  });

  it("erro ao salvar a trilha aparece na tela", async () => {
    const u = userEvent.setup();
    const { ErroApi } = jest.requireActual("@/lib/api");
    mock.api.detalheEditorial.mockResolvedValue(trilhaSalva());
    mock.api.editarRascunho.mockRejectedValue(
      new ErroApi(400, "validacao", "Só rascunho pode ser editado ou excluído."),
    );
    montar(AUTOR, 9);

    await u.type(await screen.findByLabelText("DESCRIÇÃO CURTA"), " e mais");
    await u.click(screen.getByRole("button", { name: "SALVAR DADOS DA TRILHA" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Só rascunho pode ser editado ou excluído.",
    );
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("trilha aprovada mostra PUBLICAR TRILHA e publica", async () => {
    mock.api.detalheEditorial.mockResolvedValue(trilhaSalva("APROVADO"));
    mock.api.publicarConteudo.mockResolvedValue({ id: 9, status_editorial: "PUBLICADO" });
    montar(AUTOR, 9);

    await userEvent.click(await screen.findByRole("button", { name: "PUBLICAR TRILHA" }));
    // Fora de rascunho, nome e descrição não se editam.
    expect(screen.queryByLabelText("NOME DA TRILHA")).toBeNull();

    expect(mock.api.publicarConteudo).toHaveBeenCalledWith("trilhas", 9);
    expect(await screen.findByText(/TRILHA PUBLICADA/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "PUBLICAR TRILHA" })).toBeNull();
  });
});
