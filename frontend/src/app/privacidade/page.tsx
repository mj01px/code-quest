import type { Metadata } from "next";
import Link from "next/link";
import { ADefinir } from "@/components/legal/ADefinir";
import { PaginaLegal } from "@/components/legal/PaginaLegal";
import {
  Destaque,
  Item,
  Lista,
  Paragrafo,
  Secao,
  Tabela,
} from "@/components/legal/Prosa";
import { versaoParaCabecalho } from "@/lib/documentosLegais";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Quais dados a CodeQuest trata, com que finalidade, por quanto tempo e como exercer seus direitos.",
};

const DADOS = [
  {
    chave: "email",
    celulas: [
      "E-mail",
      "Identifica sua conta e é como você entra na plataforma.",
      "Execução de contrato (art. 7º, V)",
    ],
  },
  {
    chave: "nickname",
    celulas: [
      "Nickname",
      "Seu nome público, exibido no perfil e no ranking.",
      "Execução de contrato (art. 7º, V)",
    ],
  },
  {
    chave: "senha",
    celulas: [
      "Senha",
      "Guardada apenas como hash Argon2. Não temos como ler sua senha, nem para te ajudar.",
      "Execução de contrato (art. 7º, V)",
    ],
  },
  {
    chave: "papel",
    celulas: [
      "Papel (aluno, autor, administrador)",
      "Define o que você pode acessar dentro da plataforma.",
      "Execução de contrato (art. 7º, V)",
    ],
  },
  {
    chave: "datas",
    celulas: [
      "Data de criação, de atualização e do último acesso",
      "Manutenção da conta e apuração de uso indevido.",
      "Legítimo interesse (art. 7º, IX)",
    ],
  },
  {
    chave: "aceite",
    celulas: [
      "Registro de aceite: qual documento, qual versão, data e IP de origem",
      "Comprovar que você teve acesso aos Termos e a esta Política antes de criar a conta.",
      "Exercício regular de direitos (art. 7º, VI)",
    ],
  },
  {
    chave: "verificacao",
    celulas: [
      "Data em que você confirmou o e-mail",
      "Comprovar que o endereço é válido e é seu, e liberar o login.",
      "Execução de contrato (art. 7º, V)",
    ],
  },
  {
    chave: "bloqueio",
    celulas: [
      "Tentativas de login falhas e prazo de bloqueio",
      "Barrar ataque de força bruta contra a sua conta.",
      "Legítimo interesse (art. 7º, IX)",
    ],
  },
  {
    chave: "criatura",
    celulas: [
      "Criatura escolhida, estágio atual e datas de aquisição e evolução",
      "Fazer a gamificação funcionar e mostrar seu avanço.",
      "Execução de contrato (art. 7º, V)",
    ],
  },
  {
    chave: "tokens",
    celulas: [
      "Identificador dos tokens de sessão emitidos, com data de criação e de expiração",
      "Manter você conectado e permitir invalidar sessões.",
      "Legítimo interesse (art. 7º, IX)",
    ],
  },
];

