import { render, screen, waitFor } from "@testing-library/react";
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
    adminSolicitacoes: jest.fn(),
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
    adminSolicitacoes: jest.Mock;
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
});

describe("PainelAdmin: guarda de papel", () => {
  it("API fora com sessão viva mostra aviso, sem mandar para /entrar", async () => {
    // Antes, falha virava "deslogado" e o aluno era expulso em loop.
    mock.api.eu.mockRejectedValue(new Error("HTTP 500"));
    montar();

    expect(
      await screen.findByText("Serviço indisponível, tente novamente em instantes."),
    ).toBeInTheDocument();
    expect(substituirRota).not.toHaveBeenCalled();
  });

  it("mostra o painel para administrador", async () => {
    mock.api.eu.mockResolvedValue(usuario({ is_admin: true }));
    montar();

    await waitFor(() => expect(titulo()).toBeInTheDocument());
    expect(substituirRota).not.toHaveBeenCalled();
  });

  it("admin cuida de pessoas: a aba é Solicitações de Autor, sem revisão de conteúdo", async () => {
    mock.api.eu.mockResolvedValue(usuario({ is_admin: true }));
    mock.api.adminSolicitacoes.mockResolvedValue([]);
    montar();

    await userEvent.click(
      await screen.findByRole("button", { name: "SOLICITAÇÕES DE AUTOR" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Solicitações de Acesso à Autoria" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "APROVAÇÕES" })).toBeNull();
    expect(screen.queryByRole("button", { name: /REVISÃO DE CONTEÚDO/ })).toBeNull();
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

describe("PainelAdmin: aba Dashboard", () => {
  it("mostra big numbers, gráficos de gestão e logs", async () => {
    mock.api.eu.mockResolvedValue(usuario({ is_admin: true }));
    mock.api.adminDashboard.mockResolvedValue({
      total_usuarios: 42,
      trilhas_publicadas: 3,
      fila_revisao: 5,
      submissoes_judge: 1234,
      media_xp_por_usuario: 150.5,
      media_submissoes_por_usuario: 29.4,
      taxa_aprovacao_submissoes: 75,
      novos_usuarios_semana: [
        { dia: "Seg", data: "2026-10-19", quantidade: 2 },
        { dia: "Ter", data: "2026-10-20", quantidade: 1 },
      ],
      submissoes_semana: [
        { dia: "Seg", data: "2026-10-19", aprovadas: 4, rejeitadas: 1 },
      ],
      logs_recentes: [
        {
          id: "log-1",
          criado_em: "2026-10-20T12:00:00Z",
          usuario: "maria",
          acao: "LOGIN_OK",
          acao_rotulo: "Login bem-sucedido",
        },
      ],
    });
    montar();

    await userEvent.click(await screen.findByRole("button", { name: "DASHBOARD" }));

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("+3 na semana")).toBeInTheDocument();
    expect(screen.getByText("1.234")).toBeInTheDocument();
    expect(screen.getByText("MÉDIA XP/USUÁRIO")).toBeInTheDocument();
    expect(screen.getByText("150,5")).toBeInTheDocument();
    expect(screen.getByText("MÉDIA SUBMISSÕES/USUÁRIO")).toBeInTheDocument();
    expect(screen.getByText("29,4")).toBeInTheDocument();
    expect(screen.getByText("TAXA DE APROVAÇÃO")).toBeInTheDocument();
    expect(screen.getByText("%")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Seg: 4 Aprovadas e 1 Rejeitadas/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Ter: 1 Cadastros/ })).toBeInTheDocument();
    expect(screen.getByText("maria")).toBeInTheDocument();
    expect(screen.getByText("Login bem-sucedido")).toBeInTheDocument();
  });
});

describe("PainelAdmin: aba Usuários", () => {
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
    mock.api.eu.mockResolvedValue(usuario({ is_admin: true }));
    mock.api.adminNiveis.mockResolvedValue([nivelAdmin]);
    mock.api.adminUsuarios.mockResolvedValue([
      maria,
      outroAdmin,
      { ...outroAdmin, id: usuario().id, nickname: "eu_admin" },
    ]);
    mock.api.adminExcluirUsuario.mockResolvedValue(undefined);
    mock.api.mfaStatus.mockResolvedValue({ ativo: true, metodo: "APP" });
  });

  async function abrirExclusaoDaMaria() {
    montar();
    await userEvent.click(await screen.findByRole("button", { name: "Excluir maria" }));
    // O campo só aparece depois de confirmar que o admin tem o autenticador.
    await screen.findByLabelText(/CÓDIGO DO AUTENTICADOR/);
  }

  it("busca pela API depois que a digitação para", async () => {
    montar();
    await userEvent.type(await screen.findByRole("searchbox"), "mar");

    await waitFor(() => expect(mock.api.adminUsuarios).toHaveBeenLastCalledWith("mar"));
    // debounce: uma busca para o termo, não uma por tecla
    expect(mock.api.adminUsuarios).not.toHaveBeenCalledWith("m");
  });

  it("sem lixeira na própria conta nem na de outro admin", async () => {
    montar();

    expect(await screen.findByRole("button", { name: "Excluir maria" })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Excluir chefe" })).toBeNull(),
    );
    expect(screen.queryByRole("button", { name: "Excluir eu_admin" })).toBeNull();
  });

  it("trava o próprio nível com a explicação", async () => {
    montar();

    const meu = await screen.findByRole("combobox", { name: "Nível de acesso de eu_admin" });
    expect(meu).toBeDisabled();
    expect(meu).toHaveAccessibleDescription("Você não pode alterar seu próprio nível");
    expect(meu.closest("td")).toHaveAttribute(
      "title",
      "Você não pode alterar seu próprio nível",
    );
    expect(screen.getByRole("combobox", { name: "Nível de acesso de maria" })).toBeEnabled();
  });

  it("admin só com 2FA por e-mail é avisado e não consegue confirmar", async () => {
    mock.api.mfaStatus.mockResolvedValue({ ativo: true, metodo: "EMAIL" });
    montar();
    await userEvent.click(await screen.findByRole("button", { name: "Excluir maria" }));

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
    // colado do autenticador com espaço: nenhum dígito se perde
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

  it("busca que volta a funcionar limpa o erro anterior", async () => {
    mock.api.adminUsuarios
      .mockResolvedValueOnce([maria])
      .mockRejectedValueOnce(new Error("rede"))
      .mockResolvedValue([maria]);
    montar();
    const busca = await screen.findByRole("searchbox");

    await userEvent.type(busca, "x");
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Nenhum usuário encontrado.")).toBeInTheDocument();

    await userEvent.type(busca, "y");
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(screen.getByText("maria")).toBeInTheDocument();
  });

  it("envia o código 2FA, anonimiza, avisa e recarrega", async () => {
    await abrirExclusaoDaMaria();

    expect(screen.getByRole("dialog")).toHaveTextContent(
      /conformidade com a LGPD, esta ação anonimizará os dados pessoais/,
    );
    const chamadasAntes = mock.api.adminUsuarios.mock.calls.length;
    await userEvent.type(screen.getByLabelText(/CÓDIGO DO AUTENTICADOR/), "123456");
    await userEvent.click(screen.getByRole("button", { name: "ANONIMIZAR" }));

    expect(mock.api.adminExcluirUsuario).toHaveBeenCalledWith("u-maria", "123456");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Dados de maria anonimizados.",
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() =>
      expect(mock.api.adminUsuarios.mock.calls.length).toBeGreaterThan(chamadasAntes),
    );
  });
});

describe("PainelAdmin: aba Níveis de acesso", () => {
  it("trava a edição do próprio nível", async () => {
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
    mock.api.eu.mockResolvedValue(usuario({ is_admin: true, nivel_id: "n-meu" }));
    mock.api.adminNiveis.mockResolvedValue([nivel("n-meu", "Admin"), nivel("n-outro", "Monitor")]);
    montar();

    await userEvent.click(await screen.findByRole("button", { name: "NÍVEIS DE ACESSO" }));
    const editar = await screen.findAllByRole("button", { name: "EDITAR" });

    expect(editar[0]).toBeDisabled();
    expect(editar[0]).toHaveAccessibleDescription("SEU NÍVEL");
    expect(editar[1]).toBeEnabled();
  });
});
