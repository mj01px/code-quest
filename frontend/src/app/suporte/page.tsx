import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PaginaLegal } from "@/components/legal/PaginaLegal";
import { Destaque, Paragrafo, Secao } from "@/components/legal/Prosa";
import { DADOS_LEGAIS } from "@/lib/dadosLegais";

export const metadata: Metadata = {
  title: "Suporte",
  description:
    "Como falar com a equipe da CodeQuest e respostas para as dúvidas mais comuns.",
};

function Pergunta({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-l-4 border-edge-soft pl-4">
      <h3 className="m-0 font-label text-[12px] leading-[1.7] tracking-[2px] text-ink-label">
        {titulo}
      </h3>
      <p className="m-0 font-body text-lg leading-[1.8] tracking-[1px] text-ink-body text-pretty">
        {children}
      </p>
    </div>
  );
}

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
        <div className="flex flex-col gap-6">
          <Pergunta titulo="ESQUECI MINHA SENHA">
            Na tela de entrada, use{" "}
            <Link href="/recuperar-senha">recuperar senha</Link>. Enviamos um
            link para o seu e-mail cadastrado para você criar uma senha nova.
          </Pergunta>

          <Pergunta titulo="MEU PROGRESSO NAS TRILHAS SUMIU">
            O progresso fica guardado na sua conta, então aparece em qualquer
            aparelho em que você entrar. Se algo sumiu, confira se entrou na
            conta certa e, se o problema continuar, mande o seu nickname para o
            contato acima.
          </Pergunta>

          <Pergunta titulo="QUERO TROCAR MEU NICKNAME OU MEU E-MAIL">
            Os dois podem ser alterados na tela de{" "}
            <Link href="/configuracoes">Configurações</Link>. A troca de e-mail
            só vale depois que você confirma pelo link que enviamos.
          </Pergunta>

          <Pergunta titulo="COMO EXCLUO MINHA CONTA">
            Na tela de <Link href="/configuracoes">Configurações</Link>, na
            zona de risco. Enviamos um link de confirmação para o seu e-mail e,
            ao confirmar, a exclusão é imediata e não tem volta. O que acontece
            com os dados está na seção 6 da{" "}
            <Link href="/privacidade">Política de Privacidade</Link>.
          </Pergunta>

          <Pergunta titulo="POSSO TER MAIS DE UMA CONTA">
            Não. Cada pessoa mantém uma conta, conforme a seção 2 dos{" "}
            <Link href="/termos">Termos de Uso</Link>. Contas múltiplas para
            inflar ranking podem ser suspensas.
          </Pergunta>

          <Pergunta titulo="PERDI MINHA CRIATURA OU MEU XP ESTÁ ERRADO">
            Enquanto a plataforma está em desenvolvimento, podemos recalcular
            valores de gamificação para corrigir erro de balanceamento. Se algo
            parecer errado na sua conta, mande o seu nickname e a gente
            verifica.
          </Pergunta>

          <Pergunta titulo="A CODEQUEST É PAGA">
            Não. É um projeto acadêmico, sem cobrança, sem plano e sem venda de
            itens. XP, criaturas e ranking não têm valor econômico nem podem ser
            comprados.
          </Pergunta>

          <Pergunta titulo="ENCONTREI UM ERRO NO CONTEÚDO DE UMA AULA">
            Mande o link da aula ou do exercício e o que está errado. Correção
            de conteúdo é a coisa mais rápida de resolver por aqui.
          </Pergunta>
        </div>
      </Secao>
    </PaginaLegal>
  );
}
