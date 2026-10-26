import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SecaoSeguranca } from "@/components/configuracoes/SecaoSeguranca";

jest.mock("@/lib/api", () => {
  class ErroApi extends Error {
    constructor(
      mensagem: string,
      private campos: Record<string, string>,
    ) {
      super(mensagem);
    }
    porCampo() {
      return this.campos;
    }
  }
  return {
    ErroApi,
    api: {
      mfaStatus: jest.fn(),
      mfaIniciar: jest.fn(),
      mfaConfirmar: jest.fn(),
    },
  };
});

const mock = jest.requireMock<{
  ErroApi: new (m: string, c: Record<string, string>) => Error;
  api: { mfaStatus: jest.Mock; mfaIniciar: jest.Mock; mfaConfirmar: jest.Mock };
}>("@/lib/api");

beforeEach(() => {
  jest.clearAllMocks();
  mock.api.mfaStatus.mockResolvedValue({ ativo: false, metodo: "" });
  mock.api.mfaIniciar.mockResolvedValue({ enviado: true });
});

async function chegarNaConfirmacao() {
  render(<SecaoSeguranca />);
  await userEvent.click(await screen.findByRole("button", { name: "ATIVAR 2FA" }));
  await userEvent.click(screen.getByRole("button", { name: "CÓDIGO POR E-MAIL" }));
  await userEvent.type(await screen.findByLabelText("CÓDIGO"), "123456");
}

describe("SecaoSeguranca: ativar 2FA pede a senha atual", () => {
  it("sem senha não chama a API", async () => {
    await chegarNaConfirmacao();
    await userEvent.click(screen.getByRole("button", { name: "CONFIRMAR" }));

    expect(screen.getByText("Digite sua senha atual.")).toBeInTheDocument();
    expect(mock.api.mfaConfirmar).not.toHaveBeenCalled();
  });

  it("envia o código junto com a senha", async () => {
    mock.api.mfaConfirmar.mockResolvedValue({ codigos_recuperacao: ["a", "b"] });
    await chegarNaConfirmacao();
    await userEvent.type(screen.getByLabelText("SENHA ATUAL"), "Senha-certa-1");
    await userEvent.click(screen.getByRole("button", { name: "CONFIRMAR" }));

    expect(mock.api.mfaConfirmar).toHaveBeenCalledWith("123456", "Senha-certa-1");
  });

  it("senha errada mostra o erro no campo e o esvazia", async () => {
    mock.api.mfaConfirmar.mockRejectedValue(
      new mock.ErroApi("Senha incorreta.", { senha_atual: "Senha incorreta." }),
    );
    await chegarNaConfirmacao();
    await userEvent.type(screen.getByLabelText("SENHA ATUAL"), "errada");
    await userEvent.click(screen.getByRole("button", { name: "CONFIRMAR" }));

    expect(await screen.findByText("Senha incorreta.")).toBeInTheDocument();
    expect(screen.getByLabelText("SENHA ATUAL")).toHaveValue("");
  });
});
