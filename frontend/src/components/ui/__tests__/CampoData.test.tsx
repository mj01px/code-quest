import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CampoData, mascararData, textoParaIso } from "@/components/ui/CampoData";

function Controlado({ inicial = "", aoMudar }: { inicial?: string; aoMudar?: (v: string) => void }) {
  const [valor, setValor] = useState(inicial);
  return (
    <CampoData
      rotulo="NASCIMENTO"
      limpavel
      value={valor}
      onChange={(v) => {
        setValor(v);
        aoMudar?.(v);
      }}
    />
  );
}

describe("CampoData", () => {
  it("limpável oferece limpar a data escolhida", async () => {
    const aoMudar = jest.fn();
    render(<CampoData rotulo="DE" limpavel value="2026-10-20" onChange={aoMudar} />);

    await userEvent.click(screen.getByRole("button", { name: "Abrir calendário" }));
    await userEvent.click(screen.getByRole("button", { name: "LIMPAR DATA" }));

    expect(aoMudar).toHaveBeenCalledWith("");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("sem limpável não mostra o botão de limpar", async () => {
    render(<CampoData rotulo="NASCIMENTO" value="2000-01-01" onChange={jest.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Abrir calendário" }));

    expect(screen.queryByRole("button", { name: "LIMPAR DATA" })).toBeNull();
  });

  it("aceita a data digitada só com números e aplica a máscara", async () => {
    const aoMudar = jest.fn();
    render(<Controlado aoMudar={aoMudar} />);

    const campo = screen.getByLabelText("NASCIMENTO");
    await userEvent.type(campo, "15032004");

    expect(campo).toHaveValue("15/03/2004");
    expect(aoMudar).toHaveBeenLastCalledWith("2004-03-15");
  });

  it("acusa data que não existe no calendário", async () => {
    const aoMudar = jest.fn();
    render(<Controlado aoMudar={aoMudar} />);

    await userEvent.type(screen.getByLabelText("NASCIMENTO"), "31022004");

    expect(screen.getByRole("alert")).toHaveTextContent("Data inválida.");
    expect(aoMudar).not.toHaveBeenCalled();
  });

  it("apagar um dígito invalida o valor sem apagar o resto do texto", async () => {
    const aoMudar = jest.fn();
    render(<Controlado inicial="2004-03-15" aoMudar={aoMudar} />);

    const campo = screen.getByLabelText("NASCIMENTO");
    await userEvent.type(campo, "{backspace}");

    expect(campo).toHaveValue("15/03/200");
    expect(aoMudar).toHaveBeenLastCalledWith("");
  });

  it("limpar pelo calendário esvazia o texto digitado", async () => {
    render(<Controlado inicial="2004-03-15" />);

    await userEvent.click(screen.getByRole("button", { name: "Abrir calendário" }));
    await userEvent.click(screen.getByRole("button", { name: "LIMPAR DATA" }));

    expect(screen.getByLabelText("NASCIMENTO")).toHaveValue("");
  });
});

describe("mascararData / textoParaIso", () => {
  it("monta a máscara aos poucos e ignora o que não é dígito", () => {
    expect(mascararData("1")).toBe("1");
    expect(mascararData("150")).toBe("15/0");
    expect(mascararData("15a03-2004999")).toBe("15/03/2004");
  });

  it("só converte data completa e real", () => {
    expect(textoParaIso("29/02/2004")).toBe("2004-02-29");
    expect(textoParaIso("29/02/2005")).toBe("");
    expect(textoParaIso("15/03/20")).toBe("");
  });
});
