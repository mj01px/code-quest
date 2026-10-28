const CAMPO_TEXTO =
  "resize-y border-2 border-brand-strong bg-field px-3.5 py-3 font-body text-[15px] leading-[1.6] text-ink shadow-pixel outline-none focus:border-brand-pale";

export const ROTULO = "font-label text-[12px] tracking-[2px] text-ink-label";

export function AreaDeTexto({
  id,
  rotulo,
  ...props
}: { id: string; rotulo: string } & React.ComponentPropsWithoutRef<"textarea">) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={ROTULO}>
        {rotulo}
      </label>
      <textarea id={id} rows={4} className={CAMPO_TEXTO} {...props} />
    </div>
  );
}
