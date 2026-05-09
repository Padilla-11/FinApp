let secuencia = 0;

export function getProximoDiaPrueba() {
  secuencia++;
  const fecha = new Date(2026, 4, 9 + secuencia);
  return fecha.toISOString().split('T')[0]; // "2026-05-10"
}

export function resetSecuencia() {
  secuencia = 0;
}

export function getSecuenciaActual() {
  return secuencia;
}