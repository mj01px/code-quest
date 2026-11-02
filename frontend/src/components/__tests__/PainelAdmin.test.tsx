import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  minhaCriatura,
  progressoAtual,
  usuario,
} from "@/components/__tests__/fixtures";
import { PainelAdmin } from "@/components/admin/PainelAdmin";
import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";

jest.mock("@/lib/api", () => ({
  temSessao: jest.fn(),
  ErroApi: class ErroApi extends Error {},
  api: {
    eu: jest.fn(),
    minhasCriaturas: jest.fn(),
    meuProgresso: jest.fn(),
    minhaSequencia: jest.fn(),
    exerciciosConcluidos: jest.fn(),
    trilhasIniciadas: jest.fn(),
    adminUsuarios: jest.fn(),
    adminNiveis: jest.fn(),
    adminPermissoes: jest.fn(),
    adminDashboard: jest.fn(),
    adminLogs: jest.fn(),
    adminAtribuirNivel: jest.fn(),
    adminExcluirUsuario: jest.fn(),
    mfaStatus: jest.fn(),
  },
}));

const substituirRota = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: substituirRota }),
}));

const mock = jest.requireMock<{
  temSessao: jest.Mock;
  api: {
    eu: jest.Mock;
    minhasCriaturas: jest.Mock;
    meuProgresso: jest.Mock;
    minhaSequencia: jest.Mock;
    exerciciosConcluidos: jest.Mock;
    trilhasIniciadas: jest.Mock;
    adminUsuarios: jest.Mock;
    adminNiveis: jest.Mock;
    adminPermissoes: jest.Mock;
    adminDashboard: jest.Mock;
    adminLogs: jest.Mock;
    adminAtribuirNivel: jest.Mock;
    adminExcluirUsuario: jest.Mock;
    mfaStatus: jest.Mock;
  };
}>("@/lib/api");

function montar() {
  return render(
    <ProvedorProgresso>
      <PainelAdmin />
    </ProvedorProgresso>,
  );
}

const titulo = () =>
  screen.queryByRole("heading", { name: /administrador/i });

beforeEach(() => {
  jest.clearAllMocks();
  mock.temSessao.mockReturnValue(true);
  mock.api.eu.mockResolvedValue(usuario());
  mock.api.minhasCriaturas.mockResolvedValue([minhaCriatura()]);
  mock.api.meuProgresso.mockResolvedValue(progressoAtual());
  mock.api.minhaSequencia.mockResolvedValue({
    atual: 0,
    recorde: 0,
    feito_hoje: false,
    ultimo_dia: null,
  });
  mock.api.exerciciosConcluidos.mockResolvedValue([]);
  mock.api.trilhasIniciadas.mockResolvedValue([]);
  mock.api.adminUsuarios.mockResolvedValue([]);
  mock.api.adminNiveis.mockResolvedValue([]);
  mock.api.adminPermissoes.mockResolvedValue([]);
  mock.api.adminDashboard.mockResolvedValue(dashboard());
  mock.api.adminLogs.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
});

function dashboard() {
  return {
    total_usuarios: 42,
    trilhas_publicadas: 3,
    fila_revisao: 5,
    submissoes_judge: 1234,
    novos_usuarios_semana: [
      { dia: "Seg", data: "2026-10-19", quantidade: 2 },
      { dia: "Ter", data: "2026-10-20", quantidade: 1 },
    ],
    submissoes_semana: [
      { dia: "Seg", data: "2026-10-19", aprovadas: 4, rejeitadas: 1 },
    ],
  };
}

const admin = (extra = {}) =>
  usuario({ is_admin: true, permissoes: ["auditoria.view"], ...extra });

describe("PainelAdmin: guarda de papel", () => {
  it("mostra o painel para administrador", async () => {
    mock.api.eu.mockResolvedValue(usuario({ is_admin: true }));
    montar();

    await waitFor(() => expect(titulo()).toBeInTheDocument());
    expect(substituirRota).not.toHaveBeenCalled();
  });

  it("redireciona aluno para /trilhas e não vaza o painel", async () => {
    montar();

    await waitFor(() =>
      expect(substituirRota).toHaveBeenCalledWith("/trilhas"),
    );
    expect(titulo()).toBeNull();
  });

  it("sem sessão vai para /entrar", async () => {
    mock.temSessao.mockReturnValue(false);
    montar();

    await waitFor(() =>
      expect(substituirRota).toHaveBeenCalledWith("/entrar"),
    );
    expect(titulo()).toBeNull();
  });
});

describe("PainelAdmin: dashboard como página principal", () => {
  it("abre direto nos big numbers e gráficos, sem abas", async () => {
    mock.api.eu.mockResolvedValue(admin());
    montar();

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("+3 na semana")).toBeInTheDocument();
    expect(screen.getByText("1.234")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Seg: 4 Aprovadas e 1 Rejeitadas/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Ter: 1 Cadastros/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "USUÁRIOS" })).toBeNull();
    expect(screen.queryByRole("button", { name: "DASHBOARD" })).toBeNull();
  });
});

