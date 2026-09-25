// Espelho das regras de `apps/contas/validators.py` e dos validadores de senha
// configurados no Django. O servidor continua sendo a autoridade: isto existe
// só para o erro aparecer antes do envio. Ao mexer aqui, mexa lá também.

export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 20;
export const SENHA_MIN = 8;
export const SENHA_MAX = 128;
export const EMAIL_MAX = 254;
export const IDADE_MINIMA = 16;
// Código de 2FA: 6 dígitos (TOTP/e-mail) ou recuperação "xxxx-xxxx" (9 chars).
export const CODIGO_MFA_MAX = 12;

const FORMATO_NICKNAME = /^[A-Za-z0-9_]+$/;
const SENHA_ESPECIAL = /[!@#$%^&*()\-_=+[\]{};:'",.<>?/\\|`~]/;

const NICKNAMES_RESERVADOS = new Set([
  "admin",
  "administrador",
  "api",
  "auth",
  "avatar",
  "cadastro",
  "conquistas",
  "criatura",
  "criaturas",
  "comunidade",
  "comunidades",
  "entrar",
  "exercicio",
  "exercicios",
  "login",
  "logout",
  "perfil",
  "ranking",
  "registrar",
  "sair",
  "settings",
  "sobre",
  "static",
  "submissao",
  "submissoes",
  "suporte",
  "termos",
  "trilha",
  "trilhas",
  "u",
  "codequest",
  "code_quest",
  "equipe",
  "moderador",
  "oficial",
  "root",
  "sistema",
  "staff",
  "suporte_codequest",
  "eu",
  "me",
  "none",
  "null",
  "undefined",
]);

export function validarEmail(valor: string): string | null {
  const email = valor.trim();
  if (!email) return "Informe seu e-mail.";
  if (email.length > EMAIL_MAX) return `Use no máximo ${EMAIL_MAX} caracteres.`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "E-mail inválido.";
  return null;
}

export function validarNickname(valor: string): string | null {
  const nickname = valor.trim();
  if (!nickname) return "Escolha um nickname.";
  if (nickname.length < NICKNAME_MIN)
    return `Use pelo menos ${NICKNAME_MIN} caracteres.`;
  if (nickname.length > NICKNAME_MAX)
    return `Use no máximo ${NICKNAME_MAX} caracteres.`;
  if (!FORMATO_NICKNAME.test(nickname))
    return "Só letras sem acento, números e underscore.";
  if (NICKNAMES_RESERVADOS.has(nickname.toLowerCase()))
    return "Este nickname não está disponível.";
  return null;
}

export function validarSenha(valor: string, contexto: string[] = []): string | null {
  if (!valor) return "Informe uma senha.";
  if (valor.length < SENHA_MIN)
    return `Use pelo menos ${SENHA_MIN} caracteres.`;
  if (valor.length > SENHA_MAX)
    return `Use no máximo ${SENHA_MAX} caracteres.`;
  if (!/[A-Z]/.test(valor)) return "Inclua ao menos uma letra maiúscula.";
  if (!/[a-z]/.test(valor)) return "Inclua ao menos uma letra minúscula.";
  if (!/[0-9]/.test(valor)) return "Inclua ao menos um número.";
  if (!SENHA_ESPECIAL.test(valor))
    return "Inclua ao menos um caractere especial.";
  const alvo = valor.toLowerCase();
  for (const parte of contexto) {
    const limpo = parte.trim().toLowerCase().split("@")[0];
    if (limpo.length >= 4 && alvo.includes(limpo))
      return "A senha não pode conter seu e-mail ou nickname.";
  }
  return null;
}

export function validarConfirmacao(
  senha: string,
  confirmacao: string,
): string | null {
  if (!confirmacao) return "Repita a senha.";
  if (senha !== confirmacao) return "As senhas não conferem.";
  return null;
}

export function validarAceite(aceito: boolean): string | null {
  if (!aceito)
    return "É preciso aceitar os Termos de Uso e a Política de Privacidade.";
  return null;
}

/** Idade em anos completos na data de hoje (só conta o aniversário já passado). */
function idadeEmAnos(nascimento: Date, hoje: Date): number {
  let anos = hoje.getFullYear() - nascimento.getFullYear();
  const aniversarioAindaNaoChegou =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() &&
      hoje.getDate() < nascimento.getDate());
  if (aniversarioAindaNaoChegou) anos -= 1;
  return anos;
}

export function validarDataNascimento(valor: string): string | null {
  if (!valor) return "Informe sua data de nascimento.";
  // input[type=date] entrega "YYYY-MM-DD"; monta em horário local.
  const [ano, mes, dia] = valor.split("-").map(Number);
  const nascimento = new Date(ano, (mes ?? 1) - 1, dia ?? 1);
  if (Number.isNaN(nascimento.getTime())) return "Data inválida.";

  const hoje = new Date();
  if (nascimento > hoje) return "Data inválida.";
  if (idadeEmAnos(nascimento, hoje) < IDADE_MINIMA)
    return `É preciso ter pelo menos ${IDADE_MINIMA} anos para criar uma conta.`;
  return null;
}
