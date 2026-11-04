import { render, screen } from "@testing-library/react";

import { GuardaDeEtapa } from "@/components/trilhas/GuardaDeEtapa";
import { mapaDePassos } from "@/lib/passos";
import type { PassoDaTrilha } from "@/lib/types";

let passos: PassoDaTrilha[] | null = null;

jest.mock("@/components/progresso/usePassosDaTrilha", () => ({
  usePassosDaTrilha: () => ({
    ...mapaDePassos(passos),
    carregado: passos !== null,
  }),
}));

const LEITURA: PassoDaTrilha = {
  tipo: "LEITURA",
  aula_slug: "vars",
  exercicio_slug: null,
  titulo: "Lição: Variáveis",
  estado: "liberado",
};

function montar() {
  render(
    <GuardaDeEtapa
      trilhaSlug="logica"
      tipo="EXERCICIO"
      aulaSlug="vars"
      exercicioSlug="media"
    >
      <p>Conteúdo do exercício</p>
    </GuardaDeEtapa>,
  );
}

it("mostra o conteúdo quando a etapa está liberada", () => {
  passos = [
    { ...LEITURA, estado: "concluido" },
    {
      tipo: "EXERCICIO",
      aula_slug: "vars",
      exercicio_slug: "media",
      titulo: "Média",
      estado: "liberado",
    },
  ];
  montar();

  expect(screen.getByText("Conteúdo do exercício")).toBeInTheDocument();
});

it("bloqueia e aponta para a etapa liberada", () => {
  passos = [
    LEITURA,
    {
      tipo: "EXERCICIO",
      aula_slug: "vars",
      exercicio_slug: "media",
      titulo: "Média",
      estado: "bloqueado",
    },
  ];
  montar();

  expect(screen.queryByText("Conteúdo do exercício")).not.toBeInTheDocument();
  expect(screen.getByText(/Conclua “Lição: Variáveis”/)).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Ir para a etapa liberada" }),
  ).toHaveAttribute("href", "/trilhas/logica/aulas/vars");
});

it("antes de carregar não esconde o conteúdo", () => {
  passos = null;
  montar();

  expect(screen.getByText("Conteúdo do exercício")).toBeInTheDocument();
});