describe("PainelAdmin: logs paginados", () => {
  const log = (n: number) => ({
    id: `log-${n}`,
    criado_em: "2026-10-20T12:00:00Z",
    usuario: "maria",
    acao: "LOGIN_OK",
    acao_rotulo: "Login bem-sucedido",
    detalhes: "",
  });

  it("mostra a primeira página e navega para a próxima", async () => {
    mock.api.eu.mockResolvedValue(admin());
    mock.api.adminLogs.mockResolvedValue({
      count: 25,
      next: "x",
      previous: null,
      results: Array.from({ length: 10 }, (_, i) => log(i)),
    });
    montar();

    expect(await screen.findByText("25 REGISTROS")).toBeInTheDocument();
    expect(screen.getAllByText("Login bem-sucedido")).toHaveLength(10);
    const paginacao = screen.getByRole("navigation", { name: "Paginação dos logs" });
    expect(paginacao).toHaveTextContent("PÁGINA01/de03");
    expect(within(paginacao).getByRole("button", { name: "‹ ANTERIOR" })).toBeDisabled();

    await userEvent.click(within(paginacao).getByRole("button", { name: "PRÓXIMA ›" }));
    await userEvent.click(within(paginacao).getByRole("button", { name: "PRÓXIMA ›" }));

    expect(mock.api.adminLogs).toHaveBeenLastCalledWith(3);
    expect(paginacao).toHaveTextContent("PÁGINA03/de03");
    expect(within(paginacao).getByRole("button", { name: "PRÓXIMA ›" })).toBeDisabled();
    expect(within(paginacao).getByRole("button", { name: "‹ ANTERIOR" })).toBeEnabled();
  });

  it("sem auditoria.view a seção nem aparece", async () => {
    mock.api.eu.mockResolvedValue(usuario({ is_admin: true }));
    montar();

    await screen.findByText("42");
    expect(screen.queryByRole("heading", { name: "Logs de auditoria" })).toBeNull();
    expect(mock.api.adminLogs).not.toHaveBeenCalled();
  });
});

