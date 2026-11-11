import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EditorDeSecoes } from "@/components/autoria/EditorDeSecoes";

function montar(inicial = "") {
  const aoMudar = jest.fn();
  render(<EditorDeSecoes id="t" inicial={inicial} aoMudar={aoMudar} />);
  const ultima = () => aoMudar.mock.calls.at(-1) as [string, boolean];
  return { aoMudar, ultima };
}

describe("EditorDeSecoes", () => {
  it("aula nova começa com uma seção; título e texto viram ## no Markdown e item do índice", async () => {
    const u = userEvent.setup();
    const { ultima } = montar();

    await u.type(screen.getByLabelText("INTRODUÇÃO (OPCIONAL)"), "Abertura.");
    await u.type(screen.getByLabelText("TÍTULO DA SEÇÃO 1"), "Tipos");
    await u.type(screen.getByLabelText("TEXTO DA SEÇÃO 1"), "Um texto.");

    expect(ultima()).toEqual(["Abertura.\n\n## Tipos\n\nUm texto.", true]);
    const indice = screen.getByRole("list", { name: "Prévia do índice" });
    expect(within(indice).getByText("Tipos")).toBeInTheDocument();
    // A prévia é a do aluno, embutida: título um nível abaixo e sem âncora (id repetido na página).
    expect(screen.getByRole("heading", { name: "Tipos", level: 5 })).not.toHaveAttribute("id");
  });

  it("seção com texto e sem título não fica completa e avisa o autor", async () => {
    const u = userEvent.setup();
    const { ultima } = montar();

    await u.type(screen.getByLabelText("TEXTO DA SEÇÃO 1"), "Sem título.");

    expect(ultima()[1]).toBe(false);
    expect(screen.getByText(/Dê um título/)).toBeInTheDocument();
  });

  it("carrega a lição salva em seções, sem cortar ## de dentro do código", () => {
    montar("Abertura.\n\n## Um\n\n```\n## comentário\n```\n\n## Dois\n\nFim.");

    expect(screen.getByLabelText("INTRODUÇÃO (OPCIONAL)")).toHaveValue("Abertura.");
    expect(screen.getByLabelText("TÍTULO DA SEÇÃO 1")).toHaveValue("Um");
    expect(screen.getByLabelText("TEXTO DA SEÇÃO 1")).toHaveValue("```\n## comentário\n```");
    expect(screen.getByLabelText("TÍTULO DA SEÇÃO 2")).toHaveValue("Dois");
    expect(screen.queryByLabelText("TÍTULO DA SEÇÃO 3")).toBeNull();
  });

  it("sobe, desce, remove e adiciona seções", async () => {
    const u = userEvent.setup();
    const { ultima } = montar("## A\n\na\n\n## B\n\nb");

    expect(screen.getByRole("button", { name: "Subir seção 1" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Descer seção 2" })).toBeDisabled();

    await u.click(screen.getByRole("button", { name: "Subir seção 2" }));
    expect(ultima()).toEqual(["## B\n\nb\n\n## A\n\na", true]);

    await u.click(screen.getByRole("button", { name: "Remover seção 1" }));
    expect(ultima()).toEqual(["## A\n\na", true]);

    await u.click(screen.getByRole("button", { name: "+ ADICIONAR SEÇÃO" }));
    expect(screen.getByLabelText("TÍTULO DA SEÇÃO 2")).toHaveValue("");
    // Seção nova e vazia não entra no Markdown nem trava o salvar...
    expect(ultima()).toEqual(["## A\n\na", true]);
    expect(screen.queryByText("##")).toBeNull();
    // ...mas, com texto e sem título, trava.
    await u.type(screen.getByLabelText("TEXTO DA SEÇÃO 2"), "b");
    expect(ultima()[1]).toBe(false);
  });

  it("texto do autor entra como texto, nunca como HTML", async () => {
    const u = userEvent.setup();
    montar();

    await u.type(screen.getByLabelText("TÍTULO DA SEÇÃO 1"), "X");
    await u.type(screen.getByLabelText("TEXTO DA SEÇÃO 1"), "<img src=x onerror=alert(1)>");

    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByText("<img src=x onerror=alert(1)>", { selector: "span" })).toBeInTheDocument();
  });
});
