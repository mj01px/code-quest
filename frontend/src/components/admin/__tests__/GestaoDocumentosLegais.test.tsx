import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GestaoDocumentosLegais } from "@/components/admin/GestaoDocumentosLegais";
import { ErroApi } from "@/lib/api";
import type { VersaoDeDocumento } from "@/lib/types";

const substituir = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: substituir }),
}));

let permissoes = ["documentos.manage"];

jest.mock("@/components/progresso/ProvedorProgresso", () => ({
  useProgresso: () => ({
    usuario: { is_admin: true, permissoes },
    carregando: false,
    erro: null,
  }),
}));

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  api: {
    adminVersoesDeDocumentos: jest.fn(),
    adminCriarVersaoDeDocumento: jest.fn(),
    adminAtualizarVersaoDeDocumento: jest.fn(),
    adminExcluirVersaoDeDocumento: jest.fn(),
    adminPublicarVersaoDeDocumento: jest.fn(),
  },
}));

const mock = jest.requireMock<{ api: Record<string, jest.Mock> }>("@/lib/api");

function versao(extra: Partial<VersaoDeDocumento>): VersaoDeDocumento {
  return {
    id: `${extra.documento ?? "TERMOS"}-${extra.versao ?? "1.3"}`,
    documento: "TERMOS",
    rotulo: "Termos de Uso",
    versao: "1.3",
    conteudo: "## Quem pode criar conta\n\nTexto vigente.",
    situacao: "PUBLICADA",
    vigente_desde: "2026-11-19",
    vigente: true,
    criado_por: null,
    criado_em: "2026-11-19T12:00:00Z",
    atualizado_em: "2026-11-19T12:00:00Z",
    publicado_por: "admin",
    publicado_em: "2026-11-19T12:00:00Z",
    ...extra,
  };
}

const VIGENTES = [
  versao({}),
  versao({ documento: "PRIVACIDADE", rotulo: "Política de Privacidade" }),
];

function secao(nome: RegExp) {
  return screen.getByRole("region", { name: nome });
}

beforeEach(() => {
  jest.clearAllMocks();
  permissoes = ["documentos.manage"];
  mock.api.adminVersoesDeDocumentos.mockResolvedValue(VIGENTES);
});

describe("GestaoDocumentosLegais", () => {
  it("manda de volta ao painel quem não tem a permissão", async () => {
    permissoes = [];
    render(<GestaoDocumentosLegais />);

    await waitFor(() => expect(substituir).toHaveBeenCalledWith("/admin"));
    expect(mock.api.adminVersoesDeDocumentos).not.toHaveBeenCalled();
  });

  it("mostra a versão vigente de cada documento", async () => {
    render(<GestaoDocumentosLegais />);

    const termos = await screen.findByRole("region", { name: "Termos de Uso" });
    expect(within(termos).getByText(/VIGENTE: VERSÃO 1\.3 DESDE 19\/11\/2026/)).toBeInTheDocument();
    expect(secao(/Política de Privacidade/)).toBeInTheDocument();
  });

  it("cria um rascunho partindo do texto vigente e da próxima versão", async () => {
    const criado = versao({ id: "novo", versao: "1.4", situacao: "RASCUNHO", vigente: false });
    mock.api.adminCriarVersaoDeDocumento.mockResolvedValue(criado);
    render(<GestaoDocumentosLegais />);

    const termos = await screen.findByRole("region", { name: "Termos de Uso" });
    await userEvent.click(within(termos).getByRole("button", { name: "+ NOVA VERSÃO" }));

    expect(within(termos).getByLabelText("VERSÃO")).toHaveValue("1.4");
    expect(within(termos).getByLabelText("Texto do documento")).toHaveValue(
      "## Quem pode criar conta\n\nTexto vigente.",
    );

    mock.api.adminVersoesDeDocumentos.mockResolvedValue([...VIGENTES, criado]);
    await userEvent.click(within(termos).getByRole("button", { name: "SALVAR RASCUNHO" }));

    expect(mock.api.adminCriarVersaoDeDocumento).toHaveBeenCalledWith(
      expect.objectContaining({ documento: "TERMOS", versao: "1.4" }),
    );
    expect(await within(termos).findByText("RASCUNHO")).toBeInTheDocument();
  });

  it("pré-visualiza o Markdown como o usuário vai ver", async () => {
    render(<GestaoDocumentosLegais />);

    const termos = await screen.findByRole("region", { name: "Termos de Uso" });
    await userEvent.click(within(termos).getByRole("button", { name: "+ NOVA VERSÃO" }));
    await userEvent.click(within(termos).getByRole("button", { name: "PRÉ-VISUALIZAR" }));

    expect(
      within(termos).getByRole("heading", { level: 2, name: /Quem pode criar conta/ }),
    ).toBeInTheDocument();
  });

  it("só publica depois de confirmar", async () => {
    const rascunho = versao({ id: "r1", versao: "1.4", situacao: "RASCUNHO", vigente: false });
    mock.api.adminVersoesDeDocumentos.mockResolvedValue([...VIGENTES, rascunho]);
    mock.api.adminPublicarVersaoDeDocumento.mockResolvedValue({
      ...rascunho,
      situacao: "PUBLICADA",
    });
    render(<GestaoDocumentosLegais />);

    const termos = await screen.findByRole("region", { name: "Termos de Uso" });
    await userEvent.click(within(termos).getByRole("button", { name: "PUBLICAR" }));
    expect(mock.api.adminPublicarVersaoDeDocumento).not.toHaveBeenCalled();
    expect(within(termos).getByRole("alertdialog")).toHaveTextContent(
      "não pode mais ser editada nem excluída",
    );

    await userEvent.click(within(termos).getByRole("button", { name: "CONFIRMAR PUBLICAÇÃO" }));

    expect(mock.api.adminPublicarVersaoDeDocumento).toHaveBeenCalledWith("r1");
    expect(await screen.findByRole("status")).toHaveTextContent("Termos de Uso 1.4 publicada");
  });

  it("mostra o erro de validação do backend", async () => {
    mock.api.adminCriarVersaoDeDocumento.mockRejectedValue(
      new ErroApi(400, "validacao", "A versão precisa ser maior que a 1.3, a última publicada."),
    );
    render(<GestaoDocumentosLegais />);

    const termos = await screen.findByRole("region", { name: "Termos de Uso" });
    await userEvent.click(within(termos).getByRole("button", { name: "+ NOVA VERSÃO" }));
    await userEvent.click(within(termos).getByRole("button", { name: "SALVAR RASCUNHO" }));

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("maior que a 1.3");
    expect(within(termos).getByRole("alert")).toBe(alerta);
  });

  it("chama de agendada a versão publicada com vigência futura", async () => {
    mock.api.adminVersoesDeDocumentos.mockResolvedValue([
      ...VIGENTES,
      versao({ id: "futura", versao: "1.4", vigente: false, vigente_desde: "2999-01-01" }),
    ]);
    render(<GestaoDocumentosLegais />);

    const termos = await screen.findByRole("region", { name: "Termos de Uso" });
    expect(within(termos).getByText(/agendada para 01\/01\/2999/)).toBeInTheDocument();
    expect(within(termos).getByText(/AGENDADA: VERSÃO 1\.4/)).toBeInTheDocument();
  });
});
