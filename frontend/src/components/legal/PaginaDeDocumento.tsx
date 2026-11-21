import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { buscarDocumentoLegal, ErroApi } from "@/lib/api";
import { estruturarDocumento } from "@/lib/textoLegal";
import { TIPO } from "@/lib/tipografia";
import type { DocumentoLegalCompleto } from "@/lib/types";
import { ConteudoLegal } from "./ConteudoLegal";
import { PaginaLegal } from "./PaginaLegal";
import { Destaque } from "./Prosa";

interface Props {
  slug: "termos" | "privacidade";
  versao?: string;
  titulo: ReactNode;
  resumo: string;
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

async function carregar(
  slug: Props["slug"],
  versao?: string,
): Promise<DocumentoLegalCompleto | null> {
  try {
    return await buscarDocumentoLegal(slug, versao);
  } catch (erro) {
    if (erro instanceof ErroApi && erro.status === 404 && versao) notFound();
    return null;
  }
}

export async function paginaDeDocumento({ slug, versao, titulo, resumo }: Props) {
  const documento = await carregar(slug, versao);

  if (!documento) {
    return (
      <PaginaLegal titulo={titulo} resumo={resumo}>
        <Destaque>
          Não foi possível carregar o documento agora. Tente de novo em alguns
          minutos ou fale com a gente pela página de{" "}
          <Link href="/suporte">suporte</Link>.
        </Destaque>
      </PaginaLegal>
    );
  }

  const indice = estruturarDocumento(documento.conteudo).secoes.map((secao) => ({
    numero: secao.numero,
    titulo: secao.titulo,
  }));
  const anteriores = documento.historico.filter((item) => item.versao !== documento.versao);

  return (
    <PaginaLegal titulo={titulo} resumo={resumo} documento={documento} indice={indice}>
      {documento.vigente ? null : (
        <Destaque>
          Você está vendo a versão {documento.versao}, que não está mais em
          vigor. <Link href={documento.caminho}>Ver a versão vigente</Link>.
        </Destaque>
      )}

      <ConteudoLegal markdown={documento.conteudo} />

      {anteriores.length > 0 ? (
        <nav aria-label="Outras versões" className="flex flex-col gap-3 pt-4">
          <p className={`m-0 ${TIPO.etiqueta} text-ink-muted`}>OUTRAS VERSÕES</p>
          <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
            {anteriores.map((item) => (
              <li key={item.versao}>
                <Link
                  href={`${documento.caminho}?versao=${encodeURIComponent(item.versao)}`}
                  className={`inline-block border-2 border-edge bg-panel px-3 py-2 ${TIPO.etiqueta} text-ink-muted hover:border-brand hover:text-brand-mist`}
                >
                  VERSÃO {item.versao} · {formatarData(item.vigente_desde)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </PaginaLegal>
  );
}
