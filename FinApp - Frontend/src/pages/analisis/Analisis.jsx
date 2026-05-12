import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { iaApi } from '../../api/ia';
import { SparklesIcon, LightBulbIcon, BookOpenIcon } from '@heroicons/react/20/solid';

const SUGERENCIAS = [
  '¿Qué días me conviene más operar?',
  '¿Cómo mejoro mi margen?',
  '¿Cuánto debo vender por día?',
  '¿Cuál es mi producto más rentable?',
];

export default function Analisis() {
  const {
    negocio,
    iaMensajes, setIaMensajes,
    iaDiagnostico, setIaDiagnostico,
    iaPeriodo, setIaPeriodo,
  } = useApp();
  const nid = negocio?.Id || negocio?.id;

  const [mensajes, setMensajesLocal]   = useState(iaMensajes || []);
  const [diagnostico, setDiagnosticoLocal] = useState(iaDiagnostico);
  const [periodo, setPeriodoLocal]     = useState(iaPeriodo || 30);
  const [input, setInput]              = useState('');
  const [cargando, setCargando]        = useState(false);
  const [generandoDiag, setGenerandoDiag] = useState(false);
  const chatRef = useRef(null);

  function setMensajes(nuevos) {
    setMensajesLocal(nuevos);
    setIaMensajes(nuevos);
  }

  function setDiagnostico(d) {
    setDiagnosticoLocal(d);
    setIaDiagnostico(d);
  }

  function setPeriodo(p) {
    setPeriodoLocal(p);
    setIaPeriodo(p);
  }

  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }); }, [mensajes]);

  function field(obj, ...keys) {
    for (const k of keys) {
      if (obj?.[k]) return obj[k];
    }
    return '';
  }

  async function generarDiagnostico() {
    if (!nid) return;
    setGenerandoDiag(true);
    try {
      const res = await iaApi.diagnostico(nid, { periodoDias: periodo });
      const data = res.data;
      const diag = {
        datosInsuficientes: data.DatosInsuficientes || data.datosInsuficientes || false,
        estadoGeneral: data.EstadoGeneral || data.estadoGeneral || '',
        puntosPositivos: data.PuntosPositivos || data.puntosPositivos || [],
        puntosMejorar: data.PuntosMejorar || data.puntosMejorar || [],
        consejoGeneral: data.ConsejoGeneral || data.consejoGeneral || '',
        mensajeInicial: data.MensajeInicial || data.mensajeInicial || '',
      };
      setDiagnostico(diag);

      const msgInicial = diag.mensajeInicial || 'He analizado los datos de tu negocio. ¿Sobre qué tema quieres profundizar?';
      setMensajes([{ rol: 'ai', texto: msgInicial }]);
    } catch {
      setDiagnostico({
        datosInsuficientes: false,
        estadoGeneral: 'No se pudo generar el diagnóstico. Verifica tu conexión e intenta de nuevo.',
        puntosPositivos: [], puntosMejorar: [], consejoGeneral: '',
      });
    } finally {
      setGenerandoDiag(false);
    }
  }

  async function enviarMensaje(texto) {
    const msg = texto || input.trim();
    if (!msg) return;
    setInput('');
    const nuevosMensajes = [...mensajes, { rol: 'user', texto: msg }];
    setMensajes(nuevosMensajes);
    setCargando(true);

    const historialChat = nuevosMensajes.map((m) => ({
      rol: m.rol === 'user' ? 'user' : 'assistant',
      contenido: m.texto,
    }));

    try {
      const response = await iaApi.consultar(nid, {
        mensaje: msg,
        historial: historialChat.slice(-20),
        periodoDias: periodo,
      });
      const data = response.data;
      const respuesta = data.Respuesta || data.respuesta || 'No pude generar una respuesta. Intenta de nuevo.';
      setMensajes([...nuevosMensajes, { rol: 'ai', texto: respuesta }]);
    } catch {
      setMensajes([...nuevosMensajes, { rol: 'ai', texto: 'Hubo un error al conectar con el asistente IA. Intenta de nuevo.' }]);
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <div className="fo-topbar">
        <div>
          <h1 className="fo-page-title">Análisis financiero con IA</h1>
          <p className="fo-page-sub">Diagnóstico conversacional · {negocio?.Nombre || negocio?.nombre}</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={generarDiagnostico} disabled={generandoDiag}>
            {generandoDiag ? 'Analizando...' : 'Generar diagnóstico'}
          </button>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', height: 'calc(100vh - 9rem)' }}>
        {/* Zona izquierda — Diagnóstico */}
        <div className="fo-card" style={{ overflowY: 'auto' }}>
          <div className="fo-card-header">
            <div className="fo-card-title">Diagnóstico del negocio</div>
            <div className="fo-card-subtitle">{periodo} días analizados</div>
          </div>

          {generandoDiag ? (
            <div className="diagnostico-loading">
              <div className="diagnostico-loading-spinner" />
              <p style={{ fontWeight: 500 }}>Analizando los datos financieros...</p>
              <p className="fo-card-subtitle">Interpretando estadísticas y generando recomendaciones</p>
            </div>
          ) : !diagnostico ? (
            <div className="diagnostico-empty">
              <p>Haz clic en <strong>"Generar diagnóstico"</strong> para obtener un análisis completo de tu negocio basado en datos reales.</p>
            </div>
          ) : diagnostico.datosInsuficientes ? (
            <div className="diagnostico-section">
              <p className="diagnostico-estado-general">{diagnostico.estadoGeneral}</p>
              {diagnostico.consejoGeneral && (
                <div className="diagnostico-consejo-general" style={{ marginTop: '1rem' }}>
                  {diagnostico.consejoGeneral}
                </div>
              )}
            </div>
          ) : (
            <>
              {diagnostico.estadoGeneral && (
                <div className="diagnostico-section">
                  <h3 className="diagnostico-section-title">Estado general</h3>
                  <p className="diagnostico-estado-general">{diagnostico.estadoGeneral}</p>
                </div>
              )}

              {diagnostico.puntosPositivos?.length > 0 && (
                <div className="diagnostico-section">
                  <h3 className="diagnostico-section-title">Puntos positivos</h3>
                  <div className="diagnostico-lista-positivos">
                    {diagnostico.puntosPositivos.map((p, i) => (
                      <div key={i} className="pp-item">
                        <strong>{field(p, 'titulo', 'Titulo')}</strong>
                        <p>{field(p, 'detalle', 'Detalle')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diagnostico.puntosMejorar?.length > 0 && (
                <div className="diagnostico-section">
                  <h3 className="diagnostico-section-title">Puntos a mejorar</h3>
                  <div className="diagnostico-lista-mejorar">
                    {diagnostico.puntosMejorar.map((p, i) => (
                      <div key={i} className="pm-item">
                        <strong>{i + 1}. {field(p, 'titulo', 'Titulo')}</strong>
                        <p className="pm-detalle">{field(p, 'detalle', 'Detalle')}</p>
                        {field(p, 'consejoEspecifico', 'ConsejoEspecifico') && (
                          <div className="pm-consejo">
                            <LightBulbIcon style={{ width: 16, height: 16, verticalAlign: 'text-bottom' }} /> <strong>Consejo:</strong> {field(p, 'consejoEspecifico', 'ConsejoEspecifico')}
                          </div>
                        )}
                        {field(p, 'contextoConceptual', 'ContextoConceptual') && (
                          <div className="pm-contexto">
                            <BookOpenIcon style={{ width: 16, height: 16, verticalAlign: 'text-bottom' }} /> <strong>Concepto:</strong> {field(p, 'contextoConceptual', 'ContextoConceptual')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diagnostico.consejoGeneral && (
                <div className="diagnostico-section">
                  <h3 className="diagnostico-section-title">Consejo general</h3>
                  <div className="diagnostico-consejo-general">{diagnostico.consejoGeneral}</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Zona derecha — Chat */}
        <div className="fo-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="fo-card-header">
            <div>Pregúntale a FinOp IA</div>
            <div style={{ width: 32, height: 32, background: 'var(--fo-info-lt)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SparklesIcon style={{ width: 16, height: 16 }} /></div>
          </div>

          <div ref={chatRef} className="chat-wrap" style={{ flex: 1, overflowY: 'auto', padding: '.25rem 0' }}>
            {mensajes.length === 0 ? (
              <>
                <div className="chat-bubble ai">
                  <div className="chat-sender">FinOp IA</div>
                  ¡Hola! Soy tu asistente financiero. Presiona <strong>"Generar diagnóstico"</strong> para analizar los datos de tu negocio.
                </div>
              </>
            ) : (
              mensajes.map((m, i) => (
                <div key={i}>
                  {m.rol === 'ai' && <div className="chat-sender" style={{ marginLeft: '.25rem' }}>FinOp IA</div>}
                  <div className={`chat-bubble ${m.rol}`} style={{ whiteSpace: 'pre-wrap' }}>{m.texto}</div>
                </div>
              ))
            )}
            {cargando && (
              <div className="chat-bubble ai">
                <div className="chat-sender">FinOp IA</div>
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
            )}
          </div>

          <div style={{ paddingTop: '.875rem', borderTop: '1px solid var(--fo-border-light)' }}>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.625rem' }}>
              {SUGERENCIAS.map((s) => (
                <button key={s} className="btn btn-ghost btn-sm" onClick={() => enviarMensaje(s)} disabled={cargando || mensajes.length === 0} style={{ fontSize: '.75rem' }}>{s}</button>
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
