"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

import { TextoInline } from "@/components/licao/ConteudoDaLicao";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { spriteDeDialogo } from "@/lib/pet";

export function PetComDica({
  dica,
  extra,
  tamanho = 150,
  flutuante = false,
  balaoAEsquerda = false,
}: {
  dica: string;
  extra?: ReactNode;
  tamanho?: number;
  flutuante?: boolean;
  balaoAEsquerda?: boolean;
}) {
  const { criatura } = useProgresso();
  const [aberta, setAberta] = useState(false);
  const nome = criatura?.criatura.nome ?? "Seu pet";

  return (
    <div
      className={
        flutuante
          ? "relative flex flex-row-reverse items-end gap-3"
          : "flex flex-col items-center gap-3 lg:items-start"
      }
    >
      {aberta ? (
        <div
          role="status"
          className={`m-0 border-2 ${
            flutuante
              ? `absolute bottom-full z-30 mb-3 w-72 ${balaoAEsquerda ? "left-0" : "right-0"}`
              : "relative max-w-[18rem]"
          } border-ink bg-ink px-4 py-3 font-body text-base leading-[1.5] text-void shadow-[4px_4px_0_rgba(0,0,0,0.7)] [&_strong]:text-void`}
        >
          <span className="mb-1 block font-label text-[10px] tracking-[2px] text-brand-dark uppercase">
            {nome} diz
          </span>
          <p className="m-0">
            <TextoInline texto={dica} />
          </p>
          {extra}
        </div>
      ) : null}
      <button
        type="button"
        aria-expanded={aberta}
        aria-label={aberta ? `Fechar a dica de ${nome}` : `Pedir uma dica a ${nome}`}
        onClick={() => setAberta((valor) => !valor)}
        className="cursor-pointer border-0 bg-transparent p-0 transition-transform duration-150 hover:-translate-y-1"
      >
        <Image
          src={spriteDeDialogo(criatura)}
          alt=""
          width={tamanho}
          height={tamanho}
          style={{ width: tamanho, height: tamanho }}
          className="animate-bob block"
        />
      </button>
      {!aberta && !flutuante ? (
        <span className="font-label text-[10px] tracking-[2px] text-ink-dim uppercase">
          Clique para uma dica
        </span>
      ) : null}
    </div>
  );
}
