import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PainelDeAlternativas } from "@/components/exercicio/PainelDeAlternativas";
import { api } from "@/lib/api";

jest.mock("@/components/progresso/ProvedorProgresso", () => ({
  useProgresso: () => ({ chaves: new Set(), recarregar: jest.fn() }),
}));
jest.mock("@/lib/api", () => ({
  api: { concluirAlternativa: jest.fn() },
}));

const concluirAlternativa = api.concluirAlternativa as jest.Mock;

beforeEach(() => jest.clearAllMocks());

it("mostra a explicação após conferir e só anuncia XP no acerto", async () => {
  concluirAlternativa
    .mockResolvedValueOnce({
      aprovado: false,
      explicacao: "Strings são imutáveis.",
      alternativa_correta_id: 2,
    })
    .mockResolvedValueOnce({
      aprovado: true,
      explicacao: "Strings são imutáveis.",
      ja_concluido: false,
      xp_ganho: 50,
      sequencia: { atual: 1, recorde: 1, aumentou: true },
    });
  render(
    <PainelDeAlternativas
      trilhaSlug="python"
      exercicioSlug="string-imutavel-escolha"
      alternativas={[{ id: 1, texto: "ANA" }, { id: 2, texto: "ana" }]}
    />,
  );

  await userEvent.click(screen.getByLabelText("ANA"));
  expect(await screen.findByText(/Resposta incorreta. Strings são imutáveis./)).toBeInTheDocument();
  expect(screen.getByText("ANA").closest("label")).toHaveClass("border-danger");
  expect(screen.getByText("ana").closest("label")).toHaveClass("border-success");
  expect(screen.getByText("CORRETA")).toBeInTheDocument();
  expect(screen.queryByText(/\+50 XP/)).not.toBeInTheDocument();

  await userEvent.click(screen.getByLabelText("ana"));
  expect(await screen.findByRole("status")).toHaveTextContent("+50 XP · +1 dia");
  expect(screen.getByText("ana").closest("label")).toHaveClass("border-success");
  expect(screen.getByText("ANA").closest("label")).not.toHaveClass("border-danger");
  expect(concluirAlternativa).toHaveBeenLastCalledWith("python", "string-imutavel-escolha", 2);
});
