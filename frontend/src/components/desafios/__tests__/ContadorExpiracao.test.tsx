import { act, render, screen } from "@testing-library/react";

import { ContadorExpiracao } from "../ContadorExpiracao";

afterEach(() => {
  jest.useRealTimers();
});

describe("ContadorExpiracao", () => {
  it("mostra quanto falta para a meia-noite em São Paulo", () => {
    jest.useFakeTimers({ now: new Date("2026-10-18T23:59:58-03:00") });

    render(<ContadorExpiracao />);

    expect(screen.getByRole("timer")).toHaveTextContent("00:00:02");
  });

  it("atualiza a cada segundo", () => {
    jest.useFakeTimers({ now: new Date("2026-10-18T22:30:00-03:00") });
    render(<ContadorExpiracao />);
    expect(screen.getByRole("timer")).toHaveTextContent("01:30:00");

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByRole("timer")).toHaveTextContent("01:29:59");
  });

  it("vira o dia sem ficar negativo", () => {
    jest.useFakeTimers({ now: new Date("2026-10-18T23:59:59-03:00") });
    render(<ContadorExpiracao />);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByRole("timer")).toHaveTextContent("23:59:59");
  });

  it("para o relógio ao desmontar", () => {
    jest.useFakeTimers();
    const { unmount } = render(<ContadorExpiracao />);
    expect(jest.getTimerCount()).toBe(1);

    unmount();

    expect(jest.getTimerCount()).toBe(0);
  });
});
