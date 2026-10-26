import { render, screen, within } from "@testing-library/react";

import { PainelDeRanking } from "@/components/ranking/PainelDeRanking";
import { api } from "@/lib/api";
import type { LinhaDoRanking, RankingMensal } from "@/lib/types";

jest.mock("@/lib/api", () => ({
  api: { rankingMensal: jest.fn() },
}));

const rankingMensal = api.rankingMensal as jest.MockedFunction<
  typeof api.rankingMensal
>;

function linha(posicao: number, nickname: string, xp: number, voce = false): LinhaDoRanking {
  return { posicao, nickname, xp, criatura: null, voce };
}

function ranking(extra: Partial<RankingMensal> = {}): RankingMensal {
  return {
    mes: {
      inicio: "2026-10-01",
      fim: "2026-10-31",
      fecha_em: "2026-11-01T03:00:00Z",
    },
    topo: [linha(1, "lider", 100), linha(2, "vice", 60), linha(3, "terceiro", 50)],
    voce: {
      nickname: "kiuev",
      criatura: null,
      posicao: 14,
      xp: 20,
      faltam_para_subir: 6,
      podios: 2,
      vitorias: 1,
    },
    ...extra,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PainelDeRanking", () => {
  it("mostra o top do mês e, separada, a minha posição", async () => {
    rankingMensal.mockResolvedValue(ranking());

    render(<PainelDeRanking />);

    const topo = await screen.findByRole("region", { name: "Top 10 do mês" });
    expect(within(topo).getAllByRole("listitem")).toHaveLength(3);
    expect(within(topo).queryByText("kiuev")).toBeNull();
    expect(screen.getByText("outubro de 2026")).toBeInTheDocument();

    const minha = screen.getByRole("region", { name: "Sua posição" });
    expect(minha).toHaveTextContent("14º");
    expect(minha).toHaveTextContent("kiuev");
    expect(minha).toHaveTextContent("Faltam 6 XP pro 13º");
    expect(within(minha).getByLabelText("2 no pódio, 1 em 1º")).toBeInTheDocument();
  });

  it("mostra o mês vazio e convida a pontuar", async () => {
    rankingMensal.mockResolvedValue(
      ranking({
        topo: [],
        voce: {
          nickname: "kiuev",
          criatura: null,
          posicao: null,
          xp: 0,
          faltam_para_subir: null,
          podios: 0,
          vitorias: 0,
        },
      })
    );

    render(<PainelDeRanking />);

    expect(
      await screen.findByText("Ninguém pontuou neste mês ainda.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Top 10 do mês" })).toBeNull();
    expect(screen.getByRole("region", { name: "Sua posição" })).toHaveTextContent(
      "Conclua um exercício para entrar no ranking do mês"
    );
  });

  it("avisa quando a API falha", async () => {
    rankingMensal.mockRejectedValue(new Error("fora do ar"));

    render(<PainelDeRanking />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar o ranking agora."
    );
  });
});
