import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FormularioLogin } from "@/components/auth/FormularioLogin";
import { ErroApi } from "@/lib/api";

const empurrar = jest.fn();
const login = jest.fn();
const minhasCriaturas = jest.fn();
const reenviarVerificacao = jest.fn();
const aoDetectarPendente = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: (rota: string) => empurrar(rota) }),
}));

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    api: {
      login: (dados: unknown) => login(dados),
      minhasCriaturas: () => minhasCriaturas(),
      reenviarVerificacao: (email: string) => reenviarVerificacao(email),
    },
  };
});

const SENHA = "trilha-de-python-8";

beforeEach(() => {
  jest.clearAllMocks();
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
