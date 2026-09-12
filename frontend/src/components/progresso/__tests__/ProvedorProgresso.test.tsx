import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

import {
  minhaCriatura,
  progressoAtual,
  usuario,
} from "@/components/__tests__/fixtures";
import {
  ProvedorProgresso,
  useProgresso,
} from "@/components/progresso/ProvedorProgresso";
import { BotaoConclusao } from "@/components/trilhas/BotaoConclusao";
import { api as apiReal, temSessao as temSessaoReal } from "@/lib/api";

// O Context existe por dois motivos, e os dois têm teste aqui: uma busca só
// para todas as telas de dentro (antes cada ilha buscava a sua), e invalidação
// central depois do POST de conclusão.

jest.mock("@/lib/api", () => ({
  temSessao: jest.fn(),
  api: {
    eu: jest.fn(),
    minhasCriaturas: jest.fn(),
    meuProgresso: jest.fn(),
    exerciciosConcluidos: jest.fn(),
    concluirExercicio: jest.fn(),
  },
}));

const temSessao = temSessaoReal as jest.MockedFunction<typeof temSessaoReal>;
const eu = apiReal.eu as jest.MockedFunction<typeof apiReal.eu>;
const minhasCriaturas = apiReal.minhasCriaturas as jest.MockedFunction<
  typeof apiReal.minhasCriaturas
>;
const meuProgresso = apiReal.meuProgresso as jest.MockedFunction<
  typeof apiReal.meuProgresso
>;
const exerciciosConcluidos = apiReal.exerciciosConcluidos as jest.MockedFunction<
  typeof apiReal.exerciciosConcluidos
>;
const concluirExercicio = apiReal.concluirExercicio as jest.MockedFunction<
  typeof apiReal.concluirExercicio
>;

const CONCLUIDO = {
  trilha_slug: "logica",
  exercicio_slug: "media",
  xp: 50,
  criado_em: "2026-09-10T12:00:00Z",
};

function envolver({ children }: { children: ReactNode }) {
  return <ProvedorProgresso>{children}</ProvedorProgresso>;
}

beforeEach(() => {
  jest.clearAllMocks();
  temSessao.mockReturnValue(true);
  eu.mockResolvedValue(usuario());
  minhasCriaturas.mockResolvedValue([minhaCriatura({ ativa: true })]);
  meuProgresso.mockResolvedValue(progressoAtual());
  exerciciosConcluidos.mockResolvedValue([CONCLUIDO]);
  concluirExercicio.mockResolvedValue({
    ja_concluido: false,
    xp_ganho: 50,
    subiu_de_nivel: false,
    evoluiu: false,
    progresso: progressoAtual(),
  });
});

