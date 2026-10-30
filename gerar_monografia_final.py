"""Gera as versoes marcada e atualizada da monografia do CodeQuest.

Marcada: texto antigo vermelho e tachado, texto novo vermelho e sublinhado.
Atualizada: texto antigo removido, texto novo com a formatacao do bloco original.

Uso: python gerar_monografia_final.py
"""

import copy
import sys
from pathlib import Path

from docx import Document
from docx.shared import RGBColor
from docx.text.run import Run

PASTA = Path(r"E:\Downloads_Archive")
NOME = "[MONOGRAFIA] - CODEQUEST"
VERMELHO = RGBColor(255, 0, 0)

# (ancora_inicio, ancora_fim ou None = ate o fim do paragrafo, texto novo)
# ancora_fim e incluida no trecho antigo. Com ancora_inicio None o texto novo
# e acrescentado ao fim do paragrafo que comeca por `paragrafo`.
EDICOES = [
    dict(
        nome="2.3 camada de cliente",
        inicio="O autor e o revisor dispõem da tela de autoria",
        fim=None,
        novo=(
            "O usuário que deseja produzir conteúdo solicita acesso de autor na tela "
            "/ser-autor, e o administrador aprova ou rejeita o pedido. O autor e o "
            "revisor dispõem da tela de autoria, que reúne a lista de rascunhos, a "
            "lista de aprovados, a fila de revisão e o modal de leitura do conteúdo. "
            "Na tela de redação (/autoria/novo), o autor cria trilhas, aulas, "
            "exercícios, flashcards e questões de múltipla escolha, e edita, exclui "
            "ou publica o que criou. O administrador dispõe do painel administrativo, "
            "com as abas de usuários, de níveis de acesso e de dashboard. Permanece "
            "prevista a consulta completa à trilha de auditoria, com filtros."
        ),
    ),
    dict(
        nome="2.9 parte A",
        inicio="Não há autopublicação",
        fim="Não há autopublicação",
        novo="Não há publicação sem aprovação",
    ),
    dict(
        nome="2.9 parte B",
        inicio="O cargo de autor é concedido",
        fim="nunca publica a própria produção.",
        novo=(
            "O cargo de autor não é atribuído no cadastro: o usuário o solicita pela "
            "tela /ser-autor e o administrador decide. O autor escreve e submete o "
            "material e, depois da aprovação do revisor, publica o que ele mesmo "
            "criou; quem possui a permissão de publicar pode publicar qualquer "
            "conteúdo aprovado."
        ),
    ),
    dict(
        nome="2.9 3o paragrafo",
        inicio="A publicação do conteúdo aprovado é feita pela rota",
        fim="comando de carga idempotente.",
        novo=(
            "O autor cria o conteúdo na tela de redação: trilha, aula e exercício e, "
            "dentro da aula, flashcards e questões de múltipla escolha. Todo conteúdo "
            "nasce em rascunho, com o autor da requisição, e só enquanto estiver em "
            "rascunho pode ser editado ou excluído, apenas pelo próprio autor ou pelo "
            "administrador; a exclusão é recusada se algum conteúdo filho já tiver "
            "saído do rascunho. A lista de aprovados devolve ao autor o que foi "
            "aprovado, e o botão Publicar chama a rota de publicação, que recusa a "
            "publicação de trilha ou aula com filho ainda em rascunho ou em revisão. "
            "O comando de carga idempotente permanece como origem do conteúdo inicial "
            "do catálogo."
        ),
    ),
    dict(
        nome="3.3.1 modulo de trilhas",
        paragrafo="O módulo de trilhas organiza o conteúdo",
        novo=(
            " Cada aula pode conter flashcards, com pergunta e resposta, e questões "
            "de múltipla escolha, com enunciado, opções e resposta correta. Ambos são "
            "criados pelo autor e exibidos ao aluno junto da aula; a correção da "
            "questão ocorre no navegador e não concede XP."
        ),
    ),
    dict(
        nome="4.1 trabalhos futuros",
        inicio=(
            "a criação e a edição de conteúdo pela tela de autoria, com a publicação "
            "pela interface, a comporta automática e o registro do parecer do revisor"
        ),
        fim=(
            "a criação e a edição de conteúdo pela tela de autoria, com a publicação "
            "pela interface, a comporta automática e o registro do parecer do revisor"
        ),
        novo="a comporta automática e o registro do parecer do revisor no fluxo editorial",
    ),
]


