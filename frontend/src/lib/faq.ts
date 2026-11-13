// Conteúdo do FAQ (/faq). Toda resposta descreve o que a plataforma faz hoje:
// mudou a regra no código, muda aqui e no Docs/Manual_do_Usuario.md.
//
// Marcação aceita nas respostas (texto puro, para a busca funcionar):
//   **negrito**           para nome de tela ou botão
//   [texto](/rota)        para link interno

export interface PerguntaFaq {
  /** Âncora estável: /faq#id abre direto nessa pergunta. */
  id: string;
  pergunta: string;
  resposta: string;
}

export interface CategoriaFaq {
  id: string;
  titulo: string;
  descricao: string;
  perguntas: PerguntaFaq[];
}

export const CATEGORIAS_FAQ: CategoriaFaq[] = [
  {
    id: "comecando",
    titulo: "Começando",
    descricao: "Conta, cadastro e primeiros passos.",
    perguntas: [
      {
        id: "o-que-e",
        pergunta: "O que é a CodeQuest?",
        resposta:
          "Uma plataforma pra aprender programação na prática: aula, quiz, exercício de código e flashcard. Cada exercício que você fecha dá XP pra sua criatura, que sobe de nível e evolui junto com você.",
      },
      {
        id: "e-paga",
        pergunta: "Tenho que pagar alguma coisa?",
        resposta:
          "Nada. É um projeto acadêmico, sem plano, sem cobrança e sem loja. XP, criatura e ranking não valem dinheiro e não dá pra comprar.",
      },
      {
        id: "idade-minima",
        pergunta: "Tem idade mínima?",
        resposta:
          "Tem: 16 anos completos. A gente pede a data de nascimento no cadastro e confere na hora.",
      },
      {
        id: "instalar",
        pergunta: "Preciso instalar alguma coisa?",
        resposta:
          "Não. O editor de código abre no próprio navegador e a correção roda nos nossos servidores. Só precisa de um navegador atualizado.",
      },
      {
        id: "email-confirmacao",
        pergunta: "Não chegou o e-mail de confirmação. E agora?",
        resposta:
          "Dá uma olhada no spam e na aba de promoções. Se não tiver lá, pede o reenvio pela tela de verificação de e-mail.",
      },
      {
        id: "esqueci-senha",
        pergunta: "Esqueci minha senha. E agora?",
        resposta:
          "Na tela de entrada, clica em [recuperar senha](/recuperar-senha). Chega um link no seu e-mail pra você criar uma senha nova.",
      },
      {
        id: "mais-de-uma-conta",
        pergunta: "Posso ter mais de uma conta?",
        resposta:
          "Não. É uma conta por pessoa, como está nos [Termos de Uso](/termos). Conta extra pra subir no ranking pode ser suspensa.",
      },
    ],
  },
  {
    id: "criaturas",
    titulo: "Criaturas",
    descricao: "Escolha, XP e evolução da sua criatura.",
    perguntas: [
      {
        id: "primeira-criatura",
        pergunta: "Como escolho minha criatura?",
        resposta:
          "No primeiro acesso. Ela começa como filhote e já vira sua criatura ativa. Essa escolha inicial é uma vez só, então escolhe com carinho.",
      },
      {
        id: "outras-criaturas",
        pergunta: "Dá pra ter outras criaturas?",
        resposta:
          "Dá! Em **CRIATURA** você pega novas do catálogo. Cada uma começa no nível 1, e não dá pra ter a mesma criatura duas vezes.",
      },
      {
        id: "criatura-xp",
        pergunta: "Qual criatura recebe o XP?",
        resposta:
          "Só a ativa. Quer dar XP pra outra? Troca a ativa em **CRIATURA**. E fica de olho no selo de bônus: trilha do assunto da sua criatura rende XP em dobro.",
      },
      {
        id: "evolucao",
        pergunta: "Minha criatura não evolui sozinha. Bugou?",
        resposta:
          "Não bugou, é de propósito: evoluir é escolha sua. Quando o nível permitir, abre **CRIATURA** e manda evoluir. São três estágios (filhote, jovem e adulto), um de cada vez.",
      },
    ],
  },
  {
    id: "trilhas",
    titulo: "Trilhas e aulas",
    descricao: "Como as aulas são montadas e liberadas.",
    perguntas: [
      {
        id: "partes-da-aula",
        pergunta: "Como uma aula funciona?",
        resposta:
          "Ela tem três partes: **Aprender** (leitura e quiz de fixação), **Praticar** (exercícios) e **Memorizar** (flashcards pra revisar).",
      },
      {
        id: "proxima-aula",
        pergunta: "A próxima aula não abre. Por quê?",
        resposta:
          "Falta terminar alguma etapa da aula anterior. A ordem é leitura, quiz e exercícios. O que você já concluiu continua aberto pra revisar quando quiser.",
      },
      {
        id: "progresso-sumiu",
        pergunta: "Meu progresso sumiu!",
        resposta:
          "O progresso fica guardado na sua conta, então aparece em qualquer aparelho. Confere se entrou na conta certa. Se continuar sumido, manda seu nickname pro [suporte](/suporte).",
      },
    ],
  },
  {
    id: "exercicios",
    titulo: "Exercícios e correção",
    descricao: "Rodar, enviar e a correção automática.",
    perguntas: [
      {
        id: "rodar-ou-enviar",
        pergunta: "Qual a diferença entre rodar e enviar?",
        resposta:
          "**Rodar** testa seu código nos casos visíveis e mostra o resultado no terminal. Serve pra conferir e não dá XP. **Enviar para correção** testa em todos os casos: passou em tudo, o exercício fecha e o XP entra.",
      },
      {
        id: "saida-certa-mas-errou",
        pergunta: "A saída tava certa, mas a correção recusou. Como assim?",
        resposta:
          "A correção usa casos de teste escondidos além dos visíveis: lista vazia, número negativo, entrada grande... Relê o enunciado e pensa em qual entrada seu código ainda não trata.",
      },
      {
        id: "linguagens",
        pergunta: "Quais linguagens têm correção automática?",
        resposta: "Hoje, Python e SQL (SQLite).",
      },
      {
        id: "limite-diario",
        pergunta: "Apareceu que atingi o limite de correções.",
        resposta:
          "Cada aluno tem um número de correções por dia. Acabou, volta amanhã pra enviar. Rodar o código pra testar continua liberado.",
      },
    ],
  },
  {
    id: "xp-ranking",
    titulo: "XP, ranking e conquistas",
    descricao: "Como o XP entra e como subir no ranking.",
    perguntas: [
      {
        id: "quanto-xp",
        pergunta: "Quanto XP vale cada exercício?",
        resposta:
          "Depende da dificuldade: 50 XP no iniciante, 100 no intermediário e 200 no avançado. Em trilha com bônus, dobra.",
      },
      {
        id: "sem-xp",
        pergunta: "Terminei o exercício e não ganhei XP.",
        resposta:
          "O XP só vale na primeira vez que você conclui. E no exercício de código ele vem do envio para correção, não de rodar.",
      },
      {
        id: "ranking",
        pergunta: "Como funciona o ranking?",
        resposta:
          "Mostra os 10 que mais somaram XP no mês e a sua posição. Empatou? Fica na frente quem chegou primeiro. Todo mês o placar zera, mas relaxa: seu XP e o nível da criatura não mudam.",
      },
      {
        id: "desafio-do-dia",
        pergunta: "O que é o desafio do dia?",
        resposta:
          "Um exercício de código por dia, fora das trilhas, pra manter o ritmo. Ele troca todo dia e é o mesmo pra todo mundo.",
      },
      {
        id: "sequencia",
        pergunta: "Como funciona a sequência de dias?",
        resposta:
          "Conta quantos dias seguidos você estudou. Passou um dia inteiro sem estudar, volta pro zero. Mas o seu recorde fica guardado.",
      },
      {
        id: "conquistas",
        pergunta: "Onde vejo minhas conquistas?",
        resposta:
          "Em **CONQUISTAS**: as medalhas que você já tem e as que faltam. Quando ganha uma nova, aparece um aviso no canto da tela.",
      },
      {
        id: "xp-errado",
        pergunta: "Meu XP tá errado.",
        resposta:
          "Como a plataforma ainda está em desenvolvimento, às vezes a gente recalcula valores pra acertar o balanceamento. Se algo parecer estranho, manda seu nickname pro [suporte](/suporte) que a gente olha.",
      },
    ],
  },
  {
    id: "clas",
    titulo: "Clãs",
    descricao: "Grupos de estudo, convites e cargos.",
    perguntas: [
      {
        id: "entrar-em-cla",
        pergunta: "Como entro num clã?",
        resposta:
          "Em **CLÃS**: entra direto num clã público ou usa o link de convite de um privado. Alguns pedem nível mínimo.",
      },
      {
        id: "criar-cla",
        pergunta: "Como crio e organizo um clã?",
        resposta:
          "Também em **CLÃS**. Quem cria vira Líder: gera e revoga o link de convite, muda os cargos (Co-líder e Membro) e pode remover membros.",
      },
    ],
  },
  {
    id: "autoria",
    titulo: "Ser autor",
    descricao: "Criar conteúdo e o caminho até publicar.",
    perguntas: [
      {
        id: "virar-autor",
        pergunta: "Como viro autor?",
        resposta:
          "Abre **SER AUTOR** no menu, escolhe o que quer criar, escreve a carta de apresentação e envia. Aprovou, o item **AUTORIA** aparece no menu. Recusou, você vê o motivo e pode pedir de novo.",
      },
      {
        id: "conteudo-nao-aparece",
        pergunta: "Por que meu conteúdo ainda não aparece pros alunos?",
        resposta:
          "Todo conteúdo passa por revisão: rascunho, em revisão, aprovado e publicado. Foi devolvido? O parecer do revisor aparece em **AUTORIA**. Foi aprovado? Falta você mesmo publicar.",
      },
      {
        id: "erro-no-conteudo",
        pergunta: "Achei um erro numa aula.",
        resposta:
          "Valeu! Manda pro [suporte](/suporte) o link da aula ou do exercício e o que está errado. Correção de conteúdo é o que a gente resolve mais rápido.",
      },
    ],
  },
  {
    id: "conta",
    titulo: "Conta e segurança",
    descricao: "Nickname, e-mail, 2FA, dados e exclusão.",
    perguntas: [
      {
        id: "trocar-nickname-email",
        pergunta: "Quero trocar meu nickname ou meu e-mail.",
        resposta:
          "Os dois mudam em [Configurações](/configuracoes). A troca de e-mail só vale depois que você confirma pelo link que a gente manda.",
      },
      {
        id: "2fa",
        pergunta: "Como ativo a verificação em duas etapas (2FA)?",
        resposta:
          "Em [Configurações](/configuracoes), na parte de segurança. Guarda os códigos de recuperação num lugar seguro: são eles que salvam sua conta se você perder o celular.",
      },
      {
        id: "perdi-autenticador",
        pergunta: "Perdi o acesso ao autenticador.",
        resposta:
          "Entra com um dos códigos de recuperação que você guardou quando ativou o 2FA.",
      },
      {
        id: "meus-dados",
        pergunta: "Dá pra baixar uma cópia dos meus dados?",
        resposta:
          "Dá. Em [Configurações](/configuracoes), na parte de seus dados. O que a gente guarda e por quê está na [Política de Privacidade](/privacidade).",
      },
      {
        id: "excluir-conta",
        pergunta: "Como excluo minha conta?",
        resposta:
          "Em [Configurações](/configuracoes), na zona de risco. Pede confirmação por e-mail e senha, e depois de confirmar não tem volta. O que acontece com os dados está na [Política de Privacidade](/privacidade).",
      },
    ],
  },
  {
    id: "avisos",
    titulo: "Avisos na tela",
    descricao: "Mensagens de erro e de limite.",
    perguntas: [
      {
        id: "muitas-requisicoes",
        pergunta: "Apareceu “Muitas requisições”.",
        resposta:
          "Calma, não quebrou nada. É uma proteção contra muitos cliques seguidos. Espera os segundos do aviso e faz de novo. Nada se perde.",
      },
      {
        id: "servidor-fora",
        pergunta: "Diz que o servidor está lento ou fora do ar.",
        resposta:
          "Espera uns instantes e recarrega a página. Se continuar, avisa o [suporte](/suporte).",
      },
    ],
  },
];

/** Tira acento, caixa e a marcação, para a busca achar "relogio" em "Relógio". */
export function normalizarBusca(texto: string): string {
  return texto
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*/g, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export interface ResultadoFaq extends PerguntaFaq {
  categoria: Pick<CategoriaFaq, "id" | "titulo">;
}

/** Perguntas cuja pergunta ou resposta contém todos os termos da busca. */
export function buscarNoFaq(
  categorias: CategoriaFaq[],
  busca: string,
): ResultadoFaq[] {
  const termos = normalizarBusca(busca).split(/\s+/).filter(Boolean);
  if (termos.length === 0) return [];
  return categorias.flatMap((c) =>
    c.perguntas
      .filter((p) => {
        const alvo = normalizarBusca(`${p.pergunta} ${p.resposta}`);
        return termos.every((t) => alvo.includes(t));
      })
      .map((p) => ({ ...p, categoria: { id: c.id, titulo: c.titulo } })),
  );
}
