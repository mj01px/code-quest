from typing import Any

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _


class StatusEditorial(models.TextChoices):
    """Estados do fluxo editorial definido em apps.contas.rbac."""

    RASCUNHO = "RASCUNHO", _("Rascunho")
    REVISAO = "REVISAO", _("Em revisão")
    APROVADO = "APROVADO", _("Aprovado")
    PUBLICADO = "PUBLICADO", _("Publicado")


class Tipo(models.TextChoices):
    CODIGO = "CODIGO", _("Código")
    TEORICO = "TEORICO", _("Teórico")


class Dificuldade(models.TextChoices):
    INICIANTE = "INICIANTE", _("Iniciante")
    INTERMEDIARIO = "INTERMEDIARIO", _("Intermediário")
    AVANCADO = "AVANCADO", _("Avançado")


class PublicavelQuerySet[M: models.Model](models.QuerySet[M]):
    def publicados(self) -> PublicavelQuerySet[M]:
        return self.filter(status=StatusEditorial.PUBLICADO)


class Trilha(models.Model):
    nome = models.CharField(
        max_length=80,
        verbose_name=_("nome"),
        help_text=_("Nome exibido no card e no cabeçalho da trilha."),
    )

    slug = models.SlugField(
        max_length=80,
        unique=True,
        verbose_name=_("slug"),
        help_text=_("Identificador usado na URL. Não renomeie sem redirecionar."),
    )

    descricao = models.TextField(
        verbose_name=_("descrição"),
        help_text=_(
            "Linha de catálogo, exibida truncada no card da listagem ao lado da "
            "carga horária. Frase única e curta, sem ponto final."
        ),
    )

    # Três textos porque são três lugares com espaço e propósito diferentes:
    # o card da listagem tem uma linha, o topo da página da trilha tem um
    # parágrafo, e a seção "Sobre" tem o texto inteiro. Com um campo só, ou o
    # card estoura ou a página fica vazia.
    resumo = models.TextField(
        blank=True,
        verbose_name=_("resumo"),
        help_text=_(
            "Parágrafo do topo da página da trilha. Duas ou três frases. "
            "Vazio cai na descrição."
        ),
    )

    sobre = models.TextField(
        blank=True,
        verbose_name=_("sobre"),
        help_text=_(
            "Texto da seção “Sobre a trilha”. Aceita vários parágrafos "
            "separados por linha em branco. Vazio cai no resumo."
        ),
    )

    ordem = models.PositiveSmallIntegerField(
        default=0,
        verbose_name=_("ordem"),
        help_text=_("Posição na listagem de trilhas."),
    )

    status = models.CharField(
        max_length=10,
        choices=StatusEditorial.choices,
        default=StatusEditorial.RASCUNHO,
        db_index=True,
        verbose_name=_("status editorial"),
    )

    criada_em = models.DateTimeField(auto_now_add=True, verbose_name=_("criada em"))
    atualizada_em = models.DateTimeField(auto_now=True, verbose_name=_("atualizada em"))

    objects = PublicavelQuerySet.as_manager()

    class Meta:
        verbose_name = _("trilha")
        verbose_name_plural = _("trilhas")
        ordering = ["ordem", "nome"]
        indexes = [
            models.Index(fields=["status", "ordem"], name="trilha_status_ordem_idx"),
        ]

    def __str__(self) -> str:
        return self.nome

    @property
    def publicada(self) -> bool:
        return self.status == StatusEditorial.PUBLICADO


