"use client";

import {useRef, useState, type ReactNode} from "react";
import dynamic from "next/dynamic";

import {EditorDeCodigo} from "@/components/exercicio/EditorDeCodigo";
import {CabecalhoDoPainel, GradeDoExercicio} from "@/components/exercicio/GradeDoExercicio";
import {ResultadoDosCasos, comoTexto} from "@/components/exercicio/ResultadoDosCasos";
import {useProgresso} from "@/components/progresso/ProvedorProgresso";
import {estaConcluida} from "@/lib/progresso";
import {ErroApi, api} from "@/lib/api";
import {avisarConquistas} from "@/lib/conquistas";
import type {
    Correcao,
    EspecificacaoDeCodigo,
    ExemploDeCaso,
    ResultadoDoCaso,
    RequisitoEstrutural,
} from "@/lib/types";

const TerminalDeSaida = dynamic(
    () => import("@/components/exercicio/TerminalDeSaida").then((modulo) => modulo.TerminalDeSaida),
    {ssr: false},
);

const CONSTRUCOES: Record<string, string> = {
    for: "um laço for",
    while: "um laço while",
    if: "um if",
    try: "um try",
    compreensao: "uma compreensão",
    fstring: "uma f-string",
    import: "import",
    with: "um with",
    chamada: "a função",
};

function descreverRequisito(requisito: RequisitoEstrutural): string {
    const alvo =
        requisito.construcao === "chamada"
            ? `${CONSTRUCOES.chamada} ${requisito.nome}`
            : (CONSTRUCOES[requisito.construcao] ?? requisito.construcao);
    return requisito.regra === "exigir" ? `usar ${alvo}` : `não usar ${alvo}`;
}

function descreverExemplo(exemplo: ExemploDeCaso, funcao: string): string {
    if (exemplo.descricao) return exemplo.descricao;
    const args = (exemplo.argumentos ?? []).map(comoTexto).join(", ");
    const saida = exemplo.erro_esperado
        ? `levanta ${exemplo.erro_esperado}`
        : `→ ${comoTexto(exemplo.esperado)}`;
    return `${funcao}(${args}) ${saida}`;
}

function descreverResultado(caso: ResultadoDoCaso, funcao: string): string {
    const args = (caso.argumentos ?? []).map(comoTexto).join(", ");
    return `${funcao}(${args}) → ${caso.erro || comoTexto(caso.obtido)}`;
}

function ExemploDeExecucao({ especificacao, argumentos }: {
    especificacao: EspecificacaoDeCodigo;
    argumentos?: unknown[];
}) {
    const exemplo = especificacao.exemplos[0];
    if (!exemplo) return null;

    const valores = (argumentos ?? exemplo.argumentos ?? []).map(comoTexto);
    const parametros = especificacao.parametros?.slice(0, valores.length) ?? [];
    if (!valores.length || parametros.length !== valores.length) return null;
    const linhas = parametros.map((nome, indice) => `${nome} = ${valores[indice]}`);

    return (
        <div className="shrink-0 border-b-2 border-edge bg-field px-4 py-3">
            <p className="mb-2 font-label text-[10px] tracking-[1px] text-ink-muted uppercase">
                Entrada do Rodar
            </p>
            <pre aria-label="Entrada do exemplo" className="m-0 overflow-x-auto font-mono text-sm text-brand-light">
                {linhas.join("\n")}
            </pre>
        </div>
    );
}

function mensagemDoErro(erro: unknown): string {
    if (!(erro instanceof ErroApi)) {
        return "Não foi possível executar agora. Tente de novo.";
    }
    if (erro.status === 401) return "Entre na sua conta para executar o código.";
    return erro.message;
}

