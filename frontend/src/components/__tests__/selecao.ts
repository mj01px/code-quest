import { screen, waitFor, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";

export async function abrirSelect(
  u: Pick<UserEvent, "click">,
  campo: HTMLElement,
) {
  await waitFor(() => expect(campo).toBeEnabled());
  await u.click(campo);
  return screen.findByRole("listbox");
}

export async function escolherOpcao(
  u: Pick<UserEvent, "click">,
  campo: HTMLElement,
  rotulo: string,
) {
  const lista = await abrirSelect(u, campo);
  await u.click(await within(lista).findByRole("option", { name: rotulo }));
}
