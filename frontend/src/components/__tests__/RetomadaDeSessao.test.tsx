import { render, waitFor } from "@testing-library/react";

import { RetomadaDeSessao, destinoSeguro } from "@/components/auth/RetomadaDeSessao";

const replace = jest.fn();
let volta: string | null = "/trilhas/logica";
const retomar = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => ({ get: () => volta }),
}));

jest.mock("@/lib/api", () => ({
  retomarSessao: () => retomar(),
}));

describe("destinoSeguro", () => {
  it.each([
    ["/trilhas/logica/aulas/condicionais", "/trilhas/logica/aulas/condicionais"],
    ["/desafios?dia=2", "/desafios?dia=2"],
    [null, "/trilhas"],
    ["https://golpe.com", "/trilhas"],
    ["//golpe.com", "/trilhas"],
    ["/\\golpe.com", "/trilhas"],
    ["/sessao", "/trilhas"],
    ["/sessao?volta=/x", "/trilhas"],
  ])("%s vira %s", (bruto, esperado) => {
    expect(destinoSeguro(bruto)).toBe(esperado);
  });
});

describe("RetomadaDeSessao", () => {
  beforeEach(() => {
    replace.mockReset();
    retomar.mockReset();
    sessionStorage.clear();
    volta = "/trilhas/logica";
  });

  it("renova e devolve o aluno para a página", async () => {
    retomar.mockResolvedValue(true);
    render(<RetomadaDeSessao />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/trilhas/logica"));
  });

  it("sem sessão para renovar, vai para o login", async () => {
    retomar.mockResolvedValue(false);
    render(<RetomadaDeSessao />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/entrar"));
  });

  it("recusado logo depois de renovar, não entra em loop", async () => {
    sessionStorage.setItem("cq_retomada", String(Date.now()));
    render(<RetomadaDeSessao />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/entrar"));
    expect(retomar).not.toHaveBeenCalled();
  });

  it("destino externo vira /trilhas", async () => {
    volta = "//golpe.com";
    retomar.mockResolvedValue(true);
    render(<RetomadaDeSessao />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/trilhas"));
  });
});
