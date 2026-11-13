/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { cspCom, proxy } from "../proxy";

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
    const um = proxy(new NextRequest("http://localhost/trilhas"));
    const outro = proxy(new NextRequest("http://localhost/trilhas"));

    const csp = um.headers.get("Content-Security-Policy") ?? "";
    expect(csp).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(csp).not.toBe(outro.headers.get("Content-Security-Policy"));
    // O Next lê o nonce da request: o cabeçalho tem de ir nela também.
    expect(um.headers.get("x-middleware-request-content-security-policy")).toBe(csp);
  });
});
