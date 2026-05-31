import { useState, useEffect, useRef } from 'react';
import { analisisApi } from '../api/analisis';

export function useHistorial(negocioId, diasInicial = 30) {
  const [dias, setDias] = useState(diasInicial);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [regenerando, setRegenerando] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!negocioId) return;

    const controller = new AbortController();
    abortRef.current = controller;
    let cancelled = false;

    setLoading(true);
    setError(null);
    setData(null);

    analisisApi.getDetalle(negocioId, dias)
      .then((res) => {
        if (!cancelled) setData(res.data?.Data || res.data);
      })
      .catch((err) => {
        if (!cancelled && err.name !== 'AbortError')
          setError(err.response?.data?.mensaje || err.message || 'Error al cargar historial.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [negocioId, dias]);

  const cambiarPeriodo = (nuevosDias) => setDias(nuevosDias);

  return {
    loading,
    data,
    dias,
    error,
    jornadas: data?.Jornadas || [],
    productos: data?.Productos || [],
    resumen: data?.ResumenGeneral,
    meta: data?.Meta,
    grupos: data?.Grupos,
    cambiarPeriodo,
    setRegenerando,
    regenerando,
  };
}