def achar_origem() -> Path:
    base = PASTA / "Monografia CodeQuest" / f"{NOME}.docx"
    if base.exists():
        return base
    candidatos = [
        p
        for p in PASTA.rglob("*.docx")
        if "MONOGRAFIA" in p.name.upper()
        and "marcada" not in p.name
        and "atualizada" not in p.name
        and not p.name.startswith("~$")
    ]
    if not candidatos:
        sys.exit("Nenhum .docx de monografia encontrado em " + str(PASTA))
    return max(candidatos, key=lambda p: p.stat().st_mtime)


def dividir(par, run: Run, pos: int) -> None:
    """Parte `run` em `pos` caracteres, copiando a formatacao (rPr) para os dois lados."""
    texto = run.text
    if pos <= 0 or pos >= len(texto):
        return
    novo = copy.deepcopy(run._r)
    run._r.addnext(novo)
    run.text = texto[:pos]
    Run(novo, par).text = texto[pos:]


def so_texto(run: Run) -> bool:
    """Run sem tab, quebra ou campo: o indice de caractere bate com run.text."""
    return all(
        el.tag.endswith(("}rPr", "}t")) for el in run._r.iterchildren()
    )


def runs_do_trecho(par, ini: int, fim: int) -> list[Run]:
    """Isola [ini, fim) em runs inteiros, dividindo as bordas, e devolve esses runs."""
    for ponto in (ini, fim):
        acc = 0
        for run in par.runs:
            tam = len(run.text)
            if acc < ponto < acc + tam:
                if not so_texto(run):
                    sys.exit("Run com tab/quebra na borda da edicao; ajuste a ancora.")
                dividir(par, run, ponto - acc)
                break
            acc += tam
    escolhidos, acc = [], 0
    for run in par.runs:
        tam = len(run.text)
        if tam and acc >= ini and acc + tam <= fim:
            escolhidos.append(run)
        acc += tam
    return escolhidos


def achar_paragrafo(doc, trecho: str, comeca: bool = False):
    achados = [
        p
        for p in doc.paragraphs
        if (p.text.startswith(trecho) if comeca else trecho in p.text)
    ]
    if len(achados) != 1:
        sys.exit(f"Ancora {trecho[:50]!r}: {len(achados)} paragrafos (esperado 1).")
    return achados[0]


def novo_run_apos(par, modelo: Run, depois: Run, texto: str) -> Run:
    elem = copy.deepcopy(modelo._r)
    depois._r.addnext(elem)
    run = Run(elem, par)
    run.text = texto
    return run


def aplicar(doc, ed: dict, marcada: bool) -> None:
    if "paragrafo" in ed:
        par = achar_paragrafo(doc, ed["paragrafo"], comeca=True)
        ultimo = par.runs[-1]
        novo = ed["novo"]
        if par.text.endswith(" ") and novo.startswith(" "):
            novo = novo[1:]
        run = novo_run_apos(par, ultimo, ultimo, novo)
        run.font.strike = None
        if marcada:
            run.font.color.rgb = VERMELHO
            run.font.underline = True
        return

    par = achar_paragrafo(doc, ed["inicio"])
    texto = par.text
    ini = texto.index(ed["inicio"])
    fim = len(texto) if ed["fim"] is None else texto.index(ed["fim"], ini) + len(ed["fim"])
    antigos = runs_do_trecho(par, ini, fim)
    if not antigos:
        sys.exit(f"Edicao {ed['nome']}: nenhum run no trecho.")
    run = novo_run_apos(par, antigos[0], antigos[-1], ed["novo"])
    if marcada:
        for r in antigos:
            r.font.color.rgb = VERMELHO
            r.font.strike = True
        run.font.color.rgb = VERMELHO
        run.font.strike = None
        run.font.underline = True
    else:
        for r in antigos:
            r._r.getparent().remove(r._r)


def gerar(origem: Path, destino: Path, marcada: bool) -> None:
    doc = Document(origem)
    for ed in EDICOES:
        aplicar(doc, ed, marcada)
    doc.save(destino)
    print("gerado:", destino)


if __name__ == "__main__":
    origem = achar_origem()
    print("origem:", origem)
    gerar(origem, PASTA / f"{NOME} - marcada.docx", marcada=True)
    gerar(origem, PASTA / f"{NOME} - atualizada.docx", marcada=False)
