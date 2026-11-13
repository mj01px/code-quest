import { screen } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";

/** Dados válidos com que os testes de cadastro preenchem o formulário. */
export const CADASTRO = {
  email: "novato@exemplo.com",
  nickname: "novato",
  senha: "Trilha-de-python-8",
};

/**
 * Usuário sem o setTimeout(0) que o user-event põe entre um evento e outro:
 * o cadastro exige uns vinte cliques, e essa espera quase dobra o custo de cada um.
 */
export function criarUsuario(): UserEvent {
  return userEvent.setup({ delay: null });
}

/**
 * Preenche o cadastro com dados válidos, sem marcar o aceite.
 *
 * Os textos são colados, não digitados: nenhum teste de cadastro observa tecla a
 * tecla, e cada tecla re-renderiza o formulário inteiro. A digitação no PixelField
 * segue coberta pelos testes de login e de recuperação de senha.
 */
export async function preencherCadastro(
  usuario: UserEvent,
  { ano = 2000 }: { ano?: number } = {},
) {
  await colar(usuario, "E-MAIL", CADASTRO.email);
  await colar(usuario, "NICKNAME", CADASTRO.nickname);
  await colar(usuario, "SENHA", CADASTRO.senha);
  await escolherNascimento(usuario, ano);
}

async function colar(usuario: UserEvent, rotulo: string, texto: string) {
  await usuario.click(screen.getByLabelText(rotulo));
  await usuario.paste(texto);
}

/**
 * Digita 15/01 do ano dado, só com números, como o aluno faz. O calendário
 * segue coberto pelos testes do CampoData.
 */
async function escolherNascimento(usuario: UserEvent, ano: number) {
  await colar(usuario, "DATA DE NASCIMENTO", `1501${ano}`);
}
