import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";
import { BotaoConclusao } from "@/components/trilhas/BotaoConclusao";
import {
  ErroApi,
  api as apiReal,
  temSessao as temSessaoReal,
} from "@/lib/api";
import type { ExercicioConcluido, ResultadoConclusao } from "@/lib/types";

import { minhaCriatura, progressoAtual, usuario } from "./fixtures";

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    temSessao: jest.fn(),
    api: {
      concluirExercicio: jest.fn(),
      exerciciosConcluidos: jest.fn(),
      eu: jest.fn(),
      minhasCriaturas: jest.fn(),
      meuProgresso: jest.fn(),
    },
  };
});

// Tipado a partir da função real: se a assinatura de `concluirExercicio` mudar,
// o mock para de compilar em vez de mentir em silêncio.
const concluirExercicio = apiReal.concluirExercicio as jest.MockedFunction<
  typeof apiReal.concluirExercicio
>;
const exerciciosConcluidos = apiReal.exerciciosConcluidos as jest.MockedFunction<
  typeof apiReal.exerciciosConcluidos
>;
const temSessao = temSessaoReal as jest.MockedFunction<typeof temSessaoReal>;
const eu = apiReal.eu as jest.MockedFunction<typeof apiReal.eu>;
const minhasCriaturas = apiReal.minhasCriaturas as jest.MockedFunction<
  typeof apiReal.minhasCriaturas
>;
const meuProgresso = apiReal.meuProgresso as jest.MockedFunction<
  typeof apiReal.meuProgresso
>;

// Um construtor por ramo da união, sem `as`: o cast deixaria compilar um
// `{ ja_concluido: true, xp_ganho: 50 }`, estado que o tipo declara impossível
// e que faria o botão anunciar XP numa repetição.
const BASE = {
  subiu_de_nivel: false,
  evoluiu: false,
  progresso: progressoAtual(),
};

function novoCredito(xp = 50): ResultadoConclusao {
  return { ...BASE, ja_concluido: false, xp_ganho: xp };
}

function repeticao(): ResultadoConclusao {
  return { ...BASE, ja_concluido: true, xp_ganho: 0 };
}

function jaConcluido(): ExercicioConcluido {
  return {
    trilha_slug: "logica",
    exercicio_slug: "media",
    xp: 50,
    criado_em: "2026-09-10T12:00:00Z",
  };
}

function montar() {
  return render(
    <ProvedorProgresso>
      <BotaoConclusao trilhaSlug="logica" faseSlug="media" />
    </ProvedorProgresso>,
  );
}

/** Espera o pedido de conclusões assentar, para não sobrar act() pendente. */
async function montarPronto() {
  const r = montar();
  await waitFor(() => expect(botao()).toHaveAttribute("aria-busy", "false"));
  return r;
}

const botao = () => screen.getByRole("button");
const regiaoViva = () => screen.getByRole("status");

beforeEach(() => {
  jest.clearAllMocks();
  temSessao.mockReturnValue(true);
  exerciciosConcluidos.mockResolvedValue([]);
  eu.mockResolvedValue(usuario());
  minhasCriaturas.mockResolvedValue([minhaCriatura({ ativa: true })]);
  meuProgresso.mockResolvedValue(progressoAtual());
});

