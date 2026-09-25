import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SecaoAtividade } from "@/components/configuracoes/SecaoAtividade";
import type { AtividadeItem, Pagina } from "@/lib/types";

const minhaAtividade = jest.fn();

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    api: { minhaAtividade: (pagina: number) => minhaAtividade(pagina) },
  };
});

function pagina(rotulo: string): Pagina<AtividadeItem> {
  return {
    count: 6,
    next: null,
    previous: null,
    results: [
      {
        id: rotulo,
        acao: "LOGIN_OK",
        acao_rotulo: rotulo,
        created_at: "2026-09-25T12:00:00Z",
        ip: null,
      },
    ],
  };
}

test("mostra o carregando só na primeira carga e troca de página sem sumir com a lista", async () => {
  let resolverSegunda: (dados: Pagina<AtividadeItem>) => void = () => {};
  minhaAtividade.mockResolvedValueOnce(pagina("primeira")).mockReturnValueOnce(
    new Promise((resolver) => {
      resolverSegunda = resolver;
    }),
  );

  render(<SecaoAtividade />);
  expect(screen.getByText(/CARREGANDO ATIVIDADE/)).toBeInTheDocument();
  expect(await screen.findByText("primeira")).toBeInTheDocument();

  const proxima = screen.getByRole("button", { name: /PRÓXIMA/ });
  await userEvent.click(proxima);

  // Pedindo a página 2: a lista anterior fica, os botões travam.
  expect(minhaAtividade).toHaveBeenLastCalledWith(2);
  expect(screen.getByText("primeira")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /ANTERIOR/ })).toBeDisabled();

  resolverSegunda(pagina("segunda"));
  expect(await screen.findByText("segunda")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /ANTERIOR/ })).toBeEnabled();
});
