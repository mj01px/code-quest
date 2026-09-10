import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PainelCadastro } from "@/components/auth/PainelCadastro";

const documentosLegais = jest.fn();
const registrar = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    api: {
      documentosLegais: () => documentosLegais(),
      registrar: (dados: unknown) => registrar(dados),
      reenviarVerificacao: jest.fn().mockResolvedValue(undefined),
    },
  };
});

const DOCUMENTOS = {
  termos: {
    documento: "TERMOS",
    rotulo: "Termos de Uso",
    versao: "1.0",
    vigente_desde: "2026-09-08",
    caminho: "/termos",
  },
  privacidade: {
    documento: "PRIVACIDADE",
    rotulo: "Política de Privacidade",
    versao: "1.0",
    vigente_desde: "2026-09-08",
    caminho: "/privacidade",
  },
};

const SENHA = "trilha-de-python-8";

beforeEach(() => {
  jest.clearAllMocks();
  documentosLegais.mockResolvedValue(DOCUMENTOS);
  registrar.mockResolvedValue({ usuario: {}, email_enviado: true });
});

async function cadastrar(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(screen.getByLabelText("E-MAIL"), "novato@exemplo.com");
  await usuario.type(screen.getByLabelText("NICKNAME"), "novato");
  await usuario.type(screen.getByLabelText("SENHA"), SENHA);
  await usuario.click(screen.getByRole("checkbox"));
  await usuario.click(screen.getByRole("button", { name: "CRIAR CONTA" }));
}

describe("PainelCadastro", () => {
  it("mostra a chamada de venda enquanto a conta não existe", async () => {
    render(<PainelCadastro />);

    expect(await screen.findByText("Desenvolva-se")).toBeInTheDocument();
    expect(screen.getByText("JÁ TEM CONTA?")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "ACESSAR SISTEMA" }),
    ).toBeInTheDocument();
  });

  it("troca o formulário pelo aviso de e-mail depois de cadastrar", async () => {
    const usuario = userEvent.setup();
    render(<PainelCadastro />);
    await waitFor(() => expect(screen.getByRole("checkbox")).toBeEnabled());

    await cadastrar(usuario);

    expect(
      await screen.findByRole("heading", { name: "CONFIRME SEU E-MAIL" }),
    ).toBeInTheDocument();
    expect(screen.getByText("novato@exemplo.com")).toBeInTheDocument();
    expect(screen.queryByLabelText("NICKNAME")).not.toBeInTheDocument();
  });

  it("some com o convite de criar conta, que já não faz sentido", async () => {
    const usuario = userEvent.setup();
    render(<PainelCadastro />);
    await waitFor(() => expect(screen.getByRole("checkbox")).toBeEnabled());

    await cadastrar(usuario);
    await screen.findByRole("heading", { name: "CONFIRME SEU E-MAIL" });

    expect(screen.queryByText("Desenvolva-se")).not.toBeInTheDocument();
    expect(screen.queryByText(/Crie sua conta para salvar/)).not.toBeInTheDocument();
    expect(screen.queryByText("JÁ TEM CONTA?")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "ACESSAR SISTEMA" }),
    ).not.toBeInTheDocument();
  });

  it("o aviso ocupa o card inteiro: nem o sprite sobra", async () => {
    const usuario = userEvent.setup();
    render(<PainelCadastro />);
    await waitFor(() => expect(screen.getByRole("checkbox")).toBeEnabled());
    expect(
      screen.getByAltText("Ovo do CodeQuest rachando"),
    ).toBeInTheDocument();

    await cadastrar(usuario);
    await screen.findByRole("heading", { name: "CONFIRME SEU E-MAIL" });

    expect(
      screen.queryByAltText("Ovo do CodeQuest rachando"),
    ).not.toBeInTheDocument();
  });

  it("avisa quando a conta nasceu mas o e-mail não saiu", async () => {
    const usuario = userEvent.setup();
    registrar.mockResolvedValue({ usuario: {}, email_enviado: false });
    render(<PainelCadastro />);
    await waitFor(() => expect(screen.getByRole("checkbox")).toBeEnabled());

    await cadastrar(usuario);

    expect(
      await screen.findByText(/não conseguimos enviar o e-mail agora/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "REENVIAR E-MAIL" }),
    ).toBeInTheDocument();
  });
});
