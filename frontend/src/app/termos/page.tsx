import type { Metadata } from "next";
import Link from "next/link";
import { ADefinir } from "@/components/legal/ADefinir";
import { PaginaLegal } from "@/components/legal/PaginaLegal";
import { Destaque, Item, Lista, Paragrafo, Secao } from "@/components/legal/Prosa";
import { versaoParaCabecalho } from "@/lib/documentosLegais";

export const metadata: Metadata = {
  title: "Termos de Uso | CodeQuest",
  description: "As regras de uso da plataforma CodeQuest.",
};

export default async function PaginaTermos() {
  const documento = await versaoParaCabecalho("termos");

  return (
    <PaginaLegal
      titulo={
        <>
          TERMOS<span className="text-brand">.</span>DE_USO
        </>
      }
      resumo="As regras do acordo entre você e a CodeQuest. Ao criar uma conta, você concorda com o que está escrito aqui."
      documento={documento}
    >
      <Secao numero={1} titulo="Sobre a CodeQuest">
        <Paragrafo>
          A CodeQuest é uma plataforma gamificada de ensino de programação. Você
          percorre trilhas de conteúdo, resolve exercícios e acompanha seu
          avanço pela evolução de uma criatura.
        </Paragrafo>
        <Paragrafo>
          A plataforma é mantida por <ADefinir>razão social ou nome do responsável</ADefinir>,
          como projeto acadêmico. Ela é uma ferramenta de estudo: não substitui
          curso formal, não emite certificado com validade oficial e não garante
          nenhum resultado profissional.
        </Paragrafo>
      </Secao>

      <Secao numero={2} titulo="Quem pode criar conta">
        <Paragrafo>
          É preciso ter <ADefinir>idade mínima</ADefinir> anos ou mais para criar
          uma conta por conta própria. Abaixo dessa idade, o cadastro só pode ser
          feito com a participação de um dos pais ou do responsável legal.
        </Paragrafo>
        <Paragrafo>
          Cada pessoa pode manter uma conta. Criar contas múltiplas para inflar
          ranking ou contornar suspensão não é permitido.
        </Paragrafo>
      </Secao>

      <Secao numero={3} titulo="Sua conta">
        <Paragrafo>
          Você informa um e-mail válido e escolhe um nickname e uma senha. O
          nickname é público: aparece no seu perfil e no ranking, então não pode
          conter ofensa, dado pessoal de terceiro nem se passar pela equipe da
          CodeQuest.
        </Paragrafo>
        <Paragrafo>
          Depois do cadastro enviamos um link de confirmação para o e-mail
          informado. O acesso só é liberado quando você abre esse link: é assim
          que sabemos que o endereço existe e é seu.
        </Paragrafo>
        <Paragrafo>
          A senha é sua responsabilidade. Não a compartilhe. Se desconfiar que
          alguém teve acesso à sua conta, troque a senha e nos avise pelo
          contato da seção 11.
        </Paragrafo>
      </Secao>

      <Secao numero={4} titulo="Como usar a plataforma">
        <Paragrafo>Ao usar a CodeQuest, você concorda em não:</Paragrafo>
        <Lista>
          <Item>
            burlar a correção de exercícios, seja por manipulação do cliente,
            seja por qualquer forma de automação de respostas;
          </Item>
          <Item>
            usar robôs, scripts ou raspagem para acessar a plataforma fora da
            interface normal;
          </Item>
          <Item>
            tentar acessar conta, dado ou área que não seja sua, nem explorar
            falha de segurança em proveito próprio;
          </Item>
          <Item>
            enviar conteúdo ilegal, ofensivo, ou código malicioso pelos campos
            de resposta;
          </Item>
          <Item>
            sobrecarregar a plataforma de propósito ou atrapalhar o uso por
            outras pessoas.
          </Item>
        </Lista>
        <Destaque>
          Encontrou uma falha de segurança? Conte para a gente pelo contato da
          seção 11 antes de qualquer outra coisa. Reporte de boa-fé nunca vira
          motivo de punição.
        </Destaque>
      </Secao>

      <Secao numero={5} titulo="Conteúdo das trilhas e o código que você escreve">
        <Paragrafo>
          O conteúdo das trilhas, os exercícios, os textos, a marca e a arte das
          criaturas pertencem à CodeQuest e aos seus autores. Você pode usá-los
          para estudar, mas não para redistribuir, revender ou publicar como se
          fossem seus.
        </Paragrafo>
        <Paragrafo>
          O código que você escreve nos exercícios continua sendo seu. Ao
          enviá-lo, você nos dá permissão para armazená-lo, executá-lo e
          avaliá-lo apenas para fazer a plataforma funcionar e mostrar seu
          progresso. Nada além disso.
        </Paragrafo>
      </Secao>

      <Secao numero={6} titulo="XP, criaturas e ranking">
        <Paragrafo>
          XP, níveis, criaturas e posição no ranking são elementos de jogo. Não
          têm valor econômico, não são moeda, não podem ser vendidos, trocados
          nem convertidos em dinheiro.
        </Paragrafo>
        <Paragrafo>
          Enquanto a plataforma estiver em desenvolvimento, podemos recalcular,
          ajustar ou zerar esses valores para corrigir erro de balanceamento ou
          fraude. Se isso afetar sua conta de forma relevante, avisamos.
        </Paragrafo>
      </Secao>

      <Secao numero={7} titulo="Disponibilidade">
        <Paragrafo>
          A CodeQuest é oferecida no estado em que se encontra. É um projeto em
          desenvolvimento: pode sair do ar, apresentar erro ou perder dado de
          progresso durante uma manutenção.
        </Paragrafo>
        <Paragrafo>
          Não prometemos disponibilidade contínua nem prazo de resposta
          garantido, e não nos responsabilizamos por prejuízo indireto
          decorrente de indisponibilidade. Fazemos o possível para avisar antes
          de interrupção programada.
        </Paragrafo>
      </Secao>

      <Secao numero={8} titulo="Suspensão e encerramento">
        <Paragrafo>
          Podemos suspender ou encerrar uma conta que descumpra estes Termos,
          especialmente a seção 4. Sempre que possível, avisamos antes e damos
          chance de corrigir.
        </Paragrafo>
        <Paragrafo>
          Você pode encerrar sua conta quando quiser. O que acontece com seus
          dados depois disso está descrito na{" "}
          <Link href="/privacidade">Política de Privacidade</Link>.
        </Paragrafo>
      </Secao>

      <Secao numero={9} titulo="Mudanças nestes Termos">
        <Paragrafo>
          Estes Termos têm versão e data de vigência, mostradas no topo desta
          página. Quando publicarmos uma versão nova, avisamos na plataforma e
          pedimos um novo aceite antes de você continuar usando.
        </Paragrafo>
        <Paragrafo>
          O aceite que você deu fica registrado com a versão que estava no ar
          naquele momento. Publicar uma versão nova não apaga o registro da
          anterior.
        </Paragrafo>
      </Secao>

      <Secao numero={10} titulo="Lei aplicável e foro">
        <Paragrafo>
          Estes Termos são regidos pela lei brasileira. Fica eleito o foro da
          comarca de <ADefinir>comarca</ADefinir> para resolver qualquer questão
          que não se resolva de forma amigável, sem prejuízo do direito do
          consumidor de acionar o foro do seu domicílio.
        </Paragrafo>
      </Secao>

      <Secao numero={11} titulo="Contato">
        <Paragrafo>
          Dúvida sobre estes Termos, denúncia de conduta ou pedido relacionado à
          sua conta: escreva para <ADefinir>e-mail de contato</ADefinir>. Também
          respondemos pela página de <Link href="/suporte">suporte</Link>.
        </Paragrafo>
      </Secao>
    </PaginaLegal>
  );
}
