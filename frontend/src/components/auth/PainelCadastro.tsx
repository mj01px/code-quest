"use client";

import { useState } from "react";
import { PainelAuth } from "@/components/layout/PainelAuth";
import { PixelLink } from "@/components/ui/PixelLink";
import { ArteEnvelope } from "@/components/ui/ilustracoes";
import { AvisoVerificacao } from "./AvisoVerificacao";
import type { Cadastrado } from "./FormularioCadastro";
import { FormularioCadastro } from "./FormularioCadastro";

const SPRITE = "/marca/ovo.png";
const SPRITE_ALT = "Ovo do CodeQuest rachando";

export function PainelCadastro() {
  const [cadastrado, setCadastrado] = useState<Cadastrado | null>(null);

  if (cadastrado) {
    return (
      <PainelAuth
        titulo={
          <>
            NEW<span className="text-brand">.</span>PLAYER
          </>
        }
        linhaTerminal="Aguardando confirmação do e-mail..."
        ilustracao={<ArteEnvelope />}
        selo="VÁLIDO POR 24 HORAS"
        formulario={
          <AvisoVerificacao
            email={cadastrado.email}
            falhaNoEnvio={!cadastrado.emailEnviado}
          />
        }
      />
    );
  }

  return (
    <PainelAuth
      titulo={
        <>
          NEW<span className="text-brand">.</span>PLAYER
        </>
      }
      linhaTerminal="Registrando novo operador..."
      formulario={<FormularioCadastro aoCadastrar={setCadastrado} />}
      sprite={SPRITE}
      spriteAlt={SPRITE_ALT}
      tituloLateral="Desenvolva-se"
      textoLateral="Crie sua conta para salvar o progresso, evoluir sua criatura e disputar o ranking semanal."
      acaoLateral={
        <div className="flex flex-col items-center gap-4">
          <p className="m-0 font-label text-[10px] tracking-[2px] text-ink-muted">
            JÁ TEM CONTA?
          </p>
          <PixelLink href="/entrar">ACESSAR SISTEMA</PixelLink>
        </div>
      }
    />
  );
}
