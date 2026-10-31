import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { AreaDeTexto } from "@/components/autoria/AreaDeTexto";

function Controlado({ inicial }: { inicial: string }) {
  const [valor, setValor] = useState(inicial);
  return (
    <AreaDeTexto
      id="t"
      rotulo="TEXTO"
      markdown
      value={valor}
      onChange={(e) => setValor(e.target.value)}
    />
  );
}

describe("AreaDeTexto: barra de Markdown", () => {
  it.each([
    ["Negrito", "um **dois** tres"],
    ["Itálico", "um *dois* tres"],
    ["Código", "um `dois` tres"],
  ])("%s envolve a seleção e mantém o texto selecionado", async (nome, esperado) => {
    render(<Controlado inicial="um dois tres" />);
    const campo = screen.getByLabelText<HTMLTextAreaElement>("TEXTO");
    campo.setSelectionRange(3, 7);

    await userEvent.click(screen.getByRole("button", { name: nome }));

    expect(campo).toHaveValue(esperado);
    expect(campo.value.slice(campo.selectionStart, campo.selectionEnd)).toBe("dois");
  });

  it("sem seleção insere o par de marcas no cursor", async () => {
    render(<Controlado inicial="ab" />);
    const campo = screen.getByLabelText<HTMLTextAreaElement>("TEXTO");
    campo.setSelectionRange(1, 1);

    await userEvent.click(screen.getByRole("button", { name: "Negrito" }));

    expect(campo).toHaveValue("a****b");
    expect(campo.selectionStart).toBe(3);
  });

  it("sem `markdown` não há barra", () => {
    render(<AreaDeTexto id="x" rotulo="X" />);
    expect(screen.queryByRole("toolbar")).toBeNull();
  });
});
