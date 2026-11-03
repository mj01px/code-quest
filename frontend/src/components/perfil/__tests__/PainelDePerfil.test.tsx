import { render, screen, within } from "@testing-library/react";

import { PainelDePerfil } from "@/components/perfil/PainelDePerfil";
import { ErroApi, api } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  api: { perfilPublico: jest.fn() },
}));

const perfilPublico = api.perfilPublico as jest.MockedFunction<typeof api.perfilPublico>;

beforeEach(() => {
  jest.clearAllMocks();
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

    const progresso = await screen.findByRole("region", { name: "Criatura e progresso" });
    expect(progresso).toHaveTextContent("Shellby");
    expect(progresso).toHaveTextContent("4");
    expect(progresso).toHaveTextContent("320 XP");
    const conquistas = screen.getByRole("region", { name: "Conquistas (1)" });
    expect(within(conquistas).getByText("Primeiro passo")).toBeInTheDocument();
    expect(perfilPublico).toHaveBeenCalledWith("ana");
  });

  it("avisa quando o nickname não existe", async () => {
    perfilPublico.mockRejectedValue(new ErroApi(404, "not_found", "Perfil não encontrado."));

    render(<PainelDePerfil nickname="ninguem" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nenhum codificador com esse nickname.",
    );
  });
});