class Aula(models.Model):
    trilha = models.ForeignKey(
        Trilha,
        on_delete=models.CASCADE,
        related_name="aulas",
        verbose_name=_("trilha"),
    )

    titulo = models.CharField(max_length=120, verbose_name=_("título"))

    slug = models.SlugField(
        max_length=120,
        verbose_name=_("slug"),
        help_text=_("Único dentro da trilha."),
    )

    conteudo = models.TextField(
        verbose_name=_("conteúdo"),
        help_text=_("Material da aula, em Markdown."),
    )

    ordem = models.PositiveSmallIntegerField(default=0, verbose_name=_("ordem"))

    pre_requisito = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="dependentes",
        verbose_name=_("pré-requisito"),
        help_text=_("Aula que precisa ser concluída antes desta, na mesma trilha."),
    )

    status = models.CharField(
        max_length=10,
        choices=StatusEditorial.choices,
        default=StatusEditorial.RASCUNHO,
        db_index=True,
        verbose_name=_("status editorial"),
    )

    criada_em = models.DateTimeField(auto_now_add=True, verbose_name=_("criada em"))
    atualizada_em = models.DateTimeField(auto_now=True, verbose_name=_("atualizada em"))

    objects = PublicavelQuerySet.as_manager()

    class Meta:
        verbose_name = _("aula")
        verbose_name_plural = _("aulas")
        ordering = ["ordem", "titulo"]
        constraints = [
            models.UniqueConstraint(
                fields=["trilha", "slug"],
                name="aula_slug_unico_por_trilha",
                violation_error_message=_("Esta trilha já tem uma aula com este slug."),
            ),
        ]
        indexes = [
            models.Index(fields=["trilha", "ordem"], name="aula_trilha_ordem_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.trilha.nome} - {self.titulo}"

    @property
    def publicada(self) -> bool:
        return self.status == StatusEditorial.PUBLICADO

    def clean(self) -> None:
        """Recusa pré-requisito de outra trilha ou da própria aula."""
        if self.pre_requisito is None:
            return
        if self.pk is not None and self.pre_requisito_id == self.pk:
            raise ValidationError(
                {"pre_requisito": _("Uma aula não pode ser pré-requisito de si mesma.")}
            )
        if self.pre_requisito.trilha_id != self.trilha_id:
            raise ValidationError(
                {"pre_requisito": _("O pré-requisito precisa ser da mesma trilha.")}
            )


class Exercicio(models.Model):
    aula = models.ForeignKey(
        Aula,
        on_delete=models.CASCADE,
        related_name="exercicios",
        verbose_name=_("aula"),
    )

    trilha = models.ForeignKey(
        Trilha,
        on_delete=models.CASCADE,
        related_name="exercicios",
        editable=False,
        blank=True,
        verbose_name=_("trilha"),
        help_text=_("Derivado da aula, para tornar o slug único na trilha."),
    )

    titulo = models.CharField(max_length=120, verbose_name=_("título"))

    slug = models.SlugField(
        max_length=120,
        verbose_name=_("slug"),
        help_text=_("Único dentro da trilha, porque a URL não cita a aula."),
    )

    enunciado = models.TextField(verbose_name=_("enunciado"))

    tipo = models.CharField(
        max_length=10,
        choices=Tipo.choices,
        default=Tipo.CODIGO,
        verbose_name=_("tipo"),
    )

    dificuldade = models.CharField(
        max_length=15,
        choices=Dificuldade.choices,
        default=Dificuldade.INICIANTE,
        db_index=True,
        verbose_name=_("dificuldade"),
    )

    ordem = models.PositiveSmallIntegerField(default=0, verbose_name=_("ordem"))

    solucao_autor = models.TextField(
        blank=True,
        verbose_name=_("solução do autor"),
        help_text=_(
            "Solução de referência. Nunca é serializada pela API pública: só "
            "quem tem trilhas.view_solution pode ver, por rota própria."
        ),
    )

    status = models.CharField(
        max_length=10,
        choices=StatusEditorial.choices,
        default=StatusEditorial.RASCUNHO,
        db_index=True,
        verbose_name=_("status editorial"),
    )

    criado_em = models.DateTimeField(auto_now_add=True, verbose_name=_("criado em"))
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name=_("atualizado em"))

    objects = PublicavelQuerySet.as_manager()

    class Meta:
        verbose_name = _("exercício")
        verbose_name_plural = _("exercícios")
        ordering = ["ordem", "titulo"]
        constraints = [
            models.UniqueConstraint(
                fields=["trilha", "slug"],
                name="exercicio_slug_unico_por_trilha",
                violation_error_message=_(
                    "Esta trilha já tem um exercício com este slug."
                ),
            ),
        ]
        indexes = [
            models.Index(fields=["aula", "ordem"], name="exercicio_aula_ordem_idx"),
            models.Index(fields=["trilha", "slug"], name="exercicio_trilha_slug_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.aula.titulo} - {self.titulo}"

    def save(self, *args: Any, **kwargs: Any) -> None:
        """Mantém trilha em sincronia com a aula antes de gravar."""
        self.trilha_id = self.aula.trilha_id
        super().save(*args, **kwargs)

    @property
    def publicado(self) -> bool:
        return self.status == StatusEditorial.PUBLICADO
