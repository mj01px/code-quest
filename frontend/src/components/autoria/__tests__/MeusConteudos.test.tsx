import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { aula } from "@/components/__tests__/fixtures";
import { MeusConteudos } from "@/components/autoria/MeusConteudos";
import { ErroApi } from "@/lib/api";
import type { ItemEditorial } from "@/lib/types";

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  api: {
    autoriaMeusConteudos: jest.fn(),
    detalheEditorial: jest.fn(),
    editarRascunho: jest.fn(),
  },
}));

const mock = jest.requireMock<{ api: Record<string, jest.Mock> }>("@/lib/api");

const ITENS: ItemEditorial[] = [
  { id: 1, tipo: "trilhas", titulo: "Lógica", status_editorial: "PUBLICADO" },
  { id: 2, tipo: "aulas", titulo: "Variáveis", status_editorial: "APROVADO" },
  { id: 3, tipo: "exercicios", titulo: "Média", status_editorial: "REVISAO" },
  { id: 4, tipo: "aulas", titulo: "Laços", status_editorial: "RASCUNHO" },
];

beforeEach(() => {
  jest.clearAllMocks();
  mock.api.autoriaMeusConteudos.mockResolvedValue(ITENS);
});

function linha(titulo: string) {
  return within(screen.getByText(titulo).closest("li") as HTMLElement);
}

describe("MeusConteudos", () => {
  it("mostra título, tipo e status de cada item", async () => {
    render(<MeusConteudos podeEditar />);

    await screen.findByText("Lógica");
    expect(linha("Lógica").getByText("TRILHA")).toBeInTheDocument();
    expect(linha("Lógica").getByText("PUBLICADO")).toBeInTheDocument();
    expect(linha("Variáveis").getByText("AULA")).toBeInTheDocument();
    expect(linha("Variáveis").getByText("APROVADO")).toBeInTheDocument();
    expect(linha("Média").getByText("EXERCÍCIO")).toBeInTheDocument();
    expect(linha("Média").getByText("EM REVISÃO")).toBeInTheDocument();
    expect(linha("Laços").getByText("RASCUNHO")).toBeInTheDocument();
  });

  it("o botão de editar aparece em tudo, menos no que está em revisão", async () => {
    render(<MeusConteudos podeEditar />);

    // A trilha abre o editor completo; aula e exercício abrem o modal.
    expect(await screen.findByRole("link", { name: "Editar: Lógica" })).toHaveAttribute(
      "href",
      "/autoria/novo?trilha_id=1",
    );
    expect(screen.getByRole("button", { name: "Editar: Variáveis" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar: Laços" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar: Média" })).toBeNull();
    // A lista é para acompanhar e editar: excluir fica na aba de produção.
    expect(screen.queryByRole("button", { name: /^Excluir:/ })).toBeNull();
  });

  it("sem permissão de criar, nenhum botão de editar aparece", async () => {
    render(<MeusConteudos podeEditar={false} />);

    await screen.findByText("Lógica");
    expect(screen.queryByRole("link", { name: /^Editar:/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Editar:/ })).toBeNull();
  });

  it("editar o aprovado abre o modal com os dados e o aviso, e salvar relê a lista", async () => {
    const u = userEvent.setup();
    mock.api.detalheEditorial.mockResolvedValue(
      aula({ id: 2, titulo: "Variáveis", conteudo: "Texto atual" }),
    );
    mock.api.editarRascunho.mockResolvedValue({});
    const aoAlterar = jest.fn();
    render(<MeusConteudos podeEditar aoAlterar={aoAlterar} />);
    await screen.findByText("Variáveis");
    // A releitura depois de salvar traz o que o backend fez: voltou para revisão.
    mock.api.autoriaMeusConteudos.mockResolvedValue([
      { id: 2, tipo: "aulas", titulo: "Variáveis e tipos", status_editorial: "REVISAO" },
    ]);

    await u.click(await screen.findByRole("button", { name: "Editar: Variáveis" }));

    const modal = within(await screen.findByRole("dialog"));
    const titulo = await modal.findByLabelText("TÍTULO");
    expect(titulo).toHaveValue("Variáveis");
    expect(modal.getByRole("note")).toHaveTextContent(/volta para\s+revisão/);
    await u.clear(titulo);
    await u.type(titulo, "Variáveis e tipos");
    await u.click(modal.getByRole("button", { name: "SALVAR" }));

    expect(mock.api.editarRascunho).toHaveBeenCalledWith("aulas", 2, {
      titulo: "Variáveis e tipos",
      conteudo: "Texto atual",
    });
    expect(mock.api.autoriaMeusConteudos).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Variáveis e tipos")).toBeInTheDocument();
    expect(linha("Variáveis e tipos").getByText("EM REVISÃO")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Editar:/ })).toBeNull();
    // O painel recarrega aprovados e fila: o item mudou de lista.
    expect(aoAlterar).toHaveBeenCalledTimes(1);
  });

  it("editar o rascunho não mostra o aviso de revisão", async () => {
    const u = userEvent.setup();
    mock.api.detalheEditorial.mockResolvedValue(aula({ id: 4, titulo: "Laços" }));
    render(<MeusConteudos podeEditar />);

    await u.click(await screen.findByRole("button", { name: "Editar: Laços" }));

    const modal = within(await screen.findByRole("dialog"));
    await modal.findByLabelText("TÍTULO");
    expect(modal.queryByRole("note")).toBeNull();
  });

  it("lista vazia e falha de carga têm mensagem própria", async () => {
    mock.api.autoriaMeusConteudos.mockResolvedValueOnce([]);
    const { unmount } = render(<MeusConteudos podeEditar />);
    expect(await screen.findByText("Você ainda não criou nenhum conteúdo.")).toBeInTheDocument();
    unmount();

    mock.api.autoriaMeusConteudos.mockRejectedValueOnce(new ErroApi(429, "throttled", "Calma."));
    render(<MeusConteudos podeEditar />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Calma.");
  });
});
