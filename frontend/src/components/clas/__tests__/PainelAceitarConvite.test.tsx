import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PainelAceitarConvite } from "@/components/clas/PainelAceitarConvite";
import type { MeuCla, PreviaConvite } from "@/lib/types";

const empurrar = jest.fn();
const previaConvite = jest.fn();
const meuCla = jest.fn();
const aceitarConvite = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: (rota: string) => empurrar(rota) }),
}));

jest.mock("@/components/progresso/ProvedorProgresso", () => ({
  useProgresso: () => ({ usuario: { nickname: "novato" } }),
}));

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    api: {
      previaConvite: (t: string) => previaConvite(t),
      meuCla: () => meuCla(),
      aceitarConvite: (t: string) => aceitarConvite(t),
    },
  };
});

const previa: PreviaConvite = {
  tag: "SEGREDO1",
  nome: "Secretos",
  descricao: "Clã fechado de quem curte Python.",
  bandeira: "guilda_1",
  bandeira_rotulo: "Guilda 1",
  tipo: "PRIVADO",
  tipo_rotulo: "Privado",
  nivel_minimo: 5,
  total_membros: 2,
  criado_em: "2026-10-01T12:00:00Z",
  membros: [
    {
      id: "m1",
      nickname: "lider",
      cargo: "LIDER",
      cargo_rotulo: "Líder",
      entrou_em: "2026-10-01T12:00:00Z",
    },
    {
      id: "m2",
      nickname: "ana",
      cargo: "MEMBRO",
      cargo_rotulo: "Membro",
      entrou_em: "2026-10-02T12:00:00Z",
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  previaConvite.mockResolvedValue(previa);
  meuCla.mockResolvedValue(null);
});

describe("PainelAceitarConvite", () => {
  it("mostra o clã ao fundo, fora do alcance, e o convite num modal", async () => {
    render(<PainelAceitarConvite token="tok" />);

    const dialogo = await screen.findByRole("dialog", { name: "Secretos" });
    expect(within(dialogo).getByText("Você foi convidado")).toBeInTheDocument();
    expect(within(dialogo).getByText("2/50 MEMBROS")).toBeInTheDocument();

    expect(
      screen.getByText("Clã fechado de quem curte Python."),
    ).toBeInTheDocument();
    expect(screen.getByText("lider")).toBeInTheDocument();
    const fundo = screen
      .getByText("Clã fechado de quem curte Python.")
      .closest("[inert]");
    expect(fundo).toHaveAttribute("aria-hidden", "true");
  });

  it("entrar aceita o convite e vai para o clã", async () => {
    aceitarConvite.mockResolvedValue({ cla: { tag: "SEGREDO1" } });
    render(<PainelAceitarConvite token="tok" />);

    await userEvent.click(
      await screen.findByRole("button", { name: "ENTRAR NO CLÃ" }),
    );

    expect(aceitarConvite).toHaveBeenCalledWith("tok");
    await waitFor(() =>
      expect(empurrar).toHaveBeenCalledWith("/clas/SEGREDO1"),
    );
  });

  it("agora não e Esc voltam para a lista de clãs", async () => {
    render(<PainelAceitarConvite token="tok" />);

    await userEvent.click(
      await screen.findByRole("button", { name: "AGORA NÃO" }),
    );
    expect(empurrar).toHaveBeenLastCalledWith("/clas");

    await userEvent.keyboard("{Escape}");
    expect(empurrar).toHaveBeenCalledTimes(2);
  });

  it("quem já tem clã vê o aviso e não consegue entrar", async () => {
    meuCla.mockResolvedValue({ cla: { nome: "Outro clã" } } as MeuCla);
    render(<PainelAceitarConvite token="tok" />);

    expect(await screen.findByText("Outro clã")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "ENTRAR NO CLÃ" }),
    ).toBeDisabled();
  });

  it("convite inválido mostra o aviso sem fundo nem modal", async () => {
    const { ErroApi } =
      jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
    previaConvite.mockRejectedValue(
      new ErroApi(404, "nao_encontrado", "Não encontrado."),
    );
    render(<PainelAceitarConvite token="tok" />);

    expect(
      await screen.findByText(/Convite inválido ou expirado/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
