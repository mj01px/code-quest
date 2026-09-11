import { renderToStaticMarkup } from "react-dom/server";

import RootLayout from "@/app/layout";
import { LayoutDoApp } from "@/components/layout/LayoutDoApp";
import { CHAVE, FECHADA } from "@/lib/preferenciaSidebar";

// O script de restauração da sidebar só roda a partir do HTML do servidor: o
// React não executa script inline em render de cliente. Por isso o teste é de
// markup servido, e não de render no jsdom.

function markupDaRaiz(children: React.ReactNode = <p>conteúdo</p>): string {
  return renderToStaticMarkup(
    <RootLayout params={Promise.resolve({})}>{children}</RootLayout>,
  );
}

function extrairScript(markup: string): string {
  const achado = /<script>([\s\S]*?)<\/script>/.exec(markup);
  if (achado === null) throw new Error("Nenhum <script> inline no markup.");
  return achado[1];
}

function rodar(script: string): void {
  new Function(script)();
}

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.sidebar;
});

describe("script de restauração da sidebar", () => {
  it("é servido no layout raiz, e não na moldura do app", () => {
    // O bug: em LayoutDoApp o script só existia em carregamento completo de
    // /trilhas. Quem chegava do login por router.push nunca o recebia.
    expect(markupDaRaiz()).toContain("dataset.sidebar");
  });

  it("é servido mesmo numa página sem a moldura do app", () => {
    // É o caso de /entrar: a preferência precisa estar aplicada no documento
    // antes do router.push para /trilhas, que não recarrega a página.
    const markup = markupDaRaiz(<form>login</form>);

    expect(markup).not.toContain("painel-lateral");
    expect(markup).toContain("dataset.sidebar");
  });

  it("aplica a preferência recolhida", () => {
    window.localStorage.setItem(CHAVE, FECHADA);

    rodar(extrairScript(markupDaRaiz()));

    expect(document.documentElement.dataset.sidebar).toBe(FECHADA);
  });

  it("não marca nada quando a chave não existe", () => {
    rodar(extrairScript(markupDaRaiz()));

    expect(document.documentElement.dataset.sidebar).toBeUndefined();
  });

  it("descarta valor malformado sem remover a chave", () => {
    window.localStorage.setItem(CHAVE, "{lixo:1}");

    rodar(extrairScript(markupDaRaiz()));

    expect(document.documentElement.dataset.sidebar).toBeUndefined();
    // Remover seria um caminho de preferência escrevendo em localStorage:
    // a chave fica inerte, por decisão.
    expect(window.localStorage.getItem(CHAVE)).toBe("{lixo:1}");
  });

  it("não voltou para a moldura do app", () => {
    // Guarda de regressão: dentro de um layout de segmento o script volta a
    // falhar em navegação client-side, e falha em silêncio.
    const markup = renderToStaticMarkup(
      <LayoutDoApp>
        <p>conteúdo</p>
      </LayoutDoApp>,
    );

    expect(markup).not.toContain("<script");
  });
});
