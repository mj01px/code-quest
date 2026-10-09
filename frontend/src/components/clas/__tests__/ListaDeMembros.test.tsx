import { fireEvent, render, screen } from "@testing-library/react";

import { ListaDeMembros } from "@/components/clas/ListaDeMembros";
import type { Cargo, MembroDoCla } from "@/lib/types";

const ROTULO: Record<Cargo, string> = {
  LIDER: "Líder",
  COLIDER: "Co-líder",
  MEMBRO: "Membro",
};

function membro(cargo: Cargo, nickname: string): MembroDoCla {
  return {
    id: `id-${nickname}`,
    nickname,
    cargo,
    cargo_rotulo: ROTULO[cargo],
    entrou_em: "2026-09-14T00:00:00Z",
  };
}

describe("ListaDeMembros", () => {
  it("lista os membros e marca quem sou eu", () => {
    render(
      <ListaDeMembros
        membros={[membro("LIDER", "kiuev"), membro("MEMBRO", "julio")]}
        total={2}
        meuNickname="kiuev"
        meuCargo="LIDER"
        busyId={null}
        onAcao={jest.fn()}
      />,
    );

    expect(screen.getByText("kiuev")).toBeInTheDocument();
    expect(screen.getByText("julio")).toBeInTheDocument();
    expect(screen.getByText("VOCÊ")).toBeInTheDocument();
  });

  it("gestor abre o menu e dispara a ação no membro certo", () => {
    const onAcao = jest.fn();
    render(
      <ListaDeMembros
        membros={[membro("LIDER", "kiuev"), membro("MEMBRO", "julio")]}
        total={2}
        meuNickname="kiuev"
        meuCargo="LIDER"
        busyId={null}
        onAcao={onAcao}
      />,
    );

    fireEvent.click(screen.getByLabelText("Ações para julio"));
    fireEvent.click(screen.getByText("EXPULSAR"));

    expect(onAcao).toHaveBeenCalledWith(
      "expulsar",
      expect.objectContaining({ nickname: "julio" }),
    );
  });

  it("não mostra ações quando não sou membro", () => {
    render(
      <ListaDeMembros
        membros={[membro("LIDER", "kiuev"), membro("MEMBRO", "julio")]}
        total={2}
        meuNickname={undefined}
        meuCargo={null}
        busyId={null}
        onAcao={jest.fn()}
      />,
    );

    expect(screen.queryByLabelText("Ações para julio")).not.toBeInTheDocument();
  });

  it("esconde o excedente até clicar em mostrar todos", () => {
    const membros = Array.from({ length: 10 }, (_, i) =>
      membro("MEMBRO", `m${String(i + 1).padStart(2, "0")}`),
    );
    render(
      <ListaDeMembros
        membros={membros}
        total={10}
        meuNickname={undefined}
        meuCargo={null}
        busyId={null}
        onAcao={jest.fn()}
      />,
    );

    expect(screen.queryByText("m09")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("MOSTRAR TODOS OS 10"));

    expect(screen.getByText("m09")).toBeInTheDocument();
  });
});
