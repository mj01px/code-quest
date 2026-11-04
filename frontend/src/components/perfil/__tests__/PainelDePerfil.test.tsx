import { render, screen, within } from "@testing-library/react";

import { PainelDePerfil } from "@/components/perfil/PainelDePerfil";
import { ErroApi, api } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  api: { perfilPublico: jest.fn() },
}));

let usuarioLogado: { nickname: string } | null = null;

jest.mock("@/components/progresso/ProvedorProgresso", () => ({
  useProgresso: () => ({ usuario: usuarioLogado }),
}));

const perfilPublico = api.perfilPublico as jest.MockedFunction<
  typeof api.perfilPublico
>;

beforeEach(() => {
  jest.clearAllMocks();
  usuarioLogado = null;
});

describe("PainelDePerfil", () => {
  it("mostra criatura, nível, XP e as conquistas", async () => {
    perfilPublico.mockResolvedValue({
      nickname: "ana",
      criatura: { nome: "Shellby", sprite: null },
      nivel: 4,
      xp_total: 320,
      conquistas: [
        {
          slug: "primeiro-passo",
          nome: "Primeiro passo",
          descricao: "Concluiu o primeiro exercício.",
          icone: "ovo",
          desbloqueada_em: "2026-10-05T12:00:00Z",
        },
      ],
    });

    render(<PainelDePerfil nickname="ana" />);

    const resumo = await screen.findByRole("region", {
      name: "Resumo do codificador",
    });
    expect(resumo).toHaveTextContent("Shellby");
    expect(resumo).toHaveTextContent("NV 4");
    expect(resumo).toHaveTextContent("320 XP");
    const vitrine = screen.getByRole("region", {
      name: "Vitrine de conquistas",
    });
    expect(within(vitrine).getByText("Primeiro passo")).toBeInTheDocument();
    expect(perfilPublico).toHaveBeenCalledWith("ana");
  });

  it("monta a vitrine com obtidas, bloqueadas e secretas, e as trilhas", async () => {
    perfilPublico.mockResolvedValue({
      nickname: "ana",
      criatura: { nome: "Shellby", sprite: null },
      nivel: 2,
      xp_total: 150,
      xp_no_nivel: 50,
      xp_para_o_proximo: 200,
      titulo_do_nivel: "Aprendiz",
      membro_desde: "2026-10-01",
      cla: "Os Bugados",
      sequencia_atual: 3,
      sequencia_recorde: 5,
      total_conquistas: 3,
      conquistas: [],
      conquistas_bloqueadas: [
        {
          slug: "maratonista",
          nome: "Maratonista",
          icone: "chama",
          oculta: false,
        },
        { slug: "segredo", nome: "???", icone: "", oculta: true },
      ],
      trilhas: [{ slug: "logica", nome: "Lógica", percentual: 50 }],
    });

    render(<PainelDePerfil nickname="ana" />);

    const resumo = await screen.findByRole("region", {
      name: "Resumo do codificador",
    });
    expect(resumo).toHaveTextContent("Aprendiz");
    expect(resumo).toHaveTextContent("Clã Os Bugados");
    expect(resumo).not.toHaveTextContent("faltam");
    expect(resumo).toHaveTextContent("3 dias");
    expect(resumo).toHaveTextContent("0/3");
    const vitrine = screen.getByRole("region", {
      name: "Vitrine de conquistas",
    });
    expect(within(vitrine).getByText("Bloqueada")).toBeInTheDocument();
    expect(within(vitrine).getByText("Secreta")).toBeInTheDocument();
    expect(
      within(vitrine).queryByRole("link", { name: /Ver todas/ }),
    ).not.toBeInTheDocument();
    const trilhas = screen.getByRole("region", {
      name: "Trilhas em andamento",
    });
    expect(within(trilhas).getByText("50%")).toBeInTheDocument();
  });

  it("no próprio perfil oferece ver todas as conquistas", async () => {
    usuarioLogado = { nickname: "ana" };
    perfilPublico.mockResolvedValue({
      nickname: "ana",
      criatura: null,
      nivel: null,
      xp_total: 0,
      conquistas: [],
    });

    render(<PainelDePerfil nickname="ana" />);

    expect(
      await screen.findByRole("link", { name: /Ver todas/ }),
    ).toHaveAttribute("href", "/conquistas");
  });

  it("avisa quando o nickname não existe", async () => {
    perfilPublico.mockRejectedValue(
      new ErroApi(404, "not_found", "Perfil não encontrado."),
    );

    render(<PainelDePerfil nickname="ninguem" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nenhum codificador com esse nickname.",
    );
  });
});
