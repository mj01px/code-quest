import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PainelConfirmarEmail } from "@/components/auth/PainelConfirmarEmail";

const confirmarTrocaEmail = jest.fn();

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("token=abc123"),
}));

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    api: {
      confirmarTrocaEmail: (token: string) => confirmarTrocaEmail(token),
    },
  };
});

describe("PainelConfirmarEmail", () => {
  it("abrir o link não confirma: a troca só sai no clique", async () => {
    confirmarTrocaEmail.mockResolvedValue({});

    render(<PainelConfirmarEmail />);
    expect(confirmarTrocaEmail).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", { name: "CONFIRMAR TROCA" }),
    );

    expect(
      await screen.findByRole("heading", { name: "E-MAIL TROCADO" }),
    ).toBeInTheDocument();
    expect(confirmarTrocaEmail).toHaveBeenCalledWith("abc123");
  });

  it("no 1º link, avisa que falta confirmar no endereço novo", async () => {
    confirmarTrocaEmail.mockResolvedValue({ etapa: "posse" });

    render(<PainelConfirmarEmail />);
    await userEvent.click(
      screen.getByRole("button", { name: "CONFIRMAR TROCA" }),
    );

    expect(
      await screen.findByRole("heading", { name: "TROCA AUTORIZADA" }),
    ).toBeInTheDocument();
  });
});
