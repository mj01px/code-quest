from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from .analise_ast import requisitos_invalidos


class Linguagem(models.TextChoices):
    PYTHON = "PYTHON", _("Python")


class Modo(models.TextChoices):
    EXECUTAR = "EXECUTAR", _("Executar")
    ENVIAR = "ENVIAR", _("Enviar")


class Veredito(models.TextChoices):
    APROVADO = "APROVADO", _("Aprovado")
    RESPOSTA_ERRADA = "RESPOSTA_ERRADA", _("Resposta errada")
    TEMPO_ESGOTADO = "TEMPO_ESGOTADO", _("Tempo esgotado")
    ERRO_DE_EXECUCAO = "ERRO_DE_EXECUCAO", _("Erro de execução")


class EspecificacaoDeCodigo(models.Model):
    exercicio = models.OneToOneField(
        "trilhas.Exercicio",
        on_delete=models.CASCADE,
        related_name="especificacao_codigo",
        verbose_name=_("exercício"),
    )

    linguagem = models.CharField(
        max_length=10,
        choices=Linguagem.choices,
        default=Linguagem.PYTHON,
        verbose_name=_("linguagem"),
    )

    funcao = models.CharField(
        max_length=60,
        verbose_name=_("função"),
    )

    codigo_inicial = models.TextField(
        blank=True,
        default="",
        verbose_name=_("código inicial"),
    )

    requisitos = models.JSONField(
        default=list,
        blank=True,
        verbose_name=_("requisitos estruturais"),
    )

    atualizado_em = models.DateTimeField(auto_now=True, verbose_name=_("atualizado em"))

    class Meta:
        verbose_name = _("especificação de código")
        verbose_name_plural = _("especificações de código")

    def __str__(self) -> str:
        return f"{self.exercicio} ({self.funcao})"

    def clean(self) -> None:
        erros = {}
        if not self.funcao.isidentifier():
            erros["funcao"] = ValidationError(
                _("Nome de função inválido."), code="funcao_invalida"
            )

        problemas = requisitos_invalidos(self.requisitos)
        if problemas:
            erros["requisitos"] = ValidationError(
                "; ".join(problemas), code="requisitos_invalidos"
            )

        if erros:
            raise ValidationError(erros)


class CasoDeTeste(models.Model):
    especificacao = models.ForeignKey(
        EspecificacaoDeCodigo,
        on_delete=models.CASCADE,
        related_name="casos",
        verbose_name=_("especificação"),
    )

    ordem = models.PositiveSmallIntegerField(verbose_name=_("ordem"))

    argumentos = models.JSONField(
        default=list,
        verbose_name=_("argumentos"),
    )

    esperado = models.JSONField(
        null=True,
        blank=True,
        verbose_name=_("retorno esperado"),
    )

    erro_esperado = models.CharField(
        max_length=60,
        blank=True,
        default="",
        verbose_name=_("erro esperado"),
    )

    visivel = models.BooleanField(
        default=False,
        verbose_name=_("visível"),
    )

    class Meta:
        verbose_name = _("caso de teste")
        verbose_name_plural = _("casos de teste")
        ordering = ["especificacao", "ordem"]
        constraints = [
            models.UniqueConstraint(
                fields=["especificacao", "ordem"],
                name="caso_ordem_unica",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.especificacao.funcao} #{self.ordem}"


class Submissao(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="submissoes",
        verbose_name=_("usuário"),
    )

    exercicio = models.ForeignKey(
        "trilhas.Exercicio",
        null=True,
        on_delete=models.SET_NULL,
        related_name="submissoes",
        verbose_name=_("exercício"),
    )

    modo = models.CharField(max_length=10, choices=Modo.choices, verbose_name=_("modo"))

    codigo = models.TextField(verbose_name=_("código"))

    hash = models.CharField(
        max_length=64,
        db_index=True,
        verbose_name=_("hash"),
    )

    veredito = models.CharField(
        max_length=20, choices=Veredito.choices, verbose_name=_("veredito")
    )

    resultado = models.JSONField(
        default=dict,
        verbose_name=_("resultado"),
    )

    em_cache = models.BooleanField(
        default=False,
        verbose_name=_("veio do cache"),
    )

    criado_em = models.DateTimeField(auto_now_add=True, verbose_name=_("criado em"))

    class Meta:
        verbose_name = _("submissão")
        verbose_name_plural = _("submissões")
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["user", "-criado_em"], name="submissao_user_data_idx"),
            models.Index(fields=["criado_em", "em_cache"], name="submissao_cota_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.user_id} {self.modo} {self.veredito}"