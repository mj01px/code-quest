import { render, screen } from "@testing-library/react";

import { SecaoPerfil } from "@/components/configuracoes/SecaoPerfil";

describe("SecaoPerfil", () => {
  it("mostra o recorde de sequência do aluno", () => {
    render(
      <SecaoPerfil
        recorde={7}
        nickname="aluno"
        email="aluno@exemplo.com"
        pedirSenha={false}
        senhaAtual=""
        erros={{}}
        enviandoToken={false}
        aoMudarNickname={() => {}}
        aoMudarEmail={() => {}}
        aoMudarSenhaAtual={() => {}}
        aoAlterarToken={() => {}}
      />,
    );

    expect(screen.getByText("RECORDE DE SEQUÊNCIA: 7 DIAS")).toBeInTheDocument();
  });
});
