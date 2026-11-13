import { act, render, screen } from "@testing-library/react";

import {
  AvisoDeLimite,
  mensagemDeLimite,
  TEMPO_DO_AVISO,
} from "@/components/ui/AvisoDeLimite";
import { avisarLimite } from "@/lib/limite";

afterEach(() => {
  jest.useRealTimers();
});

describe("mensagemDeLimite", () => {
  it("usa os segundos do Retry-After, com plural", () => {
    expect(mensagemDeLimite(30)).toContain("30 segundos");
    expect(mensagemDeLimite(1)).toContain("1 segundo ");
  });

  it("cai na mensagem padrão sem Retry-After", () => {
    expect(mensagemDeLimite(NaN)).toContain("alguns segundos");
    expect(mensagemDeLimite(0)).toContain("alguns segundos");
  });
});

describe("AvisoDeLimite", () => {
  it("não mostra nada até o evento chegar", () => {
    render(<AvisoDeLimite />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("mostra o aviso como alert e some sozinho", () => {
    jest.useFakeTimers();
    render(<AvisoDeLimite />);

    act(() => avisarLimite(12));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Muitas requisições. Aguarde 12 segundos",
    );

    act(() => {
      jest.advanceTimersByTime(TEMPO_DO_AVISO);
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("um segundo evento reinicia a contagem", () => {
    jest.useFakeTimers();
    render(<AvisoDeLimite />);

    act(() => avisarLimite(5));
    act(() => {
      jest.advanceTimersByTime(TEMPO_DO_AVISO - 1000);
    });
    act(() => avisarLimite(5));
    act(() => {
      jest.advanceTimersByTime(TEMPO_DO_AVISO - 1000);
    });

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
