import { render, screen, within } from "@testing-library/react";

import { TelaQuestCompleta } from "@/components/trilhas/TelaQuestCompleta";
import type { ConclusaoDaTrilha } from "@/lib/types";

const mockConclusao = jest.fn();

jest.mock("@/lib/api", () => ({
  api: { conclusaoDaTrilha: (slug: string) => mockConclusao(slug) },
}));

jest.mock("@/components/progresso/ProvedorProgresso", () => ({
  useProgresso: () => ({
    criatura: {
      criatura: { nome: "Slyth" },
      sprite: "/criaturas/slyth_stage_1.png",
    },
    progresso: {
      nivel: { numero: 12, titulo: "", xp_necessario: 0 },
      xp_no_nivel: 900,
      xp_para_o_proximo: 1200,
    },
  }),
}));

const CONCLUIDA: ConclusaoDaTrilha = {
  trilha: { slug: "logica", nome: "Lógica de Programação" },
  concluida: true,
  fases_feitas: 10,
  fases_total: 10,
  xp: 450,
  acerto_de_primeira: 80,
  dias_de_estudo: 3,
  conquistas: [
    {
      slug: "primeiro",
      nome: "Primeiro passo",
      descricao: "Concluiu a primeira fase",
      icone: "chama",
    },
  ],
  proxima: {
    slug: "python",
    nome: "Python",
    resumo: "Da sintaxe às estruturas",
    dificuldade_label: "Iniciante",
  },
};

beforeEach(() => {
  mockConclusao.mockReset().mockResolvedValue(CONCLUIDA);
});

describe("TelaQuestCompleta", () => {
  it("comemora a trilha completa com o pet, o nível e os números", async () => {
    render(<TelaQuestCompleta trilhaSlug="logica" />);

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "QUESTCOMPLETA",
    );
    expect(
      screen.getByText("Trilha concluída · Lógica de Programação"),
    ).toBeInTheDocument();
    expect(screen.getByAltText("Slyth")).toBeInTheDocument();
    expect(
      screen.getByText(/10 fases vencidas\. Slyth está no nível 12\./),
    ).toBeInTheDocument();
    expect(screen.getByText("900 / 1200 XP")).toBeInTheDocument();
    expect(screen.getByText("10 / 10")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("3 dias")).toBeInTheDocument();
    expect(mockConclusao).toHaveBeenCalledWith("logica");
  });

  it("mostra as conquistas, a próxima trilha e não oferece certificado", async () => {
    render(<TelaQuestCompleta trilhaSlug="logica" />);

    const conquistas = await screen.findByRole("region", {
      name: "Conquistas desbloqueadas",
    });
    expect(within(conquistas).getByText("Primeiro passo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver trilha" })).toHaveAttribute(
      "href",
      "/trilhas/python",
    );
    expect(
      screen.getByRole("link", { name: "Voltar às trilhas" }),
    ).toHaveAttribute("href", "/trilhas");
    expect(screen.queryByText(/certificado/i)).toBeNull();
  });

  it("sem envio nem quiz mostra o acerto de primeira como traço", async () => {
    mockConclusao.mockResolvedValue({
      ...CONCLUIDA,
      acerto_de_primeira: null,
      conquistas: [],
      proxima: null,
    });
    render(<TelaQuestCompleta trilhaSlug="logica" />);

    expect(await screen.findByText("—")).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Conquistas desbloqueadas" }),
    ).toBeNull();
    expect(screen.queryByRole("link", { name: "Ver trilha" })).toBeNull();
  });

  it("trilha pela metade avisa quantas fases faltam", async () => {
    mockConclusao.mockResolvedValue({
      ...CONCLUIDA,
      concluida: false,
      fases_feitas: 7,
    });
    render(<TelaQuestCompleta trilhaSlug="logica" />);

    expect(
      await screen.findByText(/Faltam 3 fases para completar/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voltar para a trilha" }),
    ).toHaveAttribute("href", "/trilhas/logica");
  });
});
