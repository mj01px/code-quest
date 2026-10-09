import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FormularioCriarCla } from "@/components/clas/FormularioCriarCla";
import { ErroApi } from "@/lib/api";

const empurrar = jest.fn();
const criarCla = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: (rota: string) => empurrar(rota) }),
}));

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    api: { criarCla: (dados: unknown) => criarCla(dados) },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("FormularioCriarCla", () => {
  it("só funda com nome válido e manda pro clã criado", async () => {
    const usuario = userEvent.setup();
    criarCla.mockResolvedValue({ tag: "ABCD2345" });
    render(<FormularioCriarCla />);

    const botao = screen.getByRole("button", { name: "FUNDAR CLÃ" });
    expect(botao).toBeDisabled();

    await usuario.type(screen.getByLabelText("NOME DO CLÃ"), "Os Compiladores");
    expect(botao).toBeEnabled();

    await usuario.click(botao);

    await waitFor(() =>
      expect(criarCla).toHaveBeenCalledWith(
        expect.objectContaining({ nome: "Os Compiladores" }),
      ),
    );
    expect(empurrar).toHaveBeenCalledWith("/clas/ABCD2345");
  });

  it("mostra o erro de campo vindo do backend", async () => {
    const usuario = userEvent.setup();
    criarCla.mockRejectedValue(
      new ErroApi(400, "validation", "inválido", [
        {
          field: "nome",
          code: "termo_proibido",
          message: "Nome não permitido.",
        },
      ]),
    );
    render(<FormularioCriarCla />);

    await usuario.type(screen.getByLabelText("NOME DO CLÃ"), "Um nome qualquer");
    await usuario.click(screen.getByRole("button", { name: "FUNDAR CLÃ" }));

    expect(
      await screen.findByText("Nome não permitido."),
    ).toBeInTheDocument();
  });
});