describe("BotaoConclusao", () => {
  it("credita e anuncia o XP no primeiro clique", async () => {
    concluirExercicio.mockResolvedValue(novoCredito());
    await montarPronto();

    await userEvent.click(botao());

    expect(concluirExercicio).toHaveBeenCalledWith("logica", "media");
    expect(await screen.findByText("+50 XP")).toBeInTheDocument();
    expect(botao()).toHaveTextContent("Concluído");
    expect(botao()).toHaveAttribute("aria-pressed", "true");
  });

  it("trata repetição como sucesso silencioso, sem XP e sem erro", async () => {
    concluirExercicio.mockResolvedValue(repeticao());
    await montarPronto();

    await userEvent.click(botao());

    expect(await screen.findByText("Concluído")).toBeInTheDocument();
    expect(botao()).toHaveAttribute("aria-pressed", "true");
    // O que não pode acontecer: anunciar XP que não foi creditado de novo. A
    // região viva existe desde o primeiro render, então o que se afirma é que
    // ela está muda — não que ela sumiu.
    expect(screen.queryByText(/XP/)).not.toBeInTheDocument();
    expect(regiaoViva()).toBeEmptyDOMElement();
  });

  it("devolve o botão ao estado anterior quando a rede falha", async () => {
    concluirExercicio.mockRejectedValue(
      new ErroApi(0, "sem_conexao", "Não foi possível falar com o servidor."),
    );
    await montarPronto();

    await userEvent.click(botao());

    expect(
      await screen.findByText(/Não foi possível falar com o servidor/),
    ).toBeInTheDocument();
    expect(botao()).toHaveTextContent("Marcar como concluído");
    expect(botao()).toHaveAttribute("aria-pressed", "false");
    expect(botao()).toHaveAttribute("aria-disabled", "false");
  });

  it("avisa que a conexão está lenta quando estoura o tempo limite", async () => {
    // Não é o mesmo aviso de queda de conexão: o servidor respondeu tarde, não
    // sumiu, e o texto precisa refletir isso.
    concluirExercicio.mockRejectedValue(
      new ErroApi(0, "tempo_esgotado", "A conexão está lenta. Tente de novo."),
    );
    await montarPronto();

    await userEvent.click(botao());

    expect(await screen.findByText(/conexão está lenta/)).toBeInTheDocument();
    expect(screen.queryByText(/Ele está no ar/)).not.toBeInTheDocument();
    expect(botao()).toHaveTextContent("Marcar como concluído");
    expect(botao()).toHaveAttribute("aria-disabled", "false");
  });

  it("cai em estado neutro quando não há sessão", async () => {
    concluirExercicio.mockRejectedValue(
      new ErroApi(401, "nao_autenticado", "Credenciais não fornecidas."),
    );
    await montarPronto();

    await userEvent.click(botao());

    expect(await screen.findByText(/Entre na sua conta/)).toBeInTheDocument();
    expect(botao()).toHaveTextContent("Marcar como concluído");
    expect(screen.queryByText(/XP/)).not.toBeInTheDocument();
  });

  it("cai em estado neutro quando o exercício não está disponível", async () => {
    concluirExercicio.mockRejectedValue(
      new ErroApi(404, "nao_encontrado", "não encontrado"),
    );
    await montarPronto();

    await userEvent.click(botao());

    expect(await screen.findByText(/não está disponível/)).toBeInTheDocument();
    expect(botao()).toHaveTextContent("Marcar como concluído");
  });

  it("nasce concluído quando o servidor diz que a fase já foi feita", async () => {
    // Antes desta entrega o botão sempre nascia "inicial": quem já tinha feito
    // a fase via "Marcar como concluído" e o estado real do servidor sumia.
    exerciciosConcluidos.mockResolvedValue([jaConcluido()]);

    montar();

    expect(await screen.findByText("Concluído")).toBeInTheDocument();
    expect(botao()).toHaveAttribute("aria-pressed", "true");
    expect(botao()).toHaveAttribute("aria-disabled", "true");
    expect(concluirExercicio).not.toHaveBeenCalled();
  });

  it("não busca por conta própria: lê a lista única do provedor", async () => {
    // O que protegia a corretude não era o filtro e sim a chave composta, e
    // disso cuida o teste seguinte.
    await montarPronto();

    expect(exerciciosConcluidos).toHaveBeenCalledWith();
    expect(exerciciosConcluidos).toHaveBeenCalledTimes(1);
  });

  it("conclusão da mesma fase em outra trilha não marca esta", async () => {
    exerciciosConcluidos.mockResolvedValue([
      { ...jaConcluido(), trilha_slug: "python" },
    ]);

    await montarPronto();

    expect(botao()).toHaveTextContent("Marcar como concluído");
    expect(botao()).toHaveAttribute("aria-pressed", "false");
  });

  it("continua focável enquanto envia, em vez de sumir do leitor de tela", async () => {
    // `disabled` tira o foco do botão, e o leitor cala justamente sobre o
    // elemento que acabou de mudar. `aria-disabled` mantém foco e anúncio.
    let liberar: (v: ResultadoConclusao) => void = () => {};
    concluirExercicio.mockImplementation(
      () => new Promise((r) => (liberar = r)),
    );
    await montarPronto();

    await userEvent.click(botao());

    expect(botao()).toHaveAttribute("aria-disabled", "true");
    expect(botao()).not.toBeDisabled();
    expect(botao()).toHaveFocus();

    liberar(novoCredito());
    await screen.findByText("+50 XP");
  });

  it("dois cliques no mesmo instante mandam um POST só", async () => {
    // O trinco é um ref: checar `estado` não bastaria, porque os dois cliques
    // leem o mesmo valor antes do re-render.
    let liberar: (v: ResultadoConclusao) => void = () => {};
    concluirExercicio.mockImplementation(
      () => new Promise((r) => (liberar = r)),
    );
    await montarPronto();

    const alvo = botao();
    await userEvent.click(alvo);
    await userEvent.click(alvo);
    await userEvent.click(alvo);

    expect(concluirExercicio).toHaveBeenCalledTimes(1);

    liberar(novoCredito());
    await screen.findByText("+50 XP");
  });

  it("anuncia por uma região viva que já existia antes da mudança", async () => {
    // Um `role="status"` que só entra no DOM junto com o texto costuma não ser
    // anunciado: o leitor precisa já estar observando a região.
    concluirExercicio.mockResolvedValue(novoCredito());
    await montarPronto();

    const regiao = regiaoViva();
    expect(regiao).toHaveAttribute("aria-live", "polite");
    expect(regiao).toBeEmptyDOMElement();

    await userEvent.click(botao());

    await waitFor(() => expect(regiao).toHaveTextContent("+50 XP"));
    // Mesmo nó: não foi remontado, foi preenchido.
    expect(regiaoViva()).toBe(regiao);
  });

  it("não grava progresso no localStorage", async () => {
    concluirExercicio.mockResolvedValue(novoCredito());
    await montarPronto();

    await userEvent.click(botao());

    await screen.findByText("+50 XP");
    expect(window.localStorage.length).toBe(0);
  });
});
