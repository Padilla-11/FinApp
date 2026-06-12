const STORAGE_KEY = 'finapp_test_day_offset';

function getSecuencia() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? parseInt(raw, 10) : 0;
}

function setSecuencia(val) {
  localStorage.setItem(STORAGE_KEY, String(val));
}

export function getProximoDiaPrueba() {
  const secuencia = getSecuencia() + 1;
  setSecuencia(secuencia);

  const base = new Date();
  base.setHours(0, 0, 0, 0);

  const fecha = new Date(base);
  fecha.setDate(base.getDate() + secuencia - 1);

  return fecha.toISOString().split('T')[0];
}

export function resetSecuencia() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getSecuenciaActual() {
  return getSecuencia();
}