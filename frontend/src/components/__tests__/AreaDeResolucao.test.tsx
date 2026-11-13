import { render, screen } from "@testing-library/react";

import { AreaDeResolucao } from "@/components/exercicio/AreaDeResolucao";
import { ErroApi } from "@/lib/api";

const especificacaoDeCodigo = jest.fn();

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    api: { especificacaoDeCodigo: () => especificacaoDeCodigo() },
    temSessao: () => true,
  };
});
// O desafio do dia mora fora da rota de exercício da trilha: o login volta
// para a tela atual, não para /trilhas/.../exercicios (que daria 404).
jest.mock("next/navigation", () => ({ usePathname: () => "/desafios/soma" }));
jest.mock("@/components/exercicio/PainelDeResposta", () => ({
  PainelDeResposta: ({ nota }: { nota?: string }) => (
    <div>
      <button type="button">Enviar resposta</button>
      {nota ? <p>{nota}</p> : null}
    </div>
  ),
}));
jest.mock("@/components/exercicio/PainelDeCodigo", () => ({
  PainelDeCodigo: () => <p>editor</p>,
}));

test("sem correção automática (404) pede a resposta escrita", async () => {
  especificacaoDeCodigo.mockRejectedValueOnce(new ErroApi(404, "x", "x"));

  render(<AreaDeResolucao trilhaSlug="t" exercicioSlug="e" />);

  expect(await screen.findByText(/correção automática deste exercício ainda não existe/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Enviar resposta" })).toBeInTheDocument();
});

test.each([
  [403, /nível de acesso não inclui/],
  [503, /Não foi possível carregar o editor/],
])("falha %i mostra a nota certa, sem concluir à toa", async (status, nota) => {
  especificacaoDeCodigo.mockRejectedValueOnce(new ErroApi(status, "x", "x"));

  render(<AreaDeResolucao trilhaSlug="t" exercicioSlug="e" />);

  expect(await screen.findByText(nota)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Marcar como concluído|Enviar resposta/ })).not.toBeInTheDocument();
});

test("exercício teórico pede a resposta escrita", () => {
  render(<AreaDeResolucao trilhaSlug="t" exercicioSlug="e" tipo="TEORICO" />);

  expect(screen.getByRole("button", { name: "Enviar resposta" })).toBeInTheDocument();
});

test("sessão expirada convida a entrar de novo, sem o botão de concluir", async () => {
  especificacaoDeCodigo.mockRejectedValueOnce(new ErroApi(401, "x", "x"));

  render(<AreaDeResolucao trilhaSlug="t" exercicioSlug="e" />);

  expect(await screen.findByText(/Sua sessão expirou/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute(
    "href",
    `/entrar?destino=${encodeURIComponent("/desafios/soma")}`,
  );
  expect(screen.queryByRole("button", { name: "Enviar resposta" })).not.toBeInTheDocument();
});
