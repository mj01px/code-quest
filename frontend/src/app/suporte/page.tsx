import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/legal/PaginaLegal";
import { Destaque, Paragrafo, Secao } from "@/components/legal/Prosa";
import { DADOS_LEGAIS } from "@/lib/dadosLegais";

export const metadata: Metadata = {
  title: "Suporte",
  description:
    "Como falar com a equipe da CodeQuest e respostas para as dúvidas mais comuns.",
};

export default function PaginaSuporte() {
  return (
    <PaginaLegal
      titulo={
        <>
          SUPORTE<span className="text-brand">.</span>CODEQUEST
        </>
      }
      resumo="Um canal só, para tudo: dúvida sobre a plataforma, problema na sua conta, relato de erro e pedido relacionado aos seus dados pessoais."
      indice={[
        { numero: 1, titulo: "Como falar com a gente" },
        { numero: 2, titulo: "Seus dados pessoais" },
        { numero: 3, titulo: "Falha de segurança" },
        { numero: 4, titulo: "Dúvidas frequentes" },
      ]}
    >
      <Secao numero={1} titulo="Como falar com a gente">
        <Destaque>
          Escreva para{" "}
          <a href={`mailto:${DADOS_LEGAIS.emailContato}`}>
            {DADOS_LEGAIS.emailContato}
          </a>
          . Respondemos em até 15 dias.
        </Destaque>
        <Paragrafo>
          Para agilizar, conte o que você tentou fazer, o que aconteceu e qual o
          seu nickname. Nunca envie sua senha, nem para nós: ninguém da equipe
          vai pedir sua senha em nenhuma circunstância.
        </Paragrafo>
      </Secao>

      <Secao numero={2} titulo="Seus dados pessoais">
        <Paragrafo>
          Para acessar, corrigir, portar ou excluir seus dados, ou para tirar
          qualquer dúvida sobre o que a plataforma guarda, fale com o
          encarregado pelo tratamento de dados pessoais (art. 41 da LGPD),{" "}
          {DADOS_LEGAIS.encarregado}, em{" "}
          <a href={`mailto:${DADOS_LEGAIS.emailEncarregado}`}>
            {DADOS_LEGAIS.emailEncarregado}
          </a>
          .
        </Paragrafo>
        <Paragrafo>
          A lista completa do que é tratado, com finalidade e base legal, está
          na <Link href="/privacidade">Política de Privacidade</Link>. As regras de
          uso da plataforma estão nos{" "}
          <Link href="/termos">Termos de Uso</Link>.
        </Paragrafo>
      </Secao>

      <Secao numero={3} titulo="Encontrou uma falha de segurança?">
        <Paragrafo>
          Conte para a gente pelo mesmo e-mail, com o máximo de detalhe que
          puder, antes de divulgar em qualquer outro lugar. Relato feito de
          boa-fé nunca vira motivo de punição, e nós damos retorno.
        </Paragrafo>
      </Secao>

      <Secao numero={4} titulo="Dúvidas frequentes">
        <Paragrafo>
          Senha esquecida, progresso, XP, ranking, clãs, autoria e conta: as
          respostas para as dúvidas mais comuns estão nas{" "}
          <Link href="/faq">Perguntas Frequentes</Link>. Se a sua não estiver
          lá, escreva para o e-mail acima.
        </Paragrafo>
      </Secao>
    </PaginaLegal>
  );
}