describe("ProvedorProgresso", () => {
  it("começa carregando e termina com identidade e conclusões juntas", async () => {
    const { result } = renderHook(() => useProgresso(), { wrapper: envolver });

    expect(result.current.carregando).toBe(true);

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.usuario).not.toBeNull();
    expect(result.current.criatura).not.toBeNull();
    expect(result.current.progresso).not.toBeNull();
    expect(result.current.concluidos).toEqual([CONCLUIDO]);
    expect(result.current.chaves.has("logica/media")).toBe(true);
  });

  it("pede as conclusões sem filtro de trilha", async () => {
    renderHook(() => useProgresso(), { wrapper: envolver });

    await waitFor(() => expect(exerciciosConcluidos).toHaveBeenCalled());
    expect(exerciciosConcluidos).toHaveBeenCalledWith();
  });

  it("sem sessão não vai à rede e para de carregar", async () => {
    temSessao.mockReturnValue(false);

    const { result } = renderHook(() => useProgresso(), { wrapper: envolver });

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(eu).not.toHaveBeenCalled();
    expect(exerciciosConcluidos).not.toHaveBeenCalled();
    expect(result.current.concluidos).toEqual([]);
    expect(result.current.usuario).toBeNull();
  });

  it("falha da API vira estado neutro, não navegação quebrada", async () => {
    meuProgresso.mockRejectedValue(new Error("sem conexão"));

    const { result } = renderHook(() => useProgresso(), { wrapper: envolver });

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.progresso).toBeNull();
    expect(result.current.concluidos).toEqual([]);
  });

  it("recarregar relê tudo, que é o que o POST de conclusão invalida", async () => {
    const { result } = renderHook(() => useProgresso(), { wrapper: envolver });
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(exerciciosConcluidos).toHaveBeenCalledTimes(1);
    expect(meuProgresso).toHaveBeenCalledTimes(1);

    exerciciosConcluidos.mockResolvedValue([
      CONCLUIDO,
      { ...CONCLUIDO, exercicio_slug: "trocar" },
    ]);
    result.current.recarregar();

    await waitFor(() =>
      expect(result.current.chaves.has("logica/trocar")).toBe(true),
    );
    expect(exerciciosConcluidos).toHaveBeenCalledTimes(2);
    // O XP da sidebar fica obsoleto junto: releitura é dos quatro, não só da lista.
    expect(meuProgresso).toHaveBeenCalledTimes(2);
  });

  it("vários consumidores dividem uma busca só", async () => {
    // Prova contra o código antigo: antes cada ilha chamava o próprio hook, e
    // três consumidores na mesma tela viravam três requisições.
    function Espia({ nome }: { nome: string }) {
      const { concluidos, carregando } = useProgresso();
      return (
        <span data-testid={nome}>{carregando ? "…" : concluidos.length}</span>
      );
    }

    render(
      <ProvedorProgresso>
        <Espia nome="a" />
        <Espia nome="b" />
        <Espia nome="c" />
      </ProvedorProgresso>,
    );

    await waitFor(() => expect(screen.getByTestId("a")).toHaveTextContent("1"));
    expect(screen.getByTestId("b")).toHaveTextContent("1");
    expect(screen.getByTestId("c")).toHaveTextContent("1");
    expect(exerciciosConcluidos).toHaveBeenCalledTimes(1);
    expect(eu).toHaveBeenCalledTimes(1);
  });

  it("fora do provedor reclama em vez de fingir que não há progresso", () => {
    // Estado neutro silencioso é o bug que este Context existe para matar.
    const silencio = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useProgresso())).toThrow(
      /precisa de <ProvedorProgresso>/,
    );

    silencio.mockRestore();
  });

  it("não remonta ao trocar o conteúdo da moldura", async () => {
    // O bloco de identidade piscava porque remontava a cada navegação. Com o
    // provedor no layout do route group, trocar de página troca só o filho.
    function Identidade() {
      const { usuario: u, carregando } = useProgresso();
      return <p>{carregando ? "carregando" : (u?.nickname ?? "visitante")}</p>;
    }

    const { rerender } = render(
      <ProvedorProgresso>
        <Identidade />
        <span>trilhas</span>
      </ProvedorProgresso>,
    );

    await waitFor(() =>
      expect(screen.queryByText("carregando")).not.toBeInTheDocument(),
    );
    const chamadas = eu.mock.calls.length;

    rerender(
      <ProvedorProgresso>
        <Identidade />
        <span>desafios</span>
      </ProvedorProgresso>,
    );

    expect(screen.getByText("desafios")).toBeInTheDocument();
    // Sem piscar: nunca volta a "carregando", e nenhuma busca nova.
    expect(screen.queryByText("carregando")).not.toBeInTheDocument();
    expect(eu).toHaveBeenCalledTimes(chamadas);
  });
});

describe("BotaoConclusao invalida o Context", () => {
  it("a lista e o XP são relidos depois de concluir", async () => {
    render(
      <ProvedorProgresso>
        <BotaoConclusao trilhaSlug="logica" faseSlug="trocar" />
      </ProvedorProgresso>,
    );

    await waitFor(() => expect(exerciciosConcluidos).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(concluirExercicio).toHaveBeenCalled());

    // Prova contra o código antigo: sem `recarregar()`, a segunda leitura nunca
    // acontece e a sidebar segue com o XP velho até um refresh manual.
    await waitFor(() => expect(exerciciosConcluidos).toHaveBeenCalledTimes(2));
    expect(meuProgresso).toHaveBeenCalledTimes(2);
  });
});
