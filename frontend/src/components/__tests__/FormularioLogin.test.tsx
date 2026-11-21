import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FormularioLogin } from "@/components/auth/FormularioLogin";
import { ErroApi } from "@/lib/api";

const empurrar = jest.fn();
const login = jest.fn();
const loginMfa = jest.fn();
const minhasCriaturas = jest.fn();
const reenviarVerificacao = jest.fn();
const aoDetectarPendente = jest.fn();

let mockBusca = "";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockBusca),
  useRouter: () => ({ push: (rota: string) => empurrar(rota) }),
}));

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    pedeMfa: real.pedeMfa,
    api: {
      login: (dados: unknown) => login(dados),
      loginMfa: (dados: unknown) => loginMfa(dados),
      minhasCriaturas: () => minhasCriaturas(),
      reenviarVerificacao: (email: string) => reenviarVerificacao(email),
    },
  };
});

const SENHA = "trilha-de-python-8";

beforeEach(() => {
  jest.clearAllMocks();
  mockBusca = "";
  reenviarVerificacao.mockResolvedValue(undefined);
});

async function entrar(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(screen.getByLabelText("E-MAIL"), "pendente@exemplo.com");
  await usuario.type(screen.getByLabelText("SENHA"), SENHA);
  await usuario.click(screen.getByRole("button", { name: "INICIAR SESSÃO" }));
}

function erroPendente() {
  return new ErroApi(400, "validacao", "Confirme seu e-mail antes de entrar.", [
    {
      field: "email",
      code: "email_nao_verificado",
      message: "Confirme seu e-mail antes de entrar.",
    },
  ]);
}

describe("FormularioLogin", () => {
  it("volta para a tela privada que mandou para o login", async () => {
    mockBusca = "volta=%2Fclas%2Fconvite%2Fabc";
    const usuario = userEvent.setup();
    login.mockResolvedValue({ access: "a", refresh: "r", usuario: {} });
    minhasCriaturas.mockResolvedValue([{ criatura: "x" }]);
    render(<FormularioLogin aoDetectarPendente={aoDetectarPendente} />);

    await entrar(usuario);

    await waitFor(() => expect(empurrar).toHaveBeenCalledWith("/clas/convite/abc"));
  });

  it("ignora volta para outro domínio", async () => {
    mockBusca = "volta=%2F%2Fgolpe.com";
    const usuario = userEvent.setup();
    login.mockResolvedValue({ access: "a", refresh: "r", usuario: {} });
    minhasCriaturas.mockResolvedValue([{ criatura: "x" }]);
    render(<FormularioLogin aoDetectarPendente={aoDetectarPendente} />);

    await entrar(usuario);

    await waitFor(() => expect(empurrar).toHaveBeenCalledWith("/trilhas"));
  });

  it("sem criatura, a escolha vem antes do destino", async () => {
    mockBusca = "volta=%2Franking";
    const usuario = userEvent.setup();
    login.mockResolvedValue({ access: "a", refresh: "r", usuario: {} });
    minhasCriaturas.mockResolvedValue([]);
    render(<FormularioLogin aoDetectarPendente={aoDetectarPendente} />);

    await entrar(usuario);

    await waitFor(() => expect(empurrar).toHaveBeenCalledWith("/escolher-criatura"));
  });

  it("com termo pendente, entra mesmo assim e o aviso de aceite assume", async () => {
    mockBusca = "volta=%2Franking";
    const usuario = userEvent.setup();
    login.mockResolvedValue({ access: "a", refresh: "r", usuario: {} });
    minhasCriaturas.mockRejectedValue(
      new ErroApi(403, "consentimento_pendente", "Aceite a nova versão."),
    );
    render(<FormularioLogin aoDetectarPendente={aoDetectarPendente} />);

    await entrar(usuario);

    await waitFor(() => expect(empurrar).toHaveBeenCalledWith("/ranking"));
    expect(screen.queryByText("Aceite a nova versão.")).toBeNull();
  });

  it("entra e vai para a escolha de criatura quando não tem nenhuma", async () => {
    const usuario = userEvent.setup();
    login.mockResolvedValue({ access: "a", refresh: "r", usuario: {} });
    minhasCriaturas.mockResolvedValue([]);
    render(<FormularioLogin aoDetectarPendente={aoDetectarPendente} />);

    await entrar(usuario);

    await waitFor(() =>
      expect(empurrar).toHaveBeenCalledWith("/escolher-criatura"),
    );
  });

  it("conta com e-mail pendente não entra: avisa o pai", async () => {
    const usuario = userEvent.setup();
    login.mockRejectedValue(erroPendente());
    render(<FormularioLogin aoDetectarPendente={aoDetectarPendente} />);

    await entrar(usuario);

    await waitFor(() =>
      expect(aoDetectarPendente).toHaveBeenCalledWith("pendente@exemplo.com"),
    );
    expect(empurrar).not.toHaveBeenCalled();
  });

  it("credencial errada mostra a mensagem genérica do servidor", async () => {
    const usuario = userEvent.setup();
    login.mockRejectedValue(
      new ErroApi(401, "credencial_invalida", "E-mail ou senha incorretos. Se errou várias vezes, espere alguns minutos ou redefina sua senha."),
    );
    render(<FormularioLogin aoDetectarPendente={aoDetectarPendente} />);

    await entrar(usuario);

    expect(await screen.findByText("E-mail ou senha incorretos. Se errou várias vezes, espere alguns minutos ou redefina sua senha.")).toBeInTheDocument();
    expect(aoDetectarPendente).not.toHaveBeenCalled();
  });

  it("com 2FA ativo, pede o código e só então entra", async () => {
    const usuario = userEvent.setup();
    login.mockResolvedValue({
      mfa_required: true,
      metodo: "APP",
      mfa_token: "token-curto",
    });
    loginMfa.mockResolvedValue({ usuario: {} });
    minhasCriaturas.mockResolvedValue([{ criatura: "x" }]);
    render(<FormularioLogin aoDetectarPendente={aoDetectarPendente} />);

    await entrar(usuario);

    const campo = await screen.findByLabelText("CÓDIGO");
    expect(empurrar).not.toHaveBeenCalled();

    await usuario.type(campo, "123456");
    await usuario.click(
      screen.getByRole("button", { name: "CONFIRMAR CÓDIGO" }),
    );

    await waitFor(() =>
      expect(loginMfa).toHaveBeenCalledWith({
        mfa_token: "token-curto",
        codigo: "123456",
      }),
    );
    await waitFor(() => expect(empurrar).toHaveBeenCalledWith("/trilhas"));
  });

  it("oferece redefinir a senha quando a credencial falha", async () => {
    const usuario = userEvent.setup();
    login.mockRejectedValue(
      new ErroApi(401, "credencial_invalida", "E-mail ou senha incorretos. Se errou várias vezes, espere alguns minutos ou redefina sua senha."),
    );
    render(<FormularioLogin aoDetectarPendente={aoDetectarPendente} />);

    await entrar(usuario);

    expect(
      await screen.findByRole("link", { name: "REDEFINIR MINHA SENHA" }),
    ).toHaveAttribute("href", "/recuperar-senha");
  });
});
