import Image from "next/image";
import { BarraXP } from "./BarraXP";
import { sprite } from "./dados";
import { TituloSecao } from "./TituloSecao";

export function Pets() {
  return (
    <section id="pets" className="border-b-2 border-edge">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2">
        <div className="flex flex-col gap-7">
          <TituloSecao
            rotulo="COMPANHEIROS"
            titulo="Um pet por trilha"
            centralizado={false}
          >
            Blaze puxa JavaScript, Shellby ensina os fundamentos e lógica, Slyth
            mergulha em Python. Cada um evolui com o seu progresso e você troca
            quando quiser.
          </TituloSecao>

          <div className="flex flex-col gap-4 border-2 border-edge bg-panel p-6 shadow-pixel">
            <BarraXP nivel={28} nome="Shellby" atual={720} total={1000} />
          </div>
        </div>

        <div className="relative">
          <div className="flex items-center justify-center border-[3px] border-edge-soft bg-panel-deep px-6 py-10 shadow-frame [background-image:radial-gradient(circle_at_center,rgba(168,85,247,0.14),transparent_65%)]">
            <Image
              src={sprite("shellby", 3)}
              alt="Shellby no nível 3"
              width={500}
              height={500}
              className="h-60 w-60 animate-bob sm:h-72 sm:w-72"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
