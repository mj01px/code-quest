import { act, render, screen, waitFor } from "@testing-library/react";

import {
  AvisoDeConquista,
  TEMPO_DA_SAIDA,
  TEMPO_NA_TELA,
} from "@/components/conquistas/AvisoDeConquista";
import { api, temSessao } from "@/lib/api";
import { avisarConquistas } from "@/lib/conquistas";
import { conquista } from "@/components/__tests__/fixtures";

jest.mock("next/navigation", () => ({
  usePathname: () => "/trilhas",
}));

jest.mock("@/components/progresso/ProvedorProgresso", () => ({
  useProgresso: () => ({ progresso: null }),
}));

jest.mock("@/lib/api", () => ({
  temSessao: jest.fn(),
  api: {
    minhasConquistas: jest.fn(),
    marcarConquistasVistas: jest.fn(),
  },
}));

const sessao = temSessao as jest.MockedFunction<typeof temSessao>;
const minhasConquistas = api.minhasConquistas as jest.MockedFunction<
  typeof api.minhasConquistas
>;
const marcarVistas = api.marcarConquistasVistas as jest.MockedFunction<
  typeof api.marcarConquistasVistas
>;

beforeEach(() => {
  jest.clearAllMocks();
  sessao.mockReturnValue(true);
  marcarVistas.mockResolvedValue(undefined);
});

describe("AvisoDeConquista", () => {
  it("mostra a conquista nova e marca como vista", async () => {
    minhasConquistas.mockResolvedValue([
      conquista({ desbloqueada: true }),
      conquista({ slug: "explorador", nome: "Explorador" }),
    ]);

    render(<AvisoDeConquista />);

    expect(await screen.findByText("CONQUISTA DESBLOQUEADA")).toBeInTheDocument();
    expect(screen.getByText("Hello, World!")).toBeInTheDocument();
    expect(screen.queryByText("Explorador")).not.toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/conquistas");
    await waitFor(() => expect(marcarVistas).toHaveBeenCalledTimes(1));
  });

  it("não chama a API sem sessão", () => {
    sessao.mockReturnValue(false);

    render(<AvisoDeConquista />);

    expect(minhasConquistas).not.toHaveBeenCalled();
  });

  it("sem novidade não mostra nada nem marca vistas", async () => {
    minhasConquistas.mockResolvedValue([
      conquista({ desbloqueada: true, vista: true }),
    ]);

    render(<AvisoDeConquista />);

    await waitFor(() => expect(minhasConquistas).toHaveBeenCalled());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(marcarVistas).not.toHaveBeenCalled();
  });

  it("mostra uma de cada vez, em fila", async () => {
    jest.useFakeTimers();
    minhasConquistas.mockResolvedValue([
      conquista({ desbloqueada: true }),
      conquista({ slug: "explorador", nome: "Explorador", desbloqueada: true }),
    ]);

    render(<AvisoDeConquista />);

    expect(await screen.findByText("Hello, World!")).toBeInTheDocument();
    expect(screen.queryByText("Explorador")).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(TEMPO_NA_TELA + TEMPO_DA_SAIDA);
    });

    expect(screen.getByText("Explorador")).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("reavalia quando outra tela avisa e não repete o que já mostrou", async () => {
    minhasConquistas.mockResolvedValue([conquista({ desbloqueada: true })]);

    render(<AvisoDeConquista />);
    await screen.findByText("Hello, World!");

    minhasConquistas.mockResolvedValue([
      conquista({ desbloqueada: true }),
      conquista({
        slug: "roda-na-minha-maquina",
        nome: "Roda na Minha Máquina",
        desbloqueada: true,
      }),
    ]);

    act(() => {
      avisarConquistas();
    });

    await waitFor(() => expect(minhasConquistas).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(marcarVistas).toHaveBeenCalledTimes(2));
    expect(screen.getAllByText("Hello, World!")).toHaveLength(1);
  });
});
