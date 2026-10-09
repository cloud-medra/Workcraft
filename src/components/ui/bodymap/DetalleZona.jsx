import { zonaPorId, nombreLado } from '../../../../functions/bodymap/nucleo.mjs';
import CuerpoSVG from './CuerpoSVG';
import { cajaZona } from './geometriaCuerpo';

// Detalle ampliado de UNA zona: el mismo dibujo recortado alrededor de la
// zona, en cada vista donde se ve (anterior y/o posterior).
const DetalleZona = ({ zona, lado }) => {
  const info = zonaPorId(zona);
  const vistas = [
    { vista: 'anterior', titulo: 'Anterior' },
    { vista: 'posterior', titulo: 'Posterior' },
  ].map((v) => ({ ...v, caja: cajaZona(v.vista, zona, lado) })).filter((v) => v.caja);
  return (
    <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3" aria-label={`Detalle: ${info?.nombre}`}>
      <h4 className="text-[12px] font-semibold text-gray-800 dark:text-gray-100">
        {info?.nombre}
        {info?.lateral && <span className="ml-1.5 font-normal text-gray-500 dark:text-gray-400">· Lado: {nombreLado(lado)}</span>}
      </h4>
      <div className="mt-2 flex flex-wrap gap-4 justify-center">
        {vistas.map((v) => (
          <figure key={v.vista} className="flex flex-col items-center gap-1">
            <CuerpoSVG vista={v.vista} zonas={[zona]} lado={lado} caja={v.caja} titulo={`${info?.nombre}, vista ${v.titulo.toLowerCase()}`}
              className="h-[170px] w-[170px] rounded-md bg-slate-50 dark:bg-gray-900/60" />
            <figcaption className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{v.titulo}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
};

export default DetalleZona;
