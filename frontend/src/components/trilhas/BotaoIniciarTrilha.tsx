"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { ErroApi, api, temSessao } from "@/lib/api";

const ESTILO =
  "cursor-pointer border-[3px] border-brand-light bg-brand-deep px-6 py-4 font-display text-xs leading-[1.7] tracking-[1px] text-ink uppercase shadow-[0_0_0_3px_var(--color-brand-void),4px_4px_0_rgba(0,0,0,0.7)] transition duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-brand-strong hover:shadow-[0_0_0_3px_var(--color-brand-void),2px_2px_0_rgba(0,0,0,0.7)] disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Entra na trilha e leva à primeira fase.
 *
 * O clique grava a entrada antes de navegar, porque é ela que separa "não
 * iniciada" de "iniciada com 0%" na listagem: sem o POST, o aluno voltaria
 * para /trilhas e veria a trilha como se nunca tivesse tocado nela.
 *
 * Sem sessão o botão vira link para o login, e não um botão que falha em 401.
 */
export function BotaoIniciarTrilha({
  trilhaSlug,
  primeiraFaseSlug,
  rotulo = "Iniciar trilha",
}: {
  trilhaSlug: string;
  /** Sem fase publicada, o botão não aparece: não haveria para onde ir. */
  primeiraFaseSlug: string | null;
  rotulo?: string;
}) {
  const router = useRouter();
  const { trilhasIniciadas, recarregar } = useProgresso();
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (primeiraFaseSlug === null) return null;

  const destino = `/trilhas/${trilhaSlug}/exercicios/${primeiraFaseSlug}`;
  const jaEntrou = trilhasIniciadas.has(trilhaSlug);

  async function entrar() {
    if (!temSessao()) {
      router.push(`/entrar?destino=${encodeURIComponent(destino)}`);
      return;
    }

    setEntrando(true);
    setErro(null);
    try {
      await api.iniciarTrilha(trilhaSlug);
    } catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        router.push(`/entrar?destino=${encodeURIComponent(destino)}`);
        return;
      }
      // A entrada não foi gravada: navegar assim deixaria a trilha como não
      // iniciada na volta, sem o aluno entender por quê.
      setErro("Não foi possível entrar na trilha agora. Tente de novo.");
      setEntrando(false);
      return;
    }

    // O Context alimenta a listagem e o mapa de fases: sem reler, a trilha só
    // apareceria como iniciada no próximo carregamento completo.
    recarregar();
    router.push(destino);
  }

  return (
    <span className="flex flex-col gap-2">
      <button
        type="button"
        onClick={entrar}
        disabled={entrando}
        className={ESTILO}
      >
        {entrando ? "Entrando..." : jaEntrou ? "Continuar" : rotulo}
      </button>

      {erro ? (
        <span
          role="alert"
          className="font-body text-base leading-[1.4] tracking-[1px] text-danger"
        >
          {erro}
        </span>
      ) : null}
    </span>
  );
}
