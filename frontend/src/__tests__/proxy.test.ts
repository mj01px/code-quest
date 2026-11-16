/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { ROTAS_PUBLICAS, cspCom, ePublica, proxy } from "../proxy";

const COM_SESSAO = { headers: { cookie: "cq_sessao=1" } };

function diretiva(csp: string, nome: string) {
  return csp.split("; ").find((parte) => parte.startsWith(`${nome} `)) ?? "";
}

describe("CSP com nonce (RNF11)", () => {
  it("script-src aceita só o nonce, sem 'unsafe-inline'", () => {
    const script = diretiva(cspCom("abc", false), "script-src");

    expect(script).toContain("'nonce-abc'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
  });

  it("libera só o caminho do Monaco na CDN, não o jsdelivr inteiro", () => {
    const script = diretiva(cspCom("abc", false), "script-src");

    expect(script).toMatch(/https:\/\/cdn\.jsdelivr\.net\/npm\/monaco-editor@[\d.]+\//);
    expect(script.split(" ")).not.toContain("https://cdn.jsdelivr.net");
  });

  it("gera nonce novo a cada request e o repassa ao render", () => {
    const um = proxy(new NextRequest("http://localhost/trilhas", COM_SESSAO));
    const outro = proxy(new NextRequest("http://localhost/trilhas", COM_SESSAO));

    const csp = um.headers.get("Content-Security-Policy") ?? "";
    expect(csp).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(csp).not.toBe(outro.headers.get("Content-Security-Policy"));
    // O Next lê o nonce da request: o cabeçalho tem de ir nela também.
    expect(um.headers.get("x-middleware-request-content-security-policy")).toBe(csp);
  });
});

describe("telas privadas exigem login", () => {
  function destino(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
    return proxy(new NextRequest(url, init)).headers.get("location");
  }

  it.each(["/ranking", "/clas", "/clas/convite/abc", "/trilhas", "/configuracoes", "/admin"])(
    "visitante em %s vai para o login, com a volta",
    (caminho) => {
      expect(destino(`http://localhost${caminho}`)).toBe(
        `http://localhost/entrar?volta=${encodeURIComponent(caminho)}`,
      );
    },
  );

  it("guarda a query string na volta", () => {
    expect(destino("http://localhost/ranking?mes=2026-11")).toBe(
      `http://localhost/entrar?volta=${encodeURIComponent("/ranking?mes=2026-11")}`,
    );
  });

  it.each([...ROTAS_PUBLICAS])("%s abre sem login", (caminho) => {
    expect(destino(`http://localhost${caminho}`)).toBeNull();
  });

  it("barra no fim não transforma rota pública em privada nem o contrário", () => {
    expect(ePublica("/faq/")).toBe(true);
    expect(ePublica("/ranking/")).toBe(false);
  });

  it.each(["cq_sessao=1", "cq_access=token"])("com %s a tela privada abre", (cookie) => {
    expect(destino("http://localhost/ranking", { headers: { cookie } })).toBeNull();
  });
});
