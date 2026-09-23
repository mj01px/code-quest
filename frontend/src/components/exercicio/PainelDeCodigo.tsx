"use client";

import {useEffect, useRef, useState} from "react";

import {EditorDeCodigo} from "@/components/exercicio/EditorDeCodigo";
import {ResultadoDosCasos, comoTexto} from "@/components/exercicio/ResultadoDosCasos";
import {useProgresso} from "@/components/progresso/ProvedorProgresso";
import {estaConcluida} from "@/lib/progresso";
import {ErroApi, api} from "@/lib/api";
import type {
    Correcao,
    EspecificacaoDeCodigo,
    ExemploDeCaso,
    RequisitoEstrutural,
} from "@/lib/types";

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

function mensagemDoErro(erro: unknown): string {
    if (!(erro instanceof ErroApi)) {
        return "Não foi possível executar agora. Tente de novo.";
    }
    if (erro.status === 401) return "Entre na sua conta para executar o código.";
    // os outros erros ja vem do back
    return erro.message;
}

export function PainelDeCodigo({
                                   trilhaSlug,
                                   exercicioSlug,
                                   especificacao,
                               }: {
    trilhaSlug: string;
    exercicioSlug: string;
    especificacao: EspecificacaoDeCodigo;
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
            setConcluido(true);
            // Atualiza XP, nível e conclusões de uma vez. O aviso de nível escuta o
            // contexto, então dispara sozinho daqui.
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

                <button
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
                </button>

                <p
                    role="status"
                    aria-live="polite"
                    className={`rotulo empty:hidden ${aviso ? "text-ink-muted" : "text-success"}`}
                >
                    {aviso ??
                        (excedeu
                            ? "Código longo demais."
                            : xpGanho !== null
                                ? `+${xpGanho} XP`
                                : "")}
                </p>
            </div>

            {correcao && (
                <ResultadoDosCasos correcao={correcao} funcao={especificacao.funcao}/>
            )}
        </section>
    );
}