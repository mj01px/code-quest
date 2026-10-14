import { fireEvent, render, screen } from "@testing-library/react";
import { Terminal } from "@xterm/xterm";

import { TerminalDeSaida } from "@/components/exercicio/TerminalDeSaida";

jest.mock("@xterm/xterm", () => ({
  Terminal: jest.fn().mockImplementation(() => ({
    textarea: document.createElement("textarea"),
    loadAddon: jest.fn(),
    open: jest.fn(),
    reset: jest.fn(),
    write: jest.fn(),
    dispose: jest.fn(),
  })),
}));

jest.mock("@xterm/addon-fit", () => ({
  FitAddon: jest.fn().mockImplementation(() => ({ fit: jest.fn() })),
}));

beforeAll(() => {
  Object.defineProperty(global, "ResizeObserver", {
    configurable: true,
    value: class {
      observe() {}
      disconnect() {}
    },
  });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("TerminalDeSaida", () => {
  it("desativa entrada, bloqueia colar e libera a instância ao desmontar", () => {
    const { unmount } = render(
      <TerminalDeSaida saida="olá" erro="" veredito="APROVADO" />,
    );
    const instancia = jest.mocked(Terminal).mock.results[0].value;
    const container = screen.getByRole("log", { name: "Saída da execução" });

    expect(Terminal).toHaveBeenCalledWith(
      expect.objectContaining({ disableStdin: true, cursorBlink: false }),
    );
    expect(instancia.textarea.readOnly).toBe(true);
    expect(instancia.textarea.tabIndex).toBe(-1);
    expect(instancia.write).toHaveBeenCalledWith("olá");

    const colar = new Event("paste", { bubbles: true, cancelable: true });
    fireEvent(container, colar);
    expect(colar.defaultPrevented).toBe(true);

    unmount();
    expect(instancia.dispose).toHaveBeenCalledTimes(1);
  });

  it("substitui a saída e destaca stderr e vereditos de erro", () => {
    const { rerender } = render(
      <TerminalDeSaida saida="primeiro" erro="" veredito="APROVADO" />,
    );
    const instancia = jest.mocked(Terminal).mock.results[0].value;
    instancia.reset.mockClear();
    instancia.write.mockClear();

    rerender(
      <TerminalDeSaida
        saida="segundo"
        erro="ZeroDivisionError"
        veredito="ERRO_DE_EXECUCAO"
      />,
    );

    expect(instancia.reset).toHaveBeenCalledTimes(1);
    expect(instancia.write).toHaveBeenCalledWith("segundo");
    expect(instancia.write).toHaveBeenCalledWith(
      expect.stringContaining("\u001b[31mZeroDivisionError"),
    );
    expect(instancia.write).toHaveBeenCalledWith(
      expect.stringContaining("Erro de execução"),
    );

    instancia.write.mockClear();
    rerender(
      <TerminalDeSaida saida="" erro="" veredito="TEMPO_ESGOTADO" />,
    );
    expect(instancia.write).toHaveBeenCalledWith(
      expect.stringContaining("Tempo esgotado"),
    );
  });
});