import { render, screen, waitFor } from "@testing-library/react";

import { Sidebar } from "@/components/layout/Sidebar";
import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";

// Sem sessão no jsdom, a identidade fica no estado neutro: é ele que os
// testes de perfil abaixo observam. O provedor entra porque a identidade lê
// dele — sem sessão ele não vai à rede, e o neutro é o mesmo de antes.

// O provedor sempre assenta uma vez depois de montar, mesmo sem sessão: sem
// esperar por isso, sobra `act()` pendente.
async function montar(no: React.ReactNode) {
  const r = render(<ProvedorProgresso>{no}</ProvedorProgresso>);
  await waitFor(() =>
    expect(document.querySelector("[aria-busy='false']")).toBeInTheDocument(),
  );
  return r;
}

describe("Sidebar", () => {
  it("liga o que já tem rota", async () => {
    await montar(<Sidebar />);

    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/trilhas",
      "/trilhas",
      "/desafios",
    ]);
  });

  it("marca como desabilitado o que ainda não existe", async () => {
    await montar(<Sidebar />);

    for (const rotulo of [
      "Conquistas",
      "Configurações",
      "Adicionar conteúdo",
    ]) {
      expect(screen.getByText(rotulo).closest("[aria-disabled]")).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    }
  });

  it("mostra o perfil neutro enquanto a gamificação não fornece dados", async () => {
    await montar(<Sidebar />);

    expect(screen.getByText("Visitante")).toBeInTheDocument();
    expect(screen.getByText("Nível 1")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });

  it("usa o perfil recebido quando ele existe", async () => {
    await montar(
      <Sidebar
        perfil={{ nome: "Ana", nivel: 12, xp: 4450, xpDoProximoNivel: 10000 }}
      />,
    );

    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Nível 12")).toBeInTheDocument();
    expect(screen.getByText("4450 / 10000 XP")).toBeInTheDocument();
  });
});
