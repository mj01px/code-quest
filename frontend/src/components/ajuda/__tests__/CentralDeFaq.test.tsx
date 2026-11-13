import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CentralDeFaq } from "@/components/ajuda/CentralDeFaq";
import { buscarNoFaq, CATEGORIAS_FAQ, normalizarBusca } from "@/lib/faq";

describe("CentralDeFaq", () => {
  beforeAll(() => {
    // O jsdom não implementa rolagem.
    Element.prototype.scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    window.history.replaceState(null, "", "/faq");
  });

  it("mostra só a primeira categoria ao abrir", () => {
    render(<CentralDeFaq categorias={CATEGORIAS_FAQ} />);

    expect(screen.getByRole("heading", { level: 2, name: "Começando" })).toBeInTheDocument();
    expect(screen.queryByText("Como funciona o ranking?")).toBeNull();
  });

  it("troca de categoria e guarda a escolha na URL", async () => {
    render(<CentralDeFaq categorias={CATEGORIAS_FAQ} />);

    const nav = screen.getByRole("navigation", { name: "Categorias do FAQ" });
    await userEvent.click(within(nav).getByRole("button", { name: /CLÃS/ }));

    expect(screen.getByRole("heading", { level: 2, name: "Clãs" })).toBeInTheDocument();
    expect(window.location.search).toBe("?categoria=clas");
  });

  it("abre uma pergunta por vez", async () => {
    render(<CentralDeFaq categorias={CATEGORIAS_FAQ} />);

    const idade = screen.getByRole("button", { name: /Tem idade mínima/ });
    const paga = screen.getByRole("button", { name: /Tenho que pagar/ });

    await userEvent.click(idade);
    expect(idade).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/16 anos completos/)).toBeInTheDocument();

    await userEvent.click(paga);
    expect(paga).toHaveAttribute("aria-expanded", "true");
    expect(idade).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/16 anos completos/)).toBeNull();
  });

  it("a busca procura em todas as categorias e mostra de onde veio", async () => {
    render(<CentralDeFaq categorias={CATEGORIAS_FAQ} />);

    await userEvent.type(screen.getByLabelText("Buscar no FAQ"), "ranking");

    expect(
      screen.getByRole("heading", { level: 2, name: "Resultados da busca" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Como funciona o ranking/ })).toBeInTheDocument();
    expect(screen.getAllByText("XP, RANKING E CONQUISTAS").length).toBeGreaterThan(0);
    expect(window.location.search).toBe("?q=ranking");
  });

  it("avisa quando a busca não acha nada", async () => {
    render(<CentralDeFaq categorias={CATEGORIAS_FAQ} />);

    await userEvent.type(screen.getByLabelText("Buscar no FAQ"), "xyzwq");

    expect(screen.getByText(/Nenhuma pergunta encontrada/)).toBeInTheDocument();
  });

  it("link direto pela âncora abre a categoria e a pergunta", async () => {
    window.history.replaceState(null, "", "/faq#ranking");
    render(<CentralDeFaq categorias={CATEGORIAS_FAQ} />);

    const pergunta = await screen.findByRole("button", { name: /Como funciona o ranking/ });
    expect(pergunta).toHaveAttribute("aria-expanded", "true");
  });

  it("a resposta vira link e negrito, sem mostrar a marcação", async () => {
    render(<CentralDeFaq categorias={CATEGORIAS_FAQ} />);

    await userEvent.click(screen.getByRole("button", { name: /Esqueci minha senha/ }));

    expect(screen.getByRole("link", { name: "recuperar senha" })).toHaveAttribute(
      "href",
      "/recuperar-senha",
    );
    expect(screen.queryByText(/\]\(/)).toBeNull();
  });
});

describe("conteúdo do FAQ", () => {
  it("toda pergunta tem âncora única", () => {
    const ids = CATEGORIAS_FAQ.flatMap((c) => c.perguntas.map((p) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("a busca ignora acento e caixa e exige todos os termos", () => {
    expect(normalizarBusca("Clã [Termos](/termos) **XP**")).toBe("cla termos xp");
    expect(buscarNoFaq(CATEGORIAS_FAQ, "CLA convite").map((r) => r.id)).toContain(
      "entrar-em-cla",
    );
    expect(buscarNoFaq(CATEGORIAS_FAQ, "   ")).toEqual([]);
  });
});
