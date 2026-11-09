import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { PixelSelect } from "@/components/ui/PixelSelect";

const OPCOES = [
  { valor: "a", rotulo: "Alfa" },
  { valor: "b", rotulo: "Beta" },
  { valor: "c", rotulo: "Gama" },
];

function Campo({
  inicial = "",
  aoMudar = jest.fn(),
}: {
  inicial?: string;
  aoMudar?: jest.Mock;
}) {
  const [valor, setValor] = useState(inicial);
  return (
    <>
      <PixelSelect
        rotulo="LETRA"
        value={valor}
        onChange={(v) => {
          setValor(v);
          aoMudar(v);
        }}
        opcoes={OPCOES}
        placeholder="Escolha"
      />
      <button type="button">fora</button>
    </>
  );
}

describe("PixelSelect", () => {
  it("mostra o placeholder e escolhe com clique", async () => {
    const aoMudar = jest.fn();
    render(<Campo aoMudar={aoMudar} />);
    const campo = screen.getByLabelText("LETRA");
    expect(campo).toHaveTextContent("Escolha");

    await userEvent.click(campo);
    await userEvent.click(screen.getByRole("option", { name: "Beta" }));

    expect(aoMudar).toHaveBeenCalledWith("b");
    expect(campo).toHaveTextContent("Beta");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(campo).toHaveFocus();
  });

  it("navega pelo teclado a partir da opção marcada", async () => {
    const aoMudar = jest.fn();
    render(<Campo inicial="a" aoMudar={aoMudar} />);
    const campo = screen.getByLabelText("LETRA");

    campo.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: "Alfa" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(aoMudar).toHaveBeenCalledWith("c");
    expect(campo).toHaveTextContent("Gama");
  });

  it("Esc e clique fora fecham sem mudar o valor", async () => {
    const aoMudar = jest.fn();
    render(<Campo inicial="a" aoMudar={aoMudar} />);
    const campo = screen.getByLabelText("LETRA");

    await userEvent.click(campo);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();

    await userEvent.click(campo);
    await userEvent.click(screen.getByRole("button", { name: "fora" }));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(aoMudar).not.toHaveBeenCalled();
  });
});
