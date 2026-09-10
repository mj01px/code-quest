"use client";

interface Erros {
  nickname?: string | null;
  email?: string | null;
}

interface Props {
  nickname: string;
  email: string;
  erros: Erros;
  enviandoToken: boolean;
  aoMudarNickname: (valor: string) => void;
  aoMudarEmail: (valor: string) => void;
  aoAlterarToken: () => void;
}

const CAMPO =
  "flex items-center gap-2 border-2 border-brand-strong bg-field px-3 shadow-pixel focus-within:border-brand-pale";
const ENTRADA =
  "min-w-0 flex-1 border-0 bg-transparent py-[11px] font-label text-[13px] tracking-wide text-ink outline-none";
const ROTULO = "font-label text-[12px] tracking-[2px] text-ink-label";
const ERRO = "font-body text-base leading-[1.6] tracking-wide text-danger";

export function SecaoPerfil({
  nickname,
  email,
  erros,
  enviandoToken,
  aoMudarNickname,
  aoMudarEmail,
  aoAlterarToken,
}: Props) {
  return (
    <section className="flex w-full max-w-[640px] flex-col gap-4">
      <h2 className="m-0 font-display text-[13px] leading-[1.7] tracking-[1px] text-ink">
        Perfil
      </h2>

      <div className="flex flex-col gap-5 border-2 border-edge bg-panel p-5 shadow-pixel-lg sm:p-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="cfg-nome" className={ROTULO}>
            NICK
          </label>
          <div className={CAMPO}>
            <input
              id="cfg-nome"
              type="text"
              autoComplete="nickname"
              value={nickname}
              onChange={(e) => aoMudarNickname(e.target.value)}
              className={ENTRADA}
            />
          </div>
          {erros.nickname ? <p className={ERRO}>{erros.nickname}</p> : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="cfg-email" className={ROTULO}>
            EMAIL
          </label>
          <div className={CAMPO}>
            <input
              id="cfg-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => aoMudarEmail(e.target.value)}
              className={ENTRADA}
            />
          </div>
          {erros.email ? <p className={ERRO}>{erros.email}</p> : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-edge pt-3">
          <span className="font-body text-lg tracking-[1px] text-ink-muted">
            Trocar a senha de acesso
          </span>
          <button
            type="button"
            onClick={aoAlterarToken}
            disabled={enviandoToken}
            className="cursor-pointer border-2 border-brand bg-transparent px-5 py-2.5 font-label text-[10px] tracking-[2px] text-brand-light shadow-pixel hover:border-brand-pale hover:text-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enviandoToken ? "ENVIANDO..." : "ALTERAR SENHA"}
          </button>
        </div>
      </div>
    </section>
  );
}
