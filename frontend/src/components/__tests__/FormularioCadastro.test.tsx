import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FormularioCadastro } from "@/components/auth/FormularioCadastro";
import { ErroApi } from "@/lib/api";

const empurrar = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: (rota: string) => empurrar(rota) }),
}));

const documentosLegais = jest.fn();
const registrar = jest.fn();

jest.mock("@/lib/api", () => {
  const real = jest.requireActual("@/lib/api");
  return {
    ...real,
    guardarSessao: jest.fn(),
    api: {
      documentosLegais: () => documentosLegais(),
      registrar: (dados: unknown) => registrar(dados),
    },
  };
});

const DOCUMENTOS = {
  termos: {
    documento: "TERMOS",
    rotulo: "Termos de Uso",
    versao: "1.0",
    vigente_desde: "2026-09-08",
    caminho: "/termos",
  },
  privacidade: {
    documento: "PRIVACIDADE",
    rotulo: "Protocolo de Dados",
    versao: "1.0",
    vigente_desde: "2026-09-08",
    caminho: "/privacidade",
  },
};

const SENHA = "trilha-de-python-8";

beforeEach(() => {
  empurrar.mockReset();
  registrar.mockReset();
  documentosLegais.mockReset().mockResolvedValue(DOCUMENTOS);
});

/** Preenche tudo menos o aceite, que é o que cada teste manipula. */
async function preencher(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(screen.getByLabelText("E-MAIL"), "novato@exemplo.com");
  await usuario.type(screen.getByLabelText("NICKNAME"), "novato");
  await usuario.type(screen.getByLabelText("SENHA"), SENHA);
  await usuario.type(screen.getByLabelText("CONFIRMAR SENHA"), SENHA);
}

function caixaDeAceite() {
  return screen.getByRole("checkbox");
}

describe("FormularioCadastro", () => {
  it("liga os links para os documentos, abrindo fora da aba", async () => {
    render(<FormularioCadastro />);

    const termos = await screen.findByRole("link", { name: "Termos de Uso" });
    expect(termos).toHaveAttribute("href", "/termos");
    expect(termos).toHaveAttribute("target", "_blank");

    expect(
      screen.getByRole("link", { name: "Protocolo de Dados" }),
    ).toHaveAttribute("href", "/privacidade");
  });

  it("começa com o aceite desmarcado", async () => {
    render(<FormularioCadastro />);

    await waitFor(() => expect(caixaDeAceite()).toBeEnabled());
    expect(caixaDeAceite()).not.toBeChecked();
  });

  it("não cria conta sem o aceite", async () => {
    const usuario = userEvent.setup();
    render(<FormularioCadastro />);
    await waitFor(() => expect(caixaDeAceite()).toBeEnabled());

    await preencher(usuario);
    await usuario.click(screen.getByRole("button", { name: "CRIAR CONTA" }));

    expect(registrar).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "É preciso aceitar os Termos de Uso e o Protocolo de Dados.",
      ),
    ).toBeInTheDocument();
  });

  it("envia as versões que a tela exibiu quando o aceite é dado", async () => {
    const usuario = userEvent.setup();
    registrar.mockResolvedValue({ access: "a", refresh: "r", usuario: {} });
    render(<FormularioCadastro />);
    await waitFor(() => expect(caixaDeAceite()).toBeEnabled());

    await preencher(usuario);
    await usuario.click(caixaDeAceite());
    await usuario.click(screen.getByRole("button", { name: "CRIAR CONTA" }));

    await waitFor(() => expect(registrar).toHaveBeenCalledTimes(1));
    expect(registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        aceite_documentos: true,
        versao_termos: "1.0",
        versao_privacidade: "1.0",
      }),
    );
    expect(empurrar).toHaveBeenCalledWith("/escolher-criatura");
  });

  it("mostra a versão vigente ao lado do aceite", async () => {
    render(<FormularioCadastro />);

    expect(await screen.findByText("(v1.0 e v1.0)")).toBeInTheDocument();
  });

  it("bloqueia o envio enquanto os documentos não chegam", () => {
    documentosLegais.mockReturnValue(new Promise(() => {}));
    render(<FormularioCadastro />);

    expect(screen.getByRole("button", { name: "CRIAR CONTA" })).toBeDisabled();
    expect(caixaDeAceite()).toBeDisabled();
  });

  it("avisa e mantém o envio travado se os documentos não carregarem", async () => {
    documentosLegais.mockRejectedValue(new Error("offline"));
    render(<FormularioCadastro />);

    expect(await screen.findByText(/não foi possível carregar os termos/i))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CRIAR CONTA" })).toBeDisabled();
  });

  it("mostra o erro de aceite que vem do servidor", async () => {
    const usuario = userEvent.setup();
    registrar.mockRejectedValue(
      new ErroApi(400, "validacao", "Requisição inválida.", [
        {
          field: "aceite_documentos",
          code: "aceite_obrigatorio",
          message: "É preciso aceitar os documentos para criar a conta.",
        },
      ]),
    );
    render(<FormularioCadastro />);
    await waitFor(() => expect(caixaDeAceite()).toBeEnabled());

    await preencher(usuario);
    await usuario.click(caixaDeAceite());
    await usuario.click(screen.getByRole("button", { name: "CRIAR CONTA" }));

    expect(
      await screen.findByText(
        "É preciso aceitar os documentos para criar a conta.",
      ),
    ).toBeInTheDocument();
  });

  it("cai no aviso geral quando o erro é de um campo que a tela não mostra", async () => {
    const usuario = userEvent.setup();
    registrar.mockRejectedValue(
      new ErroApi(400, "validacao", "Os documentos foram atualizados.", [
        {
          field: "versao_termos",
          code: "versao_desatualizada",
          message: "Os documentos foram atualizados.",
        },
      ]),
    );
    render(<FormularioCadastro />);
    await waitFor(() => expect(caixaDeAceite()).toBeEnabled());

    await preencher(usuario);
    await usuario.click(caixaDeAceite());
    await usuario.click(screen.getByRole("button", { name: "CRIAR CONTA" }));

    expect(
      await screen.findByText("Os documentos foram atualizados."),
    ).toBeInTheDocument();
  });
});
