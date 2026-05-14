// Formato moneda colombiana
export const fmt = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n ?? 0);

// Formato porcentaje
export const fmtPct = (n) => `${(n ?? 0).toFixed(1)}%`;

// Formato número compacto
export const fmtK = (n) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return fmt(n);
};

// Formato fecha legible
export const fmtFecha = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
};

export const fmtFechaCorta = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtHora = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};

// Días del mes operativos estimados (días/semana × 4.33)
export const diasMensuales = (diasSemana) => Math.round((diasSemana || 6) * 4.33);

// Equivalente diario de un costo
export const equivDiario = (valor, frecuencia, diasOperativos = 6) => {
  if (frecuencia === 'diaria') return valor;
  if (frecuencia === 'semanal') return valor / diasOperativos;
  const diasMes = Math.round(diasOperativos * 4.33);
  return valor / diasMes;
};

// Clase CSS según valor positivo/negativo
export const clsValor = (n) => (n >= 0 ? 'text-success' : 'text-danger');

// Estado badge color
export const estadoBadge = {
  rentable:  { cls: 'badge-success', label: 'Rentable' },
  perdida:   { cls: 'badge-danger',  label: 'Con pérdida' },
  equilibrio:{ cls: 'badge-warning', label: 'En equilibrio' },
  pendiente: { cls: 'badge-warning', label: 'Pendiente' },
  cobrado_parcial: { cls: 'badge-info', label: 'Parcial' },
  cobrado:   { cls: 'badge-success', label: 'Cobrado' },
  abierta:   { cls: 'badge-warning', label: 'Abierta' },
  cerrada:   { cls: 'badge-neutral', label: 'Cerrada' },
};
