import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  minhaCriatura,
  progressoAtual,
  usuario,
} from "@/components/__tests__/fixtures";
import { CARTA_MINIMA, PainelSerAutor } from "@/components/autoria/PainelSerAutor";
import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";
import { ErroApi } from "@/lib/api";
import type { SolicitacaoAutoria } from "@/lib/types";

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  temSessao: jest.fn(),
  listarTrilhas: jest.fn(),
  api: {
    eu: jest.fn(),
    minhasCriaturas: jest.fn(),
    meuProgresso: jest.fn(),
    minhaSequencia: jest.fn(),
    exerciciosConcluidos: jest.fn(),
    trilhasIniciadas: jest.fn(),
    minhaSolicitacao: jest.fn(),
    solicitarAutoria: jest.fn(),
  },
}));

const mock = jest.requireMock<{
  temSessao: jest.Mock;
  listarTrilhas: jest.Mock;
  api: Record<string, jest.Mock>;
}>("@/lib/api");

function pedido(extra: Partial<SolicitacaoAutoria> = {}): SolicitacaoAutoria {
  return {
    id: 1,
    areas: [7],
    areas_nomes: ["Python"],
    carta_apresentacao: "x".repeat(CARTA_MINIMA),
    portfolio_link: "",
    aceite_diretrizes: true,
    situacao: "PENDENTE",
    motivo_rejeicao: "",
    criado_em: "2026-10-28T12:00:00Z",
    ...extra,
  };
}

function montar() {
  return render(
    <ProvedorProgresso>
      <PainelSerAutor />
    </ProvedorProgresso>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mock.temSessao.mockReturnValue(true);
  mock.api.eu.mockResolvedValue(usuario());
  mock.api.minhasCriaturas.mockResolvedValue([minhaCriatura()]);
  mock.api.meuProgresso.mockResolvedValue(progressoAtual());
  mock.api.minhaSequencia.mockResolvedValue({
    atual: 0,
    recorde: 0,
    feito_hoje: false,
    ultimo_dia: null,
  });
  mock.api.exerciciosConcluidos.mockResolvedValue([]);
  mock.api.trilhasIniciadas.mockResolvedValue([]);
  mock.listarTrilhas.mockResolvedValue([
    { id: 7, nome: "Python", slug: "python", descricao: "", ordem: 1, total_aulas: 0, total_exercicios: 0 },
  ]);
  mock.api.minhaSolicitacao.mockRejectedValue(new ErroApi(404, "nao_encontrado", "Não encontrado."));
});

describe("PainelSerAutor", () => {
  it("só libera o envio com área, carta mínima e aceite; depois mostra em análise", async () => {
    const usuarioAuto = userEvent.setup();
    mock.api.solicitarAutoria.mockResolvedValue(pedido());
    montar();

    const enviar = await screen.findByRole("button", { name: "ENVIAR SOLICITAÇÃO" });
    expect(enviar).toBeDisabled();

    await usuarioAuto.click(await screen.findByRole("button", { name: "Python" }));
    await usuarioAuto.type(screen.getByLabelText(/POR QUE VOCÊ/), "a".repeat(CARTA_MINIMA));
    await usuarioAuto.click(screen.getByRole("checkbox"));
    expect(enviar).toBeEnabled();

    await usuarioAuto.click(enviar);

    expect(mock.api.solicitarAutoria).toHaveBeenCalledWith({
      areas: [7],
      carta_apresentacao: "a".repeat(CARTA_MINIMA),
      portfolio_link: "",
      aceite_diretrizes: true,
    });
    expect(await screen.findByText("EM ANÁLISE")).toBeInTheDocument();
  });

  it("pedido pendente mostra em análise, sem formulário", async () => {
    mock.api.minhaSolicitacao.mockResolvedValue(pedido());
    montar();

    expect(await screen.findByText("EM ANÁLISE")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ENVIAR SOLICITAÇÃO" })).toBeNull();
  });

  it("rejeitado mostra o motivo e deixa tentar de novo", async () => {
    mock.api.minhaSolicitacao.mockResolvedValue(
      pedido({ situacao: "REJEITADA", motivo_rejeicao: "Carta genérica." }),
    );
    montar();

    expect(await screen.findByText("Motivo: Carta genérica.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "TENTAR NOVAMENTE" }));

    expect(
      await screen.findByRole("button", { name: "ENVIAR SOLICITAÇÃO" }),
    ).toBeInTheDocument();
  });
});