export function PainelDeCodigo({
                                   trilhaSlug,
                                   exercicioSlug,
                                   especificacao,
                                   previa = false,
                                   aprender,
                                   pet,
                               }: {
    trilhaSlug: string;
    exercicioSlug: string;
    especificacao: EspecificacaoDeCodigo;
    /** Na prévia editorial só se executa: enviar concluiria um rascunho. */
    previa?: boolean;
    /** Com o painel Aprender, a tela vira as três colunas do modo foco. */
    aprender?: ReactNode;
    pet?: ReactNode;
}) {
    const {chaves, recarregar} = useProgresso();
    const [codigo, setCodigo] = useState(
        especificacao.codigo_aprovado || especificacao.codigo_inicial,
    );
    const [correcao, setCorrecao] = useState<Correcao | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);
    const [executando, setExecutando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [xpGanho, setXpGanho] = useState<number | null>(null);
    const [diaGanho, setDiaGanho] = useState(false);
    const [concluido, setConcluido] = useState(false);

    const emVoo = useRef(false);

    // Os botões usam aria-disabled (o clique ainda chega) e o Ctrl+Enter não
    // passa por eles: a trava mora aqui, onde todos os caminhos se encontram.
    async function executar() {
        if (emVoo.current || !especificacao || excedeu) return;
        emVoo.current = true;

        setExecutando(true);
        setAviso(null);

        try {
            const resultado = await api.executarCodigo(
                trilhaSlug,
                exercicioSlug,
                codigo,
            );
            setCorrecao(resultado);
            avisarConquistas();
        } catch (erro) {
            setCorrecao(null);
            setAviso(mensagemDoErro(erro));
        } finally {
            setExecutando(false);
            emVoo.current = false;
        }
    }

    async function enviar() {
        if (emVoo.current || !especificacao || excedeu || feito) return;
        emVoo.current = true;

        setEnviando(true);
        setAviso(null);

        try {
            const resultado = await api.concluirExercicio(
                trilhaSlug,
                exercicioSlug,
                codigo,
            );

            if (!resultado.aprovado) {
                setCorrecao(resultado.correcao);
                return;
            }

            setCorrecao(resultado.correcao);
            setXpGanho(resultado.ja_concluido ? null : resultado.xp_ganho);
            setDiaGanho(resultado.sequencia.aumentou);
            setConcluido(true);
            recarregar();
        } catch (erro) {
            setAviso(mensagemDoErro(erro));
        } finally {
            setEnviando(false);
            emVoo.current = false;
        }
    }

    if (!especificacao) return null;

    const excedeu = codigo.length > especificacao.limite_de_caracteres;
    const feito = concluido || estaConcluida(chaves, trilhaSlug, exercicioSlug);
    const ocupado = executando || enviando;
    const emSql = especificacao.linguagem === "SQL";
    const linguagem = emSql ? "sql" : "python";

    const exemploExecutado = correcao?.modo === "EXECUTAR"
        ? correcao.casos.find((caso) => caso.visivel)
        : undefined;
    const saidaDoExemplo = !emSql && exemploExecutado && !(correcao?.personalizado && exemploExecutado.erro)
        ? descreverResultado(exemploExecutado, especificacao.funcao)
        : "";
    const saidaSql = emSql && (correcao?.veredito === "APROVADO" || correcao?.veredito === "RESPOSTA_ERRADA")
        ? (correcao.modo === "ENVIAR" ? "Envio SQL processado." : "Comando SQL executado.")
        : "";
    const saidaTerminal = correcao?.saida || saidaDoExemplo || saidaSql;
    const exibirSaida = emSql || correcao?.modo === "EXECUTAR";
    const argumentosDoRodar = correcao?.modo === "EXECUTAR" && correcao.personalizado
        ? exemploExecutado?.argumentos
        : undefined;
    const erroTerminal = correcao?.erro || (correcao?.personalizado ? exemploExecutado?.erro : "") || "";
    const mostrarTerminal = correcao?.modo === "EXECUTAR" &&
        (Boolean(saidaTerminal || correcao.erro) ||
            correcao.veredito === "TEMPO_ESGOTADO" || correcao.veredito === "ERRO_DE_EXECUCAO");

    if (aprender !== undefined) {
        const status = aviso ??
            (excedeu
                ? "Código longo demais."
                : xpGanho !== null
                    ? `+${xpGanho} XP${diaGanho ? " · +1 dia" : ""}`
                    : feito
                        ? "Exercício concluído"
                        : "");
        return (
            <GradeDoExercicio
                pet={pet}
                rotuloDaDireita={emSql ? "Resultado SQL" : undefined}
                aprender={aprender}
                centro={
                    <>
                        <CabecalhoDoPainel>
                            <span className="flex items-center gap-2 text-ink">
                                <span aria-hidden="true" className="h-2.5 w-2.5 bg-brand"/>
                                {emSql ? "exercicio.sql" : `${especificacao.funcao}.py`}
                            </span>
                        </CabecalhoDoPainel>
                        <ExemploDeExecucao especificacao={especificacao} argumentos={argumentosDoRodar}/>
                        {especificacao.requisitos.length > 0 ? (
                            <p className="m-0 border-b-2 border-edge bg-panel-deep px-4 py-2.5 font-body text-base text-ink-body">
                                O exercício pede para {especificacao.requisitos.map(descreverRequisito).join("; ")}.
                            </p>
                        ) : null}
                        <div className="min-h-[18rem] flex-1">
                            <EditorDeCodigo
                                semMoldura
                                altura="100%"
                                linguagem={linguagem}
                                valor={codigo}
                                aoExecutarAtalho={() => {
                                    void executar();
                                }}
                                aoMudar={(novo) => {
                                    setCodigo(novo);
                                    setCorrecao(null);
                                    setAviso(null);
                                }}
                            />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-edge px-4 py-3">
                            <button
                                type="button"
                                aria-disabled={ocupado || excedeu}
                                aria-busy={executando}
                                onClick={() => {
                                    void executar();
                                }}
                                className={`border-[3px] px-6 py-3 font-display text-[11px] leading-[1.7] tracking-[1px] uppercase ${
                                    ocupado || excedeu
                                        ? "cursor-default border-edge-soft bg-panel text-ink-dim"
                                        : "cursor-pointer border-brand-light bg-brand-deep text-ink shadow-[0_0_0_3px_var(--color-brand-void),4px_4px_0_rgba(0,0,0,0.7)] hover:bg-brand-strong"
                                }`}
                            >
                                {executando ? "Rodando…" : "Rodar"}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setCodigo(especificacao.codigo_inicial);
                                    setCorrecao(null);
                                    setAviso(null);
                                }}
                                className="cursor-pointer border-0 bg-transparent p-0 font-label text-[11px] tracking-[2px] text-ink-muted uppercase underline-offset-4 hover:text-ink-soft hover:underline"
                            >
                                Resetar
                            </button>
                            {previa ? (
                                <span aria-hidden="true" />
                            ) : (
                                <button
                                    type="button"
                                    aria-pressed={feito}
                                    aria-disabled={ocupado || excedeu || feito}
                                    aria-busy={enviando}
                                    onClick={() => {
                                        void enviar();
                                    }}
                                    className={`border-2 px-5 py-3 font-label text-[11px] tracking-[2px] uppercase ${
                                        feito
                                            ? "cursor-default border-success text-success"
                                            : ocupado || excedeu
                                                ? "cursor-default border-edge-soft text-ink-dim"
                                                : "cursor-pointer border-success text-success hover:bg-panel-soft"
                                    }`}
                                >
                                    {feito ? "Concluído" : enviando ? "Enviando…" : "Enviar"}
                                </button>
                            )}
                        </div>
                    </>
                }
                direita={
                    <>
                        <CabecalhoDoPainel>
                            <span className="text-ink">{emSql ? "Resultado SQL" : "Terminal"}</span>
                            <span className="text-ink-dim">codequest@os</span>
                        </CabecalhoDoPainel>
                        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-field">
                            <TerminalDeSaida
                                semMoldura
                                classeDaArea={emSql ? "h-28" : "h-56"}
                                vazio="> aguardando execução..."
                                saida={exibirSaida ? saidaTerminal : ""}
                                erro={exibirSaida ? erroTerminal : ""}
                                veredito={exibirSaida ? correcao?.veredito ?? "" : ""}
                            />
                            <div className={`flex flex-col gap-3 px-4 pb-4 empty:hidden ${emSql ? "pt-4" : ""}`}>
                                {status ? (
                                    <p
                                        role="status"
                                        aria-live="polite"
                                        className={`m-0 font-label text-[11px] tracking-[2px] uppercase ${
                                            aviso ? "text-danger" : "text-success"
                                        }`}
                                    >
                                        {status}
                                    </p>
                                ) : null}
                                {correcao && (
                                    <ResultadoDosCasos correcao={correcao} funcao={especificacao.funcao} semContagem={!emSql}/>
                                )}
                                {emSql && !correcao && especificacao.exemplos.length > 0 && (
                                    <section className="space-y-2 border-2 border-edge bg-panel-soft p-4">
                                        <h3 className="font-label text-xs text-ink-label">Casos visíveis</h3>
                                        <ul className="space-y-1 font-body text-sm text-ink-body">
                                            {especificacao.exemplos.map((exemplo) => (
                                                <li key={exemplo.ordem}>{exemplo.descricao}</li>
                                            ))}
                                        </ul>
                                    </section>
                                )}
                            </div>
                        </div>
                    </>
                }
            />
        );
    }

    return (
        <section className="mt-6 space-y-4">
            <header className="space-y-2">
                <p className="font-label text-xs text-ink-label">
                    {emSql ? "Escreva o comando SQL" : (
                        <>escreva a função{" "}<span className="text-brand-light">{especificacao.funcao}</span></>
                    )}
                </p>

                {especificacao.requisitos.length > 0 && (
                    <p className="font-body text-sm text-ink-muted">
                        o exercício pede para{" "}
                        {especificacao.requisitos.map(descreverRequisito).join("; ")}
                    </p>
                )}

                {especificacao.exemplos.length > 0 && (
                    <ul className="space-y-1">
                        {especificacao.exemplos.map((exemplo) => (
                            <li
                                key={exemplo.ordem}
                                className="font-body text-sm text-ink-body"
                            >
                                {descreverExemplo(exemplo, especificacao.funcao)}
                            </li>
                        ))}
                    </ul>
                )}
            </header>

            <div className="overflow-hidden border-2 border-edge bg-field shadow-pixel-sm">
                <ExemploDeExecucao especificacao={especificacao} argumentos={argumentosDoRodar}/>
                <EditorDeCodigo
                    semMoldura
                    linguagem={linguagem}
                    valor={codigo}
                    aoMudar={(novo) => {
                        setCodigo(novo);
                        setCorrecao(null);
                        setAviso(null);
                    }}
                />
            </div>

            <div className="flex flex-wrap items-center gap-4">
                <button
                    type="button"
                    aria-disabled={ocupado || excedeu}
                    aria-busy={executando}
                    onClick={() => {
                        void executar();
                    }}
                    className={`rotulo inline-flex items-center gap-3 border px-6 py-3 transition-colors ${
                        ocupado || excedeu
                            ? "cursor-default border-edge-soft text-ink-muted opacity-70"
                            : "cursor-pointer border-edge-soft text-ink-soft hover:bg-panel-soft"
                    }`}
                >
                    {executando ? "Executando…" : "Executar"}
                </button>

                {previa ? null : <button
                    type="button"
                    aria-pressed={feito}
                    aria-disabled={ocupado || excedeu || feito}
                    aria-busy={enviando}
                    onClick={() => {
                        void enviar();
                    }}
                    className={`rotulo inline-flex items-center gap-3 border px-6 py-3 transition-colors ${
                        feito
                            ? "cursor-default border-success text-success"
                            : ocupado || excedeu
                                ? "cursor-default border-brand-strong bg-brand-strong text-ink-soft opacity-70"
                                : "cursor-pointer border-brand-strong bg-brand-strong text-ink-soft hover:bg-brand"
                    }`}
                >
                    {feito ? "Concluído" : enviando ? "Enviando…" : "Enviar"}
                </button>}

                <p
                    role="status"
                    aria-live="polite"
                    className={`rotulo empty:hidden ${aviso ? "text-ink-muted" : "text-success"}`}
                >
                    {aviso ??
                        (excedeu
                            ? "Código longo demais."
                            : xpGanho !== null
                                ? `+${xpGanho} XP${diaGanho ? " · +1 dia" : ""}`
                                : "")}
                </p>
            </div>

            {(emSql || mostrarTerminal) && (
                <TerminalDeSaida
                    classeDaArea={emSql ? "h-28" : undefined}
                    vazio={emSql ? "> aguardando execução..." : undefined}
                    saida={saidaTerminal}
                    erro={erroTerminal}
                    veredito={correcao?.veredito ?? ""}
                />
            )}

            {correcao && (
                <ResultadoDosCasos correcao={correcao} funcao={especificacao.funcao}/>
            )}
        </section>
    );
}
