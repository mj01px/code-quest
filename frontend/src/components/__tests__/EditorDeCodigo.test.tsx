import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ChangeEvent } from "react";

import { EditorDeCodigo } from "@/components/exercicio/EditorDeCodigo";

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () =>
    function EditorSimulado({
      value,
      onChange,
      options,
    }: {
      value: string;
      onChange: (valor: string) => void;
      options: { readOnly: boolean };
    }) {
      return (
        <textarea
          aria-label="Editor de código"
          value={value}
          onChange={(evento: ChangeEvent<HTMLTextAreaElement>) =>
            onChange(evento.target.value)
          }
          readOnly={options.readOnly}
        />
      );
    },
}));

describe("EditorDeCodigo", () => {
  it("bloqueia Ctrl+V e volta ao editor sem mudar o código", async () => {
    const usuario = userEvent.setup();
    const aoMudar = jest.fn();
    const codigo = "print(42)";
    render(<EditorDeCodigo valor={codigo} aoMudar={aoMudar} />);

    const editor = screen.getByRole("textbox", { name: "Editor de código" });
    await usuario.click(editor);
    expect(fireEvent.keyDown(editor, { key: "v", ctrlKey: true })).toBe(false);
    expect(screen.getByRole("dialog", { name: "Colagem interceptada" })).toHaveFocus();
    expect(editor).toHaveValue(codigo);
    expect(aoMudar).not.toHaveBeenCalled();

    await usuario.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(editor).toHaveFocus();

    fireEvent.keyDown(editor, { key: "v", ctrlKey: true });
    await usuario.click(screen.getByRole("button", { name: "Voltar ao código" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(editor).toHaveFocus();
  });

  it("bloqueia a colagem pelo evento do navegador somente dentro do editor", () => {
    render(
      <>
        <input aria-label="Outro campo" />
        <EditorDeCodigo valor="" aoMudar={jest.fn()} />
      </>,
    );

    expect(fireEvent.paste(screen.getByRole("textbox", { name: "Outro campo" }))).toBe(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    expect(fireEvent.paste(screen.getByRole("textbox", { name: "Editor de código" }))).toBe(false);
    expect(screen.getByRole("dialog", { name: "Colagem interceptada" })).toBeInTheDocument();
  });

  it("não mostra o aviso no editor somente leitura", () => {
    render(<EditorDeCodigo valor="print(42)" aoMudar={jest.fn()} somenteLeitura />);
    const editor = screen.getByRole("textbox", { name: "Editor de código" });

    fireEvent.keyDown(editor, { key: "v", ctrlKey: true });
    fireEvent.paste(editor);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
