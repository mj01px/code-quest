import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  aula,
  exercicioResumo,
  minhaCriatura,
  progressoAtual,
  trilhaDetalhe,
  trilhaResumo,
  usuario,
} from "@/components/__tests__/fixtures";
import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";
import { PainelDeDesafios } from "@/components/desafios/PainelDeDesafios";
import { BotaoConclusao } from "@/components/trilhas/BotaoConclusao";
import { MapaDeFases } from "@/components/trilhas/MapaDeFases";
import { PainelDeTrilhas } from "@/components/trilhas/PainelDeTrilhas";
import { api as apiReal, temSessao as temSessaoReal } from "@/lib/api";
import type { Desafio } from "@/lib/desafios";
import type { ResultadoConclusao } from "@/lib/types";

// O teste que fecha a migração: o progresso saiu do navegador e foi para a
// conta. Antes desta entrega, 215 testes ficavam verdes com a funcionalidade
// quebrada porque semeavam `localStorage` na mão — a suíte descrevia o mock, e
// não o produto.
//
// Aqui não se olha o que a tela desenha: espiona-se a própria `Storage`. Se
// qualquer caminho de progresso voltar a ler ou gravar chave de navegador, isto
// falha, mesmo que a tela continue certa.
//
// A preferência de sidebar (`codequest:sidebar`) continua legitimamente em
// `localStorage` — é do dispositivo, não da conta. Por isso este arquivo monta
// só as superfícies de progresso, e não a moldura do app.
//
// O `ProvedorProgresso` entra junto porque é ele quem busca agora: sem ele os
// consumidores nem renderizam. Ele também não toca o armazenamento, e é
// justamente isso que os espiões abaixo continuam afirmando.

jest.mock("@/lib/api", () => ({
  temSessao: jest.fn(),
  api: {
    eu: jest.fn(),
    minhasCriaturas: jest.fn(),
    meuProgresso: jest.fn(),
    exerciciosConcluidos: jest.fn(),
    concluirExercicio: jest.fn(),
  },
}));

const temSessao = temSessaoReal as jest.MockedFunction<typeof temSessaoReal>;
const eu = apiReal.eu as jest.MockedFunction<typeof apiReal.eu>;
const minhasCriaturas = apiReal.minhasCriaturas as jest.MockedFunction<
  typeof apiReal.minhasCriaturas
>;
const meuProgresso = apiReal.meuProgresso as jest.MockedFunction<
  typeof apiReal.meuProgresso
>;
const exerciciosConcluidos = apiReal.exerciciosConcluidos as jest.MockedFunction<
  typeof apiReal.exerciciosConcluidos
>;
const concluirExercicio = apiReal.concluirExercicio as jest.MockedFunction<
  typeof apiReal.concluirExercicio
>;

const TRILHA = trilhaResumo({ total_aulas: 1, total_exercicios: 2 });
const DETALHE = trilhaDetalhe({
  ...TRILHA,
  aulas: [
    aula({
      exercicios: [
        exercicioResumo({ id: 1, slug: "media", titulo: "Média" }),
        exercicioResumo({ id: 2, slug: "trocar", titulo: "Trocar" }),
      ],
    }),
  ],
});

const DESAFIO: Desafio = {
  trilhaSlug: TRILHA.slug,
  trilhaNome: TRILHA.nome,
  moduloTitulo: "Variáveis e tipos",
  slug: "media",
  titulo: "Média",
  dificuldade: "INICIANTE",
  dificuldadeLabel: "Iniciante",
  tipoLabel: "Código",
  xp: 100,
  href: `/trilhas/${TRILHA.slug}/exercicios/media`,
};

function montar(no: React.ReactNode) {
  return render(<ProvedorProgresso>{no}</ProvedorProgresso>);
}

let espioes: jest.SpyInstance[];

function chamadasDeStorage(): number {
  return espioes.reduce((soma, espiao) => soma + espiao.mock.calls.length, 0);
}

beforeEach(() => {
  jest.clearAllMocks();
  temSessao.mockReturnValue(true);
  eu.mockResolvedValue(usuario());
  minhasCriaturas.mockResolvedValue([minhaCriatura({ ativa: true })]);
  meuProgresso.mockResolvedValue(progressoAtual());
  exerciciosConcluidos.mockResolvedValue([
    {
      trilha_slug: TRILHA.slug,
      exercicio_slug: "media",
      xp: 50,
      criado_em: "2026-09-10T12:00:00Z",
    },
  ]);
  concluirExercicio.mockResolvedValue({
    ja_concluido: false,
    xp_ganho: 50,
    subiu_de_nivel: false,
    evoluiu: false,
    progresso: progressoAtual(),
  } satisfies ResultadoConclusao);

  // Espionar o protótipo pega qualquer acesso, inclusive `sessionStorage`, que
  // compartilha a mesma classe e seria só a chave trocando de casa.
  espioes = [
    jest.spyOn(Storage.prototype, "getItem"),
    jest.spyOn(Storage.prototype, "setItem"),
    jest.spyOn(Storage.prototype, "removeItem"),
    jest.spyOn(Storage.prototype, "clear"),
    jest.spyOn(Storage.prototype, "key"),
  ];
});

afterEach(() => {
  for (const espiao of espioes) espiao.mockRestore();
});

describe("nenhum caminho de progresso toca o armazenamento do navegador", () => {
  it("o painel de trilhas lê o progresso da API, não do storage", async () => {
    montar(<PainelDeTrilhas trilhas={[TRILHA]} destaque={DETALHE} />);

    await waitFor(() => expect(exerciciosConcluidos).toHaveBeenCalled());
    expect(chamadasDeStorage()).toBe(0);
  });

  it("o mapa de fases lê o progresso da API, não do storage", async () => {
    montar(<MapaDeFases trilha={DETALHE} />);

    await waitFor(() => expect(exerciciosConcluidos).toHaveBeenCalled());
    expect(chamadasDeStorage()).toBe(0);
  });

  it("o painel de desafios lê o progresso da API, não do storage", async () => {
    montar(<PainelDeDesafios desafios={[DESAFIO]} dia="10 de setembro" />);

    await waitFor(() => expect(exerciciosConcluidos).toHaveBeenCalled());
    expect(chamadasDeStorage()).toBe(0);
  });

  it("concluir uma fase não grava nada no navegador", async () => {
    montar(<BotaoConclusao trilhaSlug={TRILHA.slug} faseSlug="trocar" />);

    await waitFor(() => expect(exerciciosConcluidos).toHaveBeenCalled());
    await userEvent.click(document.querySelector("button")!);
    await waitFor(() => expect(concluirExercicio).toHaveBeenCalled());

    expect(chamadasDeStorage()).toBe(0);
  });

  it("o storage segue vazio depois de tudo", async () => {
    montar(<PainelDeTrilhas trilhas={[TRILHA]} destaque={DETALHE} />);
    await waitFor(() => expect(exerciciosConcluidos).toHaveBeenCalled());

    // `length` não passa pelos espiões, então é uma segunda testemunha:
    // nenhuma chave nasceu por caminho que os espiões não cubram.
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