export default async function PaginaPrivacidade() {
  const documento = await versaoParaCabecalho("privacidade");

  return (
    <PaginaLegal
      titulo={
        <>
          POLITICA<span className="text-brand">.</span>DE
          <wbr />
          _PRIVACIDADE
        </>
      }
      resumo="O que a CodeQuest coleta, por que coleta, com quem compartilha, por quanto tempo guarda e como você exerce seus direitos como titular."
      documento={documento}
      indice={[
        { numero: 1, titulo: "Quem trata seus dados" },
        { numero: 2, titulo: "Quais dados guardamos" },
        { numero: 3, titulo: "O que fica no navegador" },
        { numero: 4, titulo: "Cookies" },
        { numero: 5, titulo: "Com quem compartilhamos" },
        { numero: 6, titulo: "Por quanto tempo guardamos" },
        { numero: 7, titulo: "Seus direitos" },
        { numero: 8, titulo: "Como protegemos seus dados" },
        { numero: 9, titulo: "Crianças e adolescentes" },
        { numero: 10, titulo: "Mudanças nesta Política" },
      ]}
    >
      <Secao numero={1} titulo="Quem trata seus dados">
        <Paragrafo>
          O controlador dos dados tratados na CodeQuest é{" "}
          <ADefinir>razão social, CNPJ ou nome do responsável</ADefinir>.
        </Paragrafo>
        <Paragrafo>
          O encarregado pelo tratamento de dados pessoais, previsto no art. 41
          da LGPD, é <ADefinir>nome do encarregado</ADefinir>, e o canal para
          falar com ele é <ADefinir>e-mail do encarregado</ADefinir>. É esse o
          endereço para qualquer pedido relacionado aos seus dados.
        </Paragrafo>
      </Secao>

      <Secao numero={2} titulo="Quais dados guardamos e por quê">
        <Paragrafo>
          Esta é a lista completa do que fica registrado no nosso servidor.
          Nenhum outro dado seu é coletado: não pedimos CPF, telefone, endereço,
          documento nem foto.
        </Paragrafo>
        <Tabela
          colunas={["Dado", "Para que serve", "Base legal"]}
          linhas={DADOS}
        />
      </Secao>

      <Secao numero={3} titulo="O que fica só no seu navegador">
        <Paragrafo>
          Parte das informações nunca chega ao nosso servidor. Elas ficam
          gravadas no armazenamento local do seu navegador, só naquele
          aparelho:
        </Paragrafo>
        <Lista>
          <Item>
            <strong className="text-ink-soft">
              Seu progresso nas trilhas
            </strong>
            : quais aulas você concluiu.
          </Item>
          <Item>
            <strong className="text-ink-soft">Sua preferência de menu</strong>:
            se a barra lateral fica aberta ou recolhida.
          </Item>
        </Lista>
        <Destaque>
          Hoje o progresso nas trilhas não é enviado para o servidor. Isso
          significa que ele se perde se você limpar os dados do navegador, usar
          janela anônima ou trocar de aparelho. Quando passarmos a guardá-lo na
          sua conta, atualizamos esta Política e avisamos antes.
        </Destaque>
      </Secao>

      <Secao numero={4} titulo="Cookies">
        <Paragrafo>
          Usamos quatro cookies, todos indispensáveis para a plataforma
          funcionar. Nenhum deles serve para publicidade ou para acompanhar você
          por outros sites:
        </Paragrafo>
        <Lista>
          <Item>
            <strong className="text-ink-soft">cq_access</strong> e{" "}
            <strong className="text-ink-soft">cq_refresh</strong>: mantêm você
            conectado. São marcados como HttpOnly, ou seja, o JavaScript da
            página não consegue lê-los, nem um script malicioso que fosse
            injetado.
          </Item>
          <Item>
            <strong className="text-ink-soft">cq_sessao</strong>: avisa à
            interface que provavelmente existe sessão, para saber o que
            desenhar. Não é credencial e não abre a conta de ninguém.
          </Item>
          <Item>
            <strong className="text-ink-soft">csrftoken</strong>: impede que
            outro site dispare ações na sua conta usando o seu navegador.
          </Item>
        </Lista>
        <Paragrafo>
          Não há rastreador de terceiros, pixel de publicidade nem ferramenta de
          análise de audiência. É por isso que você não vê banner de cookies
          aqui: cookie estritamente necessário ao serviço não depende de
          consentimento, e nenhum outro tipo existe nesta plataforma.
        </Paragrafo>
      </Secao>

      <Secao numero={5} titulo="Com quem compartilhamos">
        <Paragrafo>
          Não vendemos, não alugamos e não cedemos seus dados para publicidade.
          O compartilhamento se limita à infraestrutura necessária para a
          plataforma existir:
        </Paragrafo>
        <Lista>
          <Item>
            <strong className="text-ink-soft">Hospedagem</strong>:{" "}
            <ADefinir>provedor e país onde o servidor roda</ADefinir>.
          </Item>
          <Item>
            <strong className="text-ink-soft">Envio de e-mail</strong>: Brevo,
            que entrega a mensagem de confirmação de conta. O processamento
            ocorre em <ADefinir>região dos servidores do Brevo</ADefinir>, e
            fora do Brasil isso caracteriza transferência internacional nos
            termos do art. 33 da LGPD.
          </Item>
        </Lista>
        <Paragrafo>
          Também podemos compartilhar dados para cumprir ordem judicial ou
          requisição de autoridade competente. Se isso acontecer e a lei
          permitir, avisamos você.
        </Paragrafo>
      </Secao>

      <Secao numero={6} titulo="Por quanto tempo guardamos">
        <Paragrafo>
          Enquanto sua conta existir, mantemos os dados da seção 2. Quando você
          pede a exclusão, a conta é desativada imediatamente e fica marcada
          para anonimização.
        </Paragrafo>
        <Paragrafo>
          Depois de <ADefinir>prazo de arrependimento</ADefinir>, os dados que
          identificam você são apagados ou anonimizados de forma irreversível. O
          que sobra, como estatísticas agregadas de uso das trilhas, não permite
          mais chegar até você.
        </Paragrafo>
        <Paragrafo>
          O registro de aceite dos documentos é mantido pelo prazo de{" "}
          <ADefinir>prazo de guarda do aceite</ADefinir>, mesmo após a exclusão
          da conta, porque é a prova de que a relação existiu e foi consentida.
          O IP associado a ele é apagado junto com o restante dos seus dados.
        </Paragrafo>
      </Secao>

      <Secao numero={7} titulo="Seus direitos">
        <Paragrafo>
          O art. 18 da LGPD garante a você, sobre os seus dados:
        </Paragrafo>
        <Lista>
          <Item>confirmar que existe tratamento e acessar os dados;</Item>
          <Item>corrigir dado incompleto, inexato ou desatualizado;</Item>
          <Item>
            pedir anonimização, bloqueio ou eliminação de dado desnecessário ou
            excessivo;
          </Item>
          <Item>
            pedir a portabilidade dos dados para outro fornecedor de serviço;
          </Item>
          <Item>
            saber com quais entidades públicas e privadas compartilhamos seus
            dados;
          </Item>
          <Item>
            revogar o consentimento e pedir a eliminação dos dados tratados com
            base nele;
          </Item>
          <Item>
            se opor a um tratamento que você considere irregular, e pedir
            revisão de decisão automatizada.
          </Item>
        </Lista>
        <Destaque>
          Para exercer qualquer um desses direitos, escreva para{" "}
          <ADefinir>e-mail do encarregado</ADefinir>. Respondemos em até{" "}
          <ADefinir>prazo de resposta</ADefinir>. A tela onde você baixa e exclui
          seus dados sozinho está em construção; até ela existir, o pedido é
          feito por e-mail e nós executamos.
        </Destaque>
      </Secao>

      <Secao numero={8} titulo="Como protegemos seus dados">
        <Paragrafo>
          Senhas são guardadas com Argon2, o algoritmo recomendado hoje para
          essa finalidade, e nunca em texto legível. O acesso à plataforma é
          feito por conexão cifrada. Dentro do sistema, cada papel enxerga só o
          que precisa, e o acesso à sua conta exige token com validade curta.
        </Paragrafo>
        <Paragrafo>
          Nenhum sistema é imune. Se acontecer um incidente de segurança capaz
          de causar risco relevante a você, comunicamos você e a ANPD, como
          manda o art. 48 da LGPD.
        </Paragrafo>
      </Secao>

      <Secao numero={9} titulo="Crianças e adolescentes">
        <Paragrafo>
          A CodeQuest é destinada a pessoas com{" "}
          <ADefinir>idade mínima</ADefinir> anos ou mais. O tratamento de dados
          de crianças e adolescentes segue o art. 14 da LGPD e é feito sempre no
          melhor interesse deles.
        </Paragrafo>
        <Paragrafo>
          Se identificarmos uma conta criada por criança sem o consentimento
          específico de pelo menos um dos pais ou do responsável legal,
          suspendemos a conta e apagamos os dados. Se você é responsável e
          quiser pedir isso, use o contato da seção 1.
        </Paragrafo>
      </Secao>

      <Secao numero={10} titulo="Mudanças nesta Política">
        <Paragrafo>
          Este documento tem versão e data de vigência, mostradas no topo desta
          página. Quando publicarmos uma versão nova, avisamos na plataforma e
          pedimos um novo aceite antes de você continuar usando.
        </Paragrafo>
        <Paragrafo>
          As regras de uso da plataforma estão nos{" "}
          <Link href="/termos">Termos de Uso</Link>. Dúvidas de qualquer
          natureza, inclusive sobre esta Política, na página de{" "}
          <Link href="/suporte">suporte</Link>.
        </Paragrafo>
      </Secao>
    </PaginaLegal>
  );
}
