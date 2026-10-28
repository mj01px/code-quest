import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
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

function montar(permissoes = AUTOR) {
  mock.api.eu.mockResolvedValue(usuario({ permissoes }));
  return render(
    <ProvedorProgresso>
      <EditorDeConteudo />
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

    await u.click(await screen.findByRole("button", { name: "+ EXERCÍCIO" }));
    await u.type(screen.getByLabelText("TÍTULO DO EXERCÍCIO"), "Soma");
    await u.type(screen.getByLabelText("ENUNCIADO"), "Some");
    // O editor não pede código nem testes.
    expect(screen.queryByLabelText(/FUNÇÃO/)).toBeNull();
    expect(screen.queryByLabelText(/TESTES/)).toBeNull();
    await u.click(screen.getByRole("button", { name: "SALVAR EXERCÍCIO" }));

    expect(mock.api.criarExercicio).toHaveBeenCalledWith({
      aula: 4,
      titulo: "Soma",
      enunciado: "Some",
    });
    expect(await screen.findByText("Soma")).toBeInTheDocument();
  });
});
