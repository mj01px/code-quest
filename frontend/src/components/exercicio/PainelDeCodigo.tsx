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
    const args = exemplo.argumentos.map(comoTexto).join(", ");
    const saida = exemplo.erro_esperado
        ? `levanta ${exemplo.erro_esperado}`
        : `→ ${comoTexto(exemplo.esperado)}`;
    return `${funcao}(${args}) ${saida}`;
}

function descreverResultado(caso: ResultadoDoCaso, funcao: string): string {
    const args = (caso.argumentos ?? []).map(comoTexto).join(", ");
    return `${funcao}(${args}) → ${caso.erro || comoTexto(caso.obtido)}`;
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

    async function executar() {
        if (emVoo.current || !especificacao) return;
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
        if (emVoo.current || !especificacao) return;
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

    const retornos = correcao?.modo === "EXECUTAR"
        ? correcao.casos
            .filter((caso) => caso.visivel)
            .map((caso) => descreverResultado(caso, especificacao.funcao))
            .join("\n")
        : "";
    const saidaTerminal = [correcao?.saida, retornos].filter(Boolean).join("\n");
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
                aprender={aprender}
                centro={
                    <>
                        <CabecalhoDoPainel>
                            <span className="flex items-center gap-2 text-ink">
                                <span aria-hidden="true" className="h-2.5 w-2.5 bg-brand"/>
                                {especificacao.funcao}.py
                            </span>
                        </CabecalhoDoPainel>
                        {especificacao.requisitos.length > 0 ? (
                            <p className="m-0 border-b-2 border-edge bg-panel-deep px-4 py-2.5 font-body text-base text-ink-body">
                                O exercício pede para {especificacao.requisitos.map(descreverRequisito).join("; ")}.
                            </p>
                        ) : null}
                        <div className="min-h-[18rem] flex-1">
                            <EditorDeCodigo
                                semMoldura
                                altura="100%"
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
                            <span className="text-ink">Terminal</span>
                            <span className="text-ink-dim">codequest@os</span>
                        </CabecalhoDoPainel>
                        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-field">
                            <TerminalDeSaida
                                semMoldura
                                classeDaArea="h-56"
                                vazio="> aguardando execução..."
                                saida={correcao?.modo === "EXECUTAR" ? saidaTerminal : ""}
                                erro={correcao?.modo === "EXECUTAR" ? correcao.erro : ""}
                                veredito={correcao?.modo === "EXECUTAR" ? correcao.veredito : ""}
                            />
                            <div className="flex flex-col gap-3 px-4 pb-4 empty:hidden">
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
                                    <ResultadoDosCasos correcao={correcao} funcao={especificacao.funcao} semContagem/>
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
                    escreva a função{" "}
                    <span className="text-brand-light">{especificacao.funcao}</span>
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

            <EditorDeCodigo
                valor={codigo}
                aoMudar={(novo) => {
                    setCodigo(novo);
                    setCorrecao(null);
                    setAviso(null);
                }}
            />

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

            {mostrarTerminal && correcao && (
                <TerminalDeSaida
                    saida={saidaTerminal}
                    erro={correcao.erro}
                    veredito={correcao.veredito}
                />
            )}

            {correcao && (
                <ResultadoDosCasos correcao={correcao} funcao={especificacao.funcao}/>
            )}
        </section>
    );
}
