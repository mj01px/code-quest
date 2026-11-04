import { render, screen } from "@testing-library/react";

import { BotaoConfiguracoes } from "@/components/layout/BotaoConfiguracoes";

let caminho: string | null = "/trilhas";

jest.mock("next/navigation", () => ({
  usePathname: () => caminho,
}));

it("leva para as configurações", () => {
  caminho = "/trilhas";
  render(<BotaoConfiguracoes />);

  const link = screen.getByRole("link", { name: "Configurações" });
  expect(link).toHaveAttribute("href", "/configuracoes");
  expect(link).not.toHaveAttribute("aria-current");
});

it("fica marcado na página de configurações", () => {
  caminho = "/configuracoes";
  render(<BotaoConfiguracoes />);

  expect(screen.getByRole("link", { name: "Configurações" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
