import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";

import { useModal } from "@/components/ui/useModal";

function Modal({ onFechar, bloqueado = false }: { onFechar: () => void; bloqueado?: boolean }) {
  const painel = useRef<HTMLDivElement>(null);
  useModal(painel, onFechar, bloqueado);
  return (
    <div ref={painel} role="dialog" aria-modal="true" tabIndex={-1}>
      <button type="button">Primeiro</button>
      <button type="button" tabIndex={-1}>
        Invisível
      </button>
      <button type="button">Último</button>
    </div>
  );
}

describe("useModal", () => {
  it("foca o painel e prende o Tab nos dois sentidos", async () => {
    const user = userEvent.setup();
    render(<Modal onFechar={jest.fn()} />);
    expect(screen.getByRole("dialog")).toHaveFocus();

    await user.tab();
    expect(screen.getByText("Primeiro")).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByText("Último")).toHaveFocus();
    await user.tab();
    expect(screen.getByText("Primeiro")).toHaveFocus();
  });

  it("Esc fecha, exceto bloqueado", async () => {
    const user = userEvent.setup();
    const onFechar = jest.fn();
    const { rerender } = render(<Modal onFechar={onFechar} bloqueado />);

    await user.keyboard("{Escape}");
    expect(onFechar).not.toHaveBeenCalled();

    rerender(<Modal onFechar={onFechar} />);
    await user.keyboard("{Escape}");
    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it("devolve o foco para quem abriu", () => {
    render(<button type="button">Abrir</button>);
    const abrir = screen.getByText("Abrir");
    abrir.focus();

    const { unmount } = render(<Modal onFechar={jest.fn()} />);
    unmount();

    expect(abrir).toHaveFocus();
  });
});
