import { render, screen } from "@testing-library/react";

import { AreaDeResolucao } from "@/components/exercicio/AreaDeResolucao";
import { ErroApi } from "@/lib/api";

const especificacaoDeCodigo = jest.fn();

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    api: { especificacaoDeCodigo: () => especificacaoDeCodigo() },
  };
});
jest.mock("@/components/trilhas/BotaoConclusao", () => ({
  BotaoConclusao: () => <button type="button">Marcar como concluído</button>,
}));
jest.mock("@/components/exercicio/PainelDeCodigo", () => ({
  PainelDeCodigo: () => <p>editor</p>,
}));

test.each([
  [404, /chega em uma próxima entrega/],
  [403, /nível de acesso não inclui/],
  [503, /Não foi possível carregar o editor/],
])("sem especificação (%i) mostra a nota certa e mantém o botão", async (status, nota) => {
  especificacaoDeCodigo.mockRejectedValueOnce(new ErroApi(status, "x", "x"));

  render(<AreaDeResolucao trilhaSlug="t" exercicioSlug="e" />);

  expect(await screen.findByText(nota)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Marcar como concluído" })).toBeInTheDocument();
});