describe("PainelAdmin: modal Atribuir nível", () => {
  const nivelAdmin = {
    id: "n-admin",
    nome: "Admin",
    descricao: "",
    sistema: true,
    acesso_admin: true,
    permissoes: [],
    qtd_usuarios: 2,
    criado_em: "2026-10-01T12:00:00Z",
  };
  const maria = {
    id: "u-maria",
    nickname: "maria",
    email: "maria@example.com",
    criado_em: "2026-10-01T12:00:00Z",
    nivel: null,
  };
  const outroAdmin = {
    ...maria,
    id: "u-chefe",
    nickname: "chefe",
    nivel: { id: "n-admin", nome: "Admin" },
  };

  beforeEach(() => {
    mock.api.eu.mockResolvedValue(admin());
    mock.api.adminNiveis.mockResolvedValue([nivelAdmin]);
    mock.api.adminUsuarios.mockResolvedValue([
      maria,
      outroAdmin,
      { ...outroAdmin, id: usuario().id, nickname: "eu_admin" },
    ]);
    mock.api.adminAtribuirNivel.mockResolvedValue({ ...maria, nivel: { id: "n-admin", nome: "Admin" } });
    mock.api.adminExcluirUsuario.mockResolvedValue(undefined);
    mock.api.mfaStatus.mockResolvedValue({ ativo: true, metodo: "APP" });
  });

  async function abrirModal() {
    montar();
    await userEvent.click(await screen.findByRole("button", { name: "ATRIBUIR NÍVEL" }));
    return screen.findByRole("dialog");
  }

  async function irParaNivelDe(nome: string) {
    const modal = await abrirModal();
    await userEvent.click(await within(modal).findByRole("button", { name: new RegExp(`^${nome} `) }));
    await userEvent.click(within(modal).getByRole("button", { name: "PRÓXIMO" }));
    return modal;
  }

  async function abrirExclusaoDaMaria() {
    await irParaNivelDe("maria");
    await userEvent.click(screen.getByRole("button", { name: "EXCLUIR CONTA…" }));
    await screen.findByLabelText(/CÓDIGO DO AUTENTICADOR/);
  }

  it("busca pela API depois que a digitação para", async () => {
    const modal = await abrirModal();
    await userEvent.type(within(modal).getByRole("searchbox"), "mar");

    await waitFor(() => expect(mock.api.adminUsuarios).toHaveBeenLastCalledWith("mar"));
    expect(mock.api.adminUsuarios).not.toHaveBeenCalledWith("m");
  });

  it("não deixa escolher a própria conta e explica o motivo", async () => {
    const modal = await abrirModal();

    const eu = await within(modal).findByRole("button", { name: /eu_admin/ });
    expect(eu).toBeDisabled();
    expect(eu).toHaveAccessibleDescription("Você não pode alterar seu próprio nível");
    expect(within(modal).getByRole("button", { name: "PRÓXIMO" })).toBeDisabled();
  });

  it("escolhe usuário, nível e confirma em três passos", async () => {
    const modal = await irParaNivelDe("maria");

    expect(within(modal).getByRole("button", { name: "PRÓXIMO" })).toBeDisabled();
    await userEvent.click(within(modal).getByRole("radio", { name: /Admin/ }));
    await userEvent.click(within(modal).getByRole("button", { name: "PRÓXIMO" }));

    expect(modal).toHaveTextContent("Sem nível → Admin");
    expect(modal).toHaveTextContent("Vai ganhar acesso ao painel admin.");
    await userEvent.click(within(modal).getByRole("button", { name: "APLICAR" }));

    expect(mock.api.adminAtribuirNivel).toHaveBeenCalledWith("u-maria", "n-admin");
    expect(await screen.findByRole("status")).toHaveTextContent("maria: Sem nível → Admin.");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("não oferece excluir conta de outro admin", async () => {
    await irParaNivelDe("chefe");

    expect(screen.queryByRole("button", { name: "EXCLUIR CONTA…" })).toBeNull();
  });

  it("admin só com 2FA por e-mail é avisado e não consegue confirmar", async () => {
    mock.api.mfaStatus.mockResolvedValue({ ativo: true, metodo: "EMAIL" });
    await irParaNivelDe("maria");
    await userEvent.click(screen.getByRole("button", { name: "EXCLUIR CONTA…" }));

    expect(await screen.findByRole("note")).toHaveTextContent(/exigem o aplicativo autenticador/);
    expect(screen.getByRole("link", { name: "Configurações" })).toHaveAttribute("href", "/configuracoes");
    expect(screen.queryByLabelText(/CÓDIGO DO AUTENTICADOR/)).toBeNull();
    expect(screen.getByRole("button", { name: "ANONIMIZAR" })).toBeDisabled();
  });

  it("sem código 2FA o botão de anonimizar fica desabilitado", async () => {
    await abrirExclusaoDaMaria();

    expect(screen.getByRole("button", { name: "ANONIMIZAR" })).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/CÓDIGO DO AUTENTICADOR/), "12ab34");
    expect(screen.getByLabelText(/CÓDIGO DO AUTENTICADOR/)).toHaveValue("1234");
    await userEvent.clear(screen.getByLabelText(/CÓDIGO DO AUTENTICADOR/));
    await userEvent.click(screen.getByLabelText(/CÓDIGO DO AUTENTICADOR/));
    await userEvent.paste("123 456");
    expect(screen.getByLabelText(/CÓDIGO DO AUTENTICADOR/)).toHaveValue("123456");
    expect(screen.getByRole("button", { name: "ANONIMIZAR" })).toBeEnabled();
    expect(mock.api.adminExcluirUsuario).not.toHaveBeenCalled();
  });

  it("falha na exclusão mantém o modal aberto com o erro", async () => {
    const { ErroApi } = jest.requireMock<{ ErroApi: new (m: string) => Error }>(
      "@/lib/api",
    );
    mock.api.adminExcluirUsuario.mockRejectedValue(
      new ErroApi("Código do autenticador inválido."),
    );
    await abrirExclusaoDaMaria();
    await userEvent.type(screen.getByLabelText(/CÓDIGO DO AUTENTICADOR/), "000000");
    await userEvent.click(screen.getByRole("button", { name: "ANONIMIZAR" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/autenticador inválido/);
    expect(screen.getByLabelText(/CÓDIGO DO AUTENTICADOR/)).toHaveValue("");
    expect(screen.getByLabelText(/CÓDIGO DO AUTENTICADOR/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("envia o código 2FA, anonimiza e avisa", async () => {
    await abrirExclusaoDaMaria();

    expect(screen.getByRole("dialog")).toHaveTextContent(
      /conformidade com a LGPD, esta ação anonimizará os dados pessoais/,
    );
    await userEvent.type(screen.getByLabelText(/CÓDIGO DO AUTENTICADOR/), "123456");
    await userEvent.click(screen.getByRole("button", { name: "ANONIMIZAR" }));

    expect(mock.api.adminExcluirUsuario).toHaveBeenCalledWith("u-maria", "123456");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Dados de maria anonimizados.",
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("PainelAdmin: modal Níveis de acesso", () => {
  it("abre os níveis no modal e trava a edição do próprio nível", async () => {
    const nivel = (id: string, nome: string) => ({
      id,
      nome,
      descricao: "",
      sistema: false,
      acesso_admin: true,
      permissoes: [],
      qtd_usuarios: 1,
      criado_em: "2026-10-01T12:00:00Z",
    });
    mock.api.eu.mockResolvedValue(admin({ nivel_id: "n-meu" }));
    mock.api.adminNiveis.mockResolvedValue([nivel("n-meu", "Admin"), nivel("n-outro", "Monitor")]);
    montar();

    await userEvent.click(await screen.findByRole("button", { name: "NÍVEIS DE ACESSO" }));
    const modal = await screen.findByRole("dialog", { name: "Níveis de acesso" });
    const editar = await within(modal).findAllByRole("button", { name: "EDITAR" });

    expect(editar[0]).toBeDisabled();
    expect(editar[0]).toHaveAccessibleDescription("SEU NÍVEL");
    expect(editar[1]).toBeEnabled();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
