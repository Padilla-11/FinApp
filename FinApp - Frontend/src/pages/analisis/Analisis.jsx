import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { cierresApi } from '../../api/cierres';
import { iaApi } from '../../api/ia';
import { fmt, fmtPct } from '../../utils/format';

const SUGERENCIAS = [
  '¿Qué días me conviene más operar?',
  '¿Cómo mejoro mi margen?',
  '¿Cuánto debo vender por día?',
  '¿Cuál es mi producto más rentable?',
];

export default function Analisis() {
  const { negocio } = useApp();
  const nid = negocio?.Id || negocio?.id;

  const [periodo, setPeriodo]         = useState(30);
  const [historial, setHistorial]     = useState([]);
  const [mensajes, setMensajes]       = useState([]);
  const [input, setInput]             = useState('');
  const [cargando, setCargando]       = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const chatRef = useRef(null);

  useEffect(() => { if (nid) cargarDatos(); }, [nid, periodo]);
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }); }, [mensajes]);

  async function cargarDatos() {
    setLoadingData(true);
    try {
      const res = await cierresApi.historial(nid, 1, periodo === 7 ? 7 : periodo === 30 ? 30 : 90);
      setHistorial(res.data.Data?.Items || res.data.Data || []);
    } finally {
      setLoadingData(false);
    }
  }

  async function enviarMensaje(texto) {
    const msg = texto || input.trim();
    if (!msg) return;
    setInput('');
    setMensajes((p) => [...p, { rol: 'user', texto: msg }]);
    setCargando(true);

    const historialChat = mensajes.map((m) => ({
      rol: m.rol === 'user' ? 'user' : 'assistant',
      contenido: m.texto,
    }));

    try {
      const response = await iaApi.consultar(nid, {
        mensaje: msg,
        historial: historialChat,
        periodoDias: periodo,
      });

      const data = response.data;
      setMensajes((p) => [...p, { rol: 'ai', texto: data.Respuesta || data.respuesta || 'Sin respuesta.' }]);
    } catch {
      setMensajes((p) => [...p, { rol: 'ai', texto: 'Hubo un error al conectar con el asistente IA. Intenta de nuevo.' }]);
    } finally {
      setCargando(false);
    }
  }

