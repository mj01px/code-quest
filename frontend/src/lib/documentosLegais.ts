import { buscarDocumentosLegais } from "./api";
import type { DocumentoVigente } from "./types";

export async function versaoParaCabecalho(
  qual: "termos" | "privacidade",
): Promise<DocumentoVigente | null> {
  try {
    const documentos = await buscarDocumentosLegais();
    return documentos[qual];
  } catch {
    return null;
  }
}
