// Espelho das regras de `apps/contas/validators.py` e dos validadores de senha
// configurados no Django. O servidor continua sendo a autoridade: isto existe
// só para o erro aparecer antes do envio. Ao mexer aqui, mexa lá também.

export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 20;
export const SENHA_MIN = 8;

const FORMATO_NICKNAME = /^[A-Za-z0-9_]+$/;

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
  if (/^\d+$/.test(valor)) return "A senha não pode ser só números.";
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
    return "É preciso aceitar os Termos de Uso e o Protocolo de Dados.";
  return null;
}