// Métricas para el diagnóstico
  const lista = historial.slice(0, periodo);
  const totalIngresos = lista.reduce((s, c) => s + (c.IngresosOperativos || 0), 0);
  const totalUtilidad = lista.reduce((s, c) => s + (c.UtilidadNeta || 0), 0);
  const margenProm    = lista.length ? lista.reduce((s, c) => s + (c.MargenGanancia || 0), 0) / lista.length : 0;
  const diasRentables = lista.filter((c) => c.EstadoDia === 'rentable').length;

  return (
    <>
      <div className="fo-topbar">
        <div>
          <h1 className="fo-page-title">Análisis financiero con IA</h1>
          <p className="fo-page-sub">Diagnóstico conversacional · {negocio?.Nombre || negocio?.nombre}</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {[7, 30, 90].map((p) => (
            <button key={p} onClick={() => setPeriodo(p)}
              style={{ padding: '.375rem .75rem', borderRadius: 20, border: '1.5px solid', fontSize: '.8rem', fontWeight: 500, cursor: 'pointer', transition: 'all .18s',
                background: periodo === p ? 'var(--fo-primary)' : 'var(--fo-white)',
                borderColor: periodo === p ? 'var(--fo-primary)' : 'var(--fo-border)',
                color: periodo === p ? '#fff' : 'var(--fo-text-secondary)',
              }}>{p} días</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Diagnóstico estructurado */}
        <div className="fo-card">
          <div className="fo-card-header">
            <div>
              <div className="fo-card-title">Diagnóstico — últimos {periodo} días</div>
              <div className="fo-card-subtitle">{lista.length} jornadas analizadas</div>
            </div>
          </div>

          {loadingData ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--fo-text-muted)' }}>Cargando datos...</div>
          ) : lista.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--fo-text-muted)' }}>No hay datos para este período. Registra jornadas primero.</div>
          ) : (
            <>
              {/* Estado general */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--fo-text-muted)', marginBottom: '.625rem' }}>Estado general del negocio</div>
                <div className="fo-card" style={{ background: 'var(--fo-info-lt)', borderColor: 'var(--fo-surface-dark)', padding: '.875rem 1rem' }}>
                  <div style={{ fontSize: '.875rem', lineHeight: 1.7 }}>
                    En los últimos {periodo} días tu negocio operó <strong>{lista.length} jornadas</strong>, generando <strong>{fmt(totalIngresos)}</strong> con una utilidad de <strong>{fmt(totalUtilidad)}</strong>.
                    El <strong>{lista.length ? Math.round(diasRentables / lista.length * 100) : 0}%</strong> de las jornadas fueron rentables.
                    Tu margen promedio es <strong style={{ color: margenProm >= 20 ? 'var(--fo-accent-dark)' : 'var(--fo-warning)' }}>{fmtPct(margenProm)}</strong>
                    {margenProm < 20 && ' — por debajo del 20% recomendado para negocios de alimentos.'}.
                  </div>
                </div>
              </div>

              {/* KPIs rápidos */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '.75rem' }}>
                {[
                  { label: 'Ingresos totales', value: fmt(totalIngresos), color: 'var(--fo-primary)' },
                  { label: 'Utilidad neta',    value: fmt(totalUtilidad), color: totalUtilidad >= 0 ? 'var(--fo-accent-dark)' : 'var(--fo-danger)' },
                  { label: 'Margen promedio',  value: fmtPct(margenProm), color: margenProm >= 20 ? 'var(--fo-accent-dark)' : 'var(--fo-warning)' },
                  { label: 'Días rentables',   value: `${diasRentables}/${lista.length}`, color: 'var(--fo-primary)' },
                ].map((kpi) => (
                  <div key={kpi.label} style={{ background: 'var(--fo-surface)', borderRadius: 10, padding: '.875rem' }}>
                    <div style={{ fontSize: '.72rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--fo-text-muted)', marginBottom: '.25rem' }}>{kpi.label}</div>
                    <div style={{ fontFamily: 'var(--fo-font-mono)', fontSize: '1.1rem', fontWeight: 500, color: kpi.color }}>{kpi.value}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Chat */}
        <div className="fo-card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 12rem)' }}>
          <div className="fo-card-header">
            <div>
              <div className="fo-card-title">Pregúntale a FinOp IA</div>
              <div className="fo-card-subtitle">Haz preguntas sobre tu negocio</div>
            </div>
            <div style={{ width: 32, height: 32, background: 'var(--fo-info-lt)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9rem' }}>🤖</div>
          </div>

          {/* Mensajes */}
          <div ref={chatRef} className="chat-wrap" style={{ flex: 1, overflowY: 'auto', padding: '.25rem 0' }}>
            {mensajes.length === 0 && (
              <div className="chat-bubble ai">
                <div className="chat-sender">FinOp IA</div>
                ¡Hola! Soy tu asistente financiero. Tengo acceso a los datos de tu negocio de los últimos {periodo} días. ¿En qué te puedo ayudar?
              </div>
            )}
            {mensajes.map((m, i) => (
              <div key={i}>
                {m.rol === 'ai' && <div className="chat-sender" style={{ marginLeft: '.25rem' }}>FinOp IA</div>}
                <div className={`chat-bubble ${m.rol}`} style={{ whiteSpace: 'pre-wrap' }}>{m.texto}</div>
              </div>
            ))}
            {cargando && (
              <div className="chat-bubble ai">
                <div className="chat-sender">FinOp IA</div>
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ paddingTop: '.875rem', borderTop: '1px solid var(--fo-border-light)' }}>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.625rem' }}>
              {SUGERENCIAS.map((s) => (
                <button key={s} className="btn btn-ghost btn-sm" onClick={() => enviarMensaje(s)} style={{ fontSize: '.75rem' }}>{s}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <input className="fo-input" type="text" placeholder="Escribe tu pregunta..." value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !cargando && enviarMensaje()} />
              <button className="btn btn-primary" onClick={() => enviarMensaje()} disabled={cargando || !input.trim()}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
