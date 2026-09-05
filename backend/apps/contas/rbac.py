from dataclasses import dataclass
from types import MappingProxyType


@dataclass(frozen=True, slots=True)
class PermissionSpec:

    codename: str
    label: str
    module: str


CATALOG: tuple[PermissionSpec, ...] = (
    PermissionSpec("trilhas.view", "Ver trilhas, aulas e exercícios publicados", "trilhas"),
    PermissionSpec("trilhas.create", "Criar trilhas, aulas e exercícios", "trilhas"),
    PermissionSpec("trilhas.edit", "Editar conteúdo de própria autoria", "trilhas"),
    PermissionSpec("trilhas.submit_review", "Enviar conteúdo para revisão", "trilhas"),
    PermissionSpec("trilhas.review", "Aprovar ou devolver conteúdo na fila de revisão", "trilhas"),
    PermissionSpec("trilhas.publish", "Publicar conteúdo aprovado", "trilhas"),
    PermissionSpec(
        "trilhas.view_solution",
        "Ver solução de referência e testes ocultos",
        "trilhas",
    ),
    PermissionSpec("submissoes.create", "Submeter código para execução", "submissoes"),
    PermissionSpec("submissoes.view_all", "Ver submissões de qualquer usuário", "submissoes"),
    PermissionSpec(
        "gamificacao.manage_catalog",
        "Gerenciar o catálogo de criaturas",
        "gamificacao",
    ),
    PermissionSpec("comunidades.create", "Criar comunidade", "comunidades"),
    PermissionSpec("comunidades.join", "Entrar em uma comunidade", "comunidades"),
    PermissionSpec("usuarios.view", "Listar e consultar usuários", "usuarios"),
    PermissionSpec("usuarios.grant_author", "Conceder ou remover o papel de autor", "usuarios"),
    PermissionSpec("usuarios.suspend", "Suspender ou reativar contas", "usuarios"),
    PermissionSpec("auditoria.view", "Consultar a trilha de auditoria", "auditoria"),
)

ALL_CODENAMES = frozenset(spec.codename for spec in CATALOG)


_STUDENT = frozenset(
    {
        "trilhas.view",
        "submissoes.create",
        "comunidades.create",
        "comunidades.join",
    }
)

_AUTHOR = _STUDENT | frozenset(
    {
        "trilhas.create",
        "trilhas.edit",
        "trilhas.submit_review",
        "trilhas.view_solution",
    }
)

_ADMIN = _AUTHOR | frozenset(
    {
        "trilhas.review",
        "trilhas.publish",
        "submissoes.view_all",
        "gamificacao.manage_catalog",
        "usuarios.view",
        "usuarios.grant_author",
        "usuarios.suspend",
        "auditoria.view",
    }
)

ROLE_PERMISSIONS = MappingProxyType(
    {
        "ALUNO": _STUDENT,
        "AUTOR": _AUTHOR,
        "ADMIN": _ADMIN,
    }
)


def permissions_for_role(role: str) -> frozenset[str]:
    return ROLE_PERMISSIONS.get(role, frozenset())


def _validate_catalog() -> None:
    codenames = [spec.codename for spec in CATALOG]
    duplicados = {c for c in codenames if codenames.count(c) > 1}
    if duplicados:
        raise RuntimeError(f"Codenames duplicados no catálogo: {sorted(duplicados)}")

    for role, concedidas in ROLE_PERMISSIONS.items():
        desconhecidas = concedidas - ALL_CODENAMES
        if desconhecidas:
            raise RuntimeError(
                f"O papel {role} concede codenames fora do catálogo: "
                f"{sorted(desconhecidas)}"
            )


_validate_catalog()
