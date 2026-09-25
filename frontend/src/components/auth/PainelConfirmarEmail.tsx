"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PainelAuth } from "@/components/layout/PainelAuth";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelLink } from "@/components/ui/PixelLink";
import {
  ArteConfirmado,
  ArteEnvelope,
  ArteEnvelopeLendo,
  ArteLinkInvalido,
} from "@/components/ui/ilustracoes";
import { ErroApi, api } from "@/lib/api";

type Estado =
  | "aguardando"
  | "conferindo"
  | "falta_posse"
  | "confirmado"
  | "recusado"
  | "sem_token"
  | "ja_usado";

const TITULO = (
  <>
    TROCAR<span className="text-brand">.</span>EMAIL
  </>
);

const LINHA = "Confirmando a troca de endereço...";

const ESTILO_H2 =
  "m-0 font-display text-[13px] leading-[1.8] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]";
const ESTILO_P =
  "m-0 font-body text-lg leading-[1.8] tracking-[1px] text-ink-body";

export function PainelConfirmarEmailCarregando() {
  return (
    <PainelAuth
      titulo={TITULO}
      linhaTerminal={LINHA}
      ilustracao={<ArteEnvelope />}
      formulario={null}
    />
  );
}

export function PainelConfirmarEmail() {
  const token = useSearchParams().get("token");
  const [estado, setEstado] = useState<Estado>(
    token ? "aguardando" : "sem_token",
  );

  // Só no clique: o link chega ao endereço atual, e abri-lo (ou um scanner
  // de e-mail abri-lo) não pode autorizar a troca sozinho.
  function confirmar() {
    if (!token) return;
    setEstado("conferindo");
    api
      .confirmarTrocaEmail(token)
      .then((r) => setEstado(r.etapa === "posse" ? "falta_posse" : "confirmado"))
      .catch((erro) => {
        setEstado(
          erro instanceof ErroApi && erro.temCodigo("link_ja_usado")
            ? "ja_usado"
            : "recusado",
        );
      });
  }

  if (estado === "aguardando") {
    return (
      <PainelAuth
        titulo={TITULO}
        linhaTerminal={LINHA}
        ilustracao={<ArteEnvelope />}
        formulario={
          <div className="flex flex-col gap-5">
            <h2 className={ESTILO_H2}>CONFIRMAR TROCA?</h2>
            <p className={ESTILO_P}>
              Só confirme se foi você quem pediu a troca. Se não foi, feche
              esta página e troque sua senha.
            </p>
            <PixelButton type="button" onClick={confirmar} className="w-full">
              CONFIRMAR TROCA
            </PixelButton>
          </div>
        }
      />
    );
  }

  if (estado === "conferindo") {
    return (
      <PainelAuth
        titulo={TITULO}
        linhaTerminal={LINHA}
        ilustracao={<ArteEnvelopeLendo />}
        formulario={
          <p
            role="status"
            className="m-0 border-2 border-brand-shadow bg-panel-soft px-4 py-3 font-body text-base leading-[1.6] tracking-wide text-ink-body"
          >
            Conferindo seu link...
          </p>
        }
      />
    );
  }

  if (estado === "falta_posse") {
    return (
      <PainelAuth
        titulo={TITULO}
        linhaTerminal={LINHA}
        ilustracao={<ArteEnvelope />}
        formulario={
          <div className="flex flex-col gap-5">
            <h2 className={ESTILO_H2}>TROCA AUTORIZADA</h2>
            <p className={ESTILO_P}>
              Falta um passo: enviamos um link para o novo endereço. Abra por
              lá para confirmar que ele é seu. Até isso, nada muda na conta.
            </p>
            <PixelLink href="/configuracoes" className="w-full">
              VOLTAR ÀS CONFIGURAÇÕES
            </PixelLink>
          </div>
        }
      />
    );
  }

  if (estado === "confirmado") {
    return (
      <PainelAuth
        titulo={TITULO}
        linhaTerminal={LINHA}
        ilustracao={<ArteConfirmado />}
        formulario={
          <div className="flex flex-col gap-5">
            <h2 className={ESTILO_H2}>E-MAIL TROCADO</h2>
            <p className={ESTILO_P}>
              Pronto. Seu novo e-mail já é o endereço de acesso da sua conta.
            </p>
            <PixelLink href="/configuracoes" className="w-full">
              VOLTAR ÀS CONFIGURAÇÕES
            </PixelLink>
          </div>
        }
      />
    );
  }

  if (estado === "ja_usado") {
    return (
      <PainelAuth
        titulo={TITULO}
        linhaTerminal={LINHA}
        ilustracao={<ArteConfirmado />}
        formulario={
          <div className="flex flex-col gap-5">
            <h2 className={ESTILO_H2}>E-MAIL JÁ TROCADO</h2>
            <p className={ESTILO_P}>
              Este link já foi usado — a troca de e-mail já está feita. É só
              entrar com o novo endereço.
            </p>
            <PixelLink href="/entrar" className="w-full">
              INICIAR SESSÃO
            </PixelLink>
          </div>
        }
      />
    );
  }

  const semToken = estado === "sem_token";

  return (
    <PainelAuth
      titulo={TITULO}
      linhaTerminal={LINHA}
      ilustracao={<ArteLinkInvalido />}
      formulario={
        <div className="flex flex-col gap-5">
          <h2 className={ESTILO_H2}>
            {semToken ? "LINK INCOMPLETO" : "LINK JÁ USADO"}
          </h2>
          <p className={ESTILO_P}>
            {semToken
              ? "Abra o link direto do e-mail que enviamos para o seu endereço atual."
              : "Esse link já foi usado ou expirou. Se precisar, peça a troca de novo nas Configurações."}
          </p>
          <PixelLink href="/configuracoes" className="w-full">
            VOLTAR ÀS CONFIGURAÇÕES
          </PixelLink>
        </div>
      }
    />
  );
}
