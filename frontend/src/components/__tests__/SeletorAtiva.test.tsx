import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SeletorAtiva } from "@/components/criaturas/SeletorAtiva";
import { ErroApi } from "@/lib/api";
import type { Criatura, MinhaCriatura } from "@/lib/types";

const empurrar = jest.fn();
const minhasCriaturas = jest.fn();
const definirCriaturaAtiva = jest.fn();
const temSessao = jest.fn();

const mockRoteador = { replace: (rota: string) => empurrar(rota) };

jest.mock("next/navigation", () => ({
  useRouter: () => mockRoteador,
}));

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    temSessao: () => temSessao(),
    api: {
      minhasCriaturas: () => minhasCriaturas(),
      definirCriaturaAtiva: (slug: string) => definirCriaturaAtiva(slug),
    },
  };
});

function criatura(slug: string, nome: string): Criatura {
  return {
    slug,
    nome,
    especie: "Dragão",
    dominio: "WEB",
    dominio_rotulo: "Web",
    chamada: "Solta fogo em JavaScript.",
    tipo: "JavaScript / Fogo",
    descricao: "Companheiro de quem encara o front.",
    atributo_nome: "Ímpeto",
    atributo_valor: 7,
    cor_base: "#f97316",
    cor_contorno: "#7c2d12",
    cor_acento: "#fbbf24",
    disponivel: true,
    ordem: 1,
    estagios: [],
  };
}

function posse(slug: string, nome: string, ativa: boolean): MinhaCriatura {
  return {
    id: slug === "blaze" ? 1 : 2,
    criatura: criatura(slug, nome),
    estagio_atual: 1,
    inicial: slug === "blaze",
    ativa,
    adquirida_em: "2026-09-09T12:00:00Z",
    evoluiu_em: null,
    sprite: null,
    proximo_estagio: 2,
    nivel_para_evoluir: 10,
    pode_evoluir: false,
    nivel: 1,
  };
}

const BLAZE_ATIVA = posse("blaze", "Blaze", true);
const SHELLBY_RESERVA = posse("shellby", "Shellby", false);

beforeEach(() => {
  jest.clearAllMocks();
  temSessao.mockReturnValue(true);
  definirCriaturaAtiva.mockResolvedValue(SHELLBY_RESERVA);
});

describe("SeletorAtiva", () => {
  it("com uma criatura só, não oferece troca", async () => {
    minhasCriaturas.mockResolvedValue([BLAZE_ATIVA]);

    render(<SeletorAtiva />);

    expect(await screen.findByText("Blaze")).toBeInTheDocument();
    expect(screen.getByText("ATIVA")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "TORNAR ATIVA" }),
    ).not.toBeInTheDocument();
  });

  it("com duas, marca a ativa e oferece trocar na reserva", async () => {
    minhasCriaturas.mockResolvedValue([BLAZE_ATIVA, SHELLBY_RESERVA]);

    render(<SeletorAtiva />);

    expect(await screen.findByText("ATIVA")).toBeInTheDocument();
    expect(screen.getByText("RESERVA")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "TORNAR ATIVA" }),
    ).toHaveLength(1);
  });

  it("diz que a ativa é quem recebe XP", async () => {
    minhasCriaturas.mockResolvedValue([BLAZE_ATIVA, SHELLBY_RESERVA]);

    render(<SeletorAtiva />);

    expect(await screen.findByText("RECEBENDO XP")).toBeInTheDocument();
  });

  it("troca a ativa e recarrega a lista", async () => {
    const usuario = userEvent.setup();
    minhasCriaturas
      .mockResolvedValueOnce([BLAZE_ATIVA, SHELLBY_RESERVA])
      .mockResolvedValueOnce([
        posse("shellby", "Shellby", true),
        posse("blaze", "Blaze", false),
      ]);
    render(<SeletorAtiva />);
    await screen.findByText("Shellby");

    await usuario.click(screen.getByRole("button", { name: "TORNAR ATIVA" }));

    await waitFor(() =>
      expect(definirCriaturaAtiva).toHaveBeenCalledWith("shellby"),
    );
    await waitFor(() => expect(minhasCriaturas).toHaveBeenCalledTimes(2));
  });

  it("mostra o erro que vem do servidor", async () => {
    const usuario = userEvent.setup();
    minhasCriaturas.mockResolvedValue([BLAZE_ATIVA, SHELLBY_RESERVA]);
    definirCriaturaAtiva.mockRejectedValue(
      new ErroApi(400, "validacao", "Você não possui esta criatura.", []),
    );
    render(<SeletorAtiva />);
    await screen.findByText("Shellby");

    await usuario.click(screen.getByRole("button", { name: "TORNAR ATIVA" }));

    expect(
      await screen.findByText("Você não possui esta criatura."),
    ).toBeInTheDocument();
  });

  it("sem criatura nenhuma, manda escolher a inicial", async () => {
    minhasCriaturas.mockResolvedValue([]);

    render(<SeletorAtiva />);

    expect(
      await screen.findByRole("link", { name: "ESCOLHER CRIATURA" }),
    ).toHaveAttribute("href", "/escolher-criatura");
  });

  it("sem sessão, vai para o login sem chamar a API", () => {
    temSessao.mockReturnValue(false);

    render(<SeletorAtiva />);

    expect(empurrar).toHaveBeenCalledWith("/entrar");
    expect(minhasCriaturas).not.toHaveBeenCalled();
  });

  it("401 no carregamento também manda para o login", async () => {
    minhasCriaturas.mockRejectedValue(
      new ErroApi(401, "nao_autenticado", "sem sessão"),
    );

    render(<SeletorAtiva />);

    await waitFor(() => expect(empurrar).toHaveBeenCalledWith("/entrar"));
  });
});
