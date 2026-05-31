import { useState, useEffect, useRef } from 'react';
import { analisisApi } from '../api/analisis';

export function useAnalisis(negocioId, diasInicial = 30) {
  const [dias, setDias] = useState(diasInicial);
  const [datosRaw, setDatosRaw] = useState(null);
  const [datosCompletos, setDatosCompletos] = useState(null);
  const [cargandoRaw, setCargandoRaw] = useState(true);
  const [cargandoIA, setCargandoIA] = useState(false);
  const [regenerando, setRegenerando] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!negocioId) return;

    const controller = new AbortController();
    abortRef.current = controller;

    let cancelled = false;

    setError(null);
    setCargandoRaw(true);
    setCargandoIA(true);
    setDatosRaw(null);
    setDatosCompletos(null);

    async function fetchData() {
      try {
        const raw = await analisisApi.getRaw(negocioId, dias);
        if (!cancelled) {
          setDatosRaw(raw.data?.Data || raw.data);
          setCargandoRaw(false);
        }

        const completos = await analisisApi.getCompleto(negocioId, dias);
        if (!cancelled) {
          setDatosCompletos(completos.data?.Data || completos.data);
        }
      } catch (err) {
        if (!cancelled && err.name !== 'AbortError') {
          setError(err.response?.data?.mensaje || err.message || 'Error al cargar el análisis.');
        }
      } finally {
        if (!cancelled) {
          setCargandoRaw(false);
          setCargandoIA(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [negocioId, dias]);

  const regenerar = async () => {
    if (!negocioId) return;
    setRegenerando(true);
    setError(null);
    setCargandoIA(true);

    try {
      const res = await analisisApi.regenerar(negocioId, dias);
      setDatosCompletos(res.data?.Data || res.data);
    } catch (err) {
      setError(err.response?.data?.mensaje || err.message || 'Error al regenerar el análisis.');
    } finally {
      setCargandoIA(false);
      setRegenerando(false);
    }
  };

  const cambiarPeriodo = (nuevosDias) => {
    setDias(nuevosDias);
  };

  const datos = datosCompletos || datosRaw;

  return {
    datos,
    dias,
    cargandoRaw,
    cargandoIA,
    regenerando,
    error,
    cambiarPeriodo,
    regenerar,
  };
}
