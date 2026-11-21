import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AvisoConsentimento } from "@/components/legal/AvisoConsentimento";
import { avisarConsentimentoPendente, recarregarPagina } from "@/lib/consentimento";
import type { Consentimento } from "@/lib/types";

const navegar = { replace: jest.fn(), refresh: jest.fn() };
let caminho = "/trilhas";

jest.mock("next/navigation", () => ({
  useRouter: () => navegar,
  usePathname: () => caminho,
}));

let usuario: { id: string } | null = { id: "u1" };

jest.mock("@/components/progresso/ProvedorProgresso", () => ({
  useProgresso: () => ({ usuario }),
}));

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  temSessao: () => true,
  api: {
    consentimentos: jest.fn(),
    aceitarConsentimentos: jest.fn(),
    sair: jest.fn(),
  },
}));

jest.mock("@/lib/consentimento", () => ({
  ...jest.requireActual("@/lib/consentimento"),
  recarregarPagina: jest.fn(),
}));

const mock = jest.requireMock<{ api: Record<string, jest.Mock> }>("@/lib/api");

const PENDENTE: Consentimento = {
  documento: "TERMOS",
  rotulo: "Termos de Uso",
  versao_vigente: "1.4",
  versao_aceita: "1.3",
  caminho: "/termos",
  pendente: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  caminho = "/trilhas";
  usuario = { id: "u1" };
  mock.api.consentimentos.mockResolvedValue([PENDENTE]);
  mock.api.aceitarConsentimentos.mockResolvedValue([{ ...PENDENTE, pendente: false }]);
  mock.api.sair.mockResolvedValue(undefined);
});

describe("AvisoConsentimento", () => {
  it("não tem como fechar sem decidir", async () => {
    render(<AvisoConsentimento />);

    const modal = await screen.findByRole("alertdialog");
    expect(modal).toHaveTextContent("obrigatório");
    expect(screen.getByRole("link", { name: "Termos de Uso" })).toHaveAttribute(
      "href",
      "/termos?versao=1.4",
    );
    expect(screen.queryByRole("button", { name: /cancelar|fechar/i })).toBeNull();

    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("aceitar registra o aceite, fecha e recarrega os dados", async () => {
    render(<AvisoConsentimento />);

    await userEvent.click(await screen.findByRole("button", { name: "LI E ACEITO" }));

    expect(mock.api.aceitarConsentimentos).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(recarregarPagina).toHaveBeenCalled();
  });

  it("abre mesmo quando os dados do usuário não carregaram por causa do bloqueio", async () => {
    usuario = null;
    render(<AvisoConsentimento />);

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
  });

  it("quem não aceita sai da conta", async () => {
    render(<AvisoConsentimento />);

    await userEvent.click(await screen.findByRole("button", { name: "SAIR DA CONTA" }));

    expect(mock.api.sair).toHaveBeenCalled();
    expect(navegar.replace).toHaveBeenCalledWith("/entrar");
    expect(mock.api.aceitarConsentimentos).not.toHaveBeenCalled();
  });

  it("deixa a tela de configurações aberta para exportar ou excluir a conta", async () => {
    caminho = "/configuracoes";
    render(<AvisoConsentimento />);

    await waitFor(() => expect(mock.api.consentimentos).toHaveBeenCalled());
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("reaparece quando a API bloqueia por consentimento pendente", async () => {
    mock.api.consentimentos.mockResolvedValueOnce([]);
    render(<AvisoConsentimento />);
    await waitFor(() => expect(mock.api.consentimentos).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alertdialog")).toBeNull();

    act(() => avisarConsentimentoPendente());

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
  });
});
