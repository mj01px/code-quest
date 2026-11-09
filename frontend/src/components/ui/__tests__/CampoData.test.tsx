import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CampoData } from "@/components/ui/CampoData";

describe("CampoData", () => {
  it("limpável oferece limpar a data escolhida", async () => {
    const aoMudar = jest.fn();
    render(<CampoData rotulo="DE" limpavel value="2026-10-20" onChange={aoMudar} />);

    await userEvent.click(screen.getByLabelText("DE"));
    await userEvent.click(screen.getByRole("button", { name: "LIMPAR DATA" }));

    expect(aoMudar).toHaveBeenCalledWith("");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("sem limpável não mostra o botão de limpar", async () => {
    render(<CampoData rotulo="NASCIMENTO" value="2000-01-01" onChange={jest.fn()} />);

    await userEvent.click(screen.getByLabelText("NASCIMENTO"));

    expect(screen.queryByRole("button", { name: "LIMPAR DATA" })).toBeNull();
  });
});
