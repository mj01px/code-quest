import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AlternarSidebar } from "@/components/layout/AlternarSidebar";
import { BarraDeMenu } from "@/components/layout/BarraDeMenu";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";
import { CHAVE, FECHADA } from "@/lib/preferenciaSidebar";

function recolher() {
  document.documentElement.dataset.sidebar = FECHADA;
}

describe("AlternarSidebar", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.sidebar;
    window.localStorage.clear();
  });

  it("começa anunciando a sidebar aberta", () => {
    render(<AlternarSidebar modo="recolher" />);

    expect(screen.getByRole("button", { name: "Recolher menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("recolhe a sidebar marcando o html", async () => {
    render(<AlternarSidebar modo="recolher" />);

    await userEvent.click(screen.getByRole("button", { name: "Recolher menu" }));

    expect(document.documentElement.dataset.sidebar).toBe(FECHADA);
  });

  it("guarda a escolha para o próximo carregamento", async () => {
    render(<AlternarSidebar modo="recolher" />);

    await userEvent.click(screen.getByRole("button", { name: "Recolher menu" }));

    expect(window.localStorage.getItem(CHAVE)).toBe(FECHADA);
  });

  it("expande de volta e limpa a marca", async () => {
    recolher();
    render(<AlternarSidebar modo="expandir" />);

    await userEvent.click(screen.getByRole("button", { name: "Abrir menu" }));

    expect(document.documentElement.dataset.sidebar).toBeUndefined();
    expect(window.localStorage.getItem(CHAVE)).toBe("aberta");
  });

  it("aponta para a sidebar que controla", () => {
    render(<AlternarSidebar modo="expandir" />);

    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-controls",
      "menu-lateral",
    );
  });

  it("mantém os dois botões em sincronia", async () => {
    render(
      <ProvedorProgresso>
        <Sidebar />
        <BarraDeMenu />
      </ProvedorProgresso>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Recolher menu" }));

    for (const nome of ["Recolher menu", "Abrir menu"]) {
      expect(screen.getByRole("button", { name: nome })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    }
  });

  it("devolve o foco ao botão que assume o lugar", async () => {
    render(
      <ProvedorProgresso>
        <Sidebar />
        <BarraDeMenu />
      </ProvedorProgresso>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Recolher menu" }));

    expect(screen.getByRole("button", { name: "Abrir menu" })).toHaveFocus();
  });

  it("não quebra quando o localStorage está bloqueado", async () => {
    const guardar = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("storage bloqueado");
      });

    render(<AlternarSidebar modo="recolher" />);
    await userEvent.click(screen.getByRole("button", { name: "Recolher menu" }));

    expect(document.documentElement.dataset.sidebar).toBe(FECHADA);
    guardar.mockRestore();
  });
});

describe("Sidebar recolhível", () => {
  it("expõe o alvo que os botões controlam", () => {
    const { container } = render(
      <ProvedorProgresso>
        <Sidebar />
      </ProvedorProgresso>,
    );

    const aside = container.querySelector("aside");
    expect(aside).toHaveAttribute("id", "menu-lateral");
    expect(aside).toHaveClass("painel-lateral");
  });
});
