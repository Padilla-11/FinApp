import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ChartBarIcon, CurrencyDollarIcon, MagnifyingGlassIcon,
  CheckCircleIcon, XCircleIcon, EnvelopeIcon, ChatBubbleLeftIcon,
  BoltIcon, BanknotesIcon, DocumentTextIcon, ArrowRightIcon,
  ClockIcon, CalendarDaysIcon, ArrowTrendingUpIcon, ShieldCheckIcon,
  SparklesIcon, LightBulbIcon, BookOpenIcon,
} from '@heroicons/react/20/solid';
import './landing.css';
import ParticleCanvas from './ParticleCanvas';

gsap.registerPlugin(ScrollTrigger);

/* ── Intersection Observer fallback ── */
function useAnimateOnScroll() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('visible'); },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function AnimateSection({ children, className = '' }) {
  const ref = useAnimateOnScroll();
  return <div ref={ref} className={`lp-animate ${className}`}>{children}</div>;
}

/* ── Scroll Progress ── */
function ScrollProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    function tick() {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setPct(h > 0 ? Math.min((window.scrollY / h) * 100, 100) : 0);
    }
    window.addEventListener('scroll', tick, { passive: true });
    tick();
    return () => window.removeEventListener('scroll', tick);
  }, []);
  return <div className="lp-scroll-progress" style={{ width: `${pct}%` }} />;
}

/* ── Header ── */
function Header() {
  return (
    <header className="lp-header">
      <Link to="/" className="lp-header-logo">
        <div className="lp-header-logo-icon">
          <svg width="18" height="18" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth="2.5">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </div>
        FinOp
      </Link>
      <div className="lp-header-actions">
        <Link to="/login" className="lp-btn lp-btn-ghost">Iniciar sesión</Link>
        <Link to="/registro" className="lp-btn lp-btn-primary">Registrarme</Link>
      </div>
    </header>
  );
}

/* ── Hero ── */
function Hero() {
  const containerRef = useRef(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from('.lp-hero-trust > *', {
        y: 20, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out', delay: 0.2
      });
      gsap.from('.lp-hero h1', {
        y: 30, opacity: 0, duration: 0.8, ease: 'power2.out', delay: 0.4
      });
      gsap.from('.lp-hero > .lp-inner > p', {
        y: 20, opacity: 0, duration: 0.6, ease: 'power2.out', delay: 0.6
      });
      gsap.from('.lp-hero-actions > *', {
        y: 20, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out', delay: 0.8
      });
    }, containerRef);
    return () => ctx.revert();
  }, { scope: containerRef });

  return (
    <section className="lp-hero" id="main" ref={containerRef}>
      <ParticleCanvas />
      <div className="lp-inner">
        <div className="lp-hero-trust">
          <span><CheckCircleIcon style={{ width: 14, height: 14, color: 'var(--lp-accent)', verticalAlign: 'middle' }} /> 100% gratis</span>
          <span><ShieldCheckIcon style={{ width: 14, height: 14, color: 'var(--lp-accent)', verticalAlign: 'middle' }} /> Sin tarjeta</span>
          <span><ArrowTrendingUpIcon style={{ width: 14, height: 14, color: 'var(--lp-accent)', verticalAlign: 'middle' }} /> Para todo tipo de negocio</span>
        </div>
        <h1>
          Controla tus finanzas en <span className="lp-accent-word">solo 5 minutos</span> al día
        </h1>
        <p>
          FinOp es el sistema de gestión financiera diseñado para microempresas. Conoce tus utilidades y las metricas de tu negocio solo con un registro al día.
        </p>
        <div className="lp-hero-actions">
          <Link to="/login" className="lp-btn lp-btn-ghost lp-btn-lg">Iniciar sesión</Link>
          <Link to="/registro" className="lp-btn lp-btn-accent lp-btn-lg">
            Registrarme gratis <ArrowRightIcon style={{ width: 16, height: 16 }} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Value Prop ── */
function ValueProp() {
  const sectionRef = useRef(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from('.lp-valueprop .lp-section-label', {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
        y: 20, opacity: 0, duration: 0.5, ease: 'power2.out'
      });
      gsap.from('.lp-valueprop .lp-section-title', {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
        y: 20, opacity: 0, duration: 0.6, delay: 0.1, ease: 'power2.out'
      });
      gsap.from('.lp-valueprop .lp-section-subtitle', {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
        y: 20, opacity: 0, duration: 0.6, delay: 0.2, ease: 'power2.out'
      });
      gsap.from('.lp-highlight-box', {
        scrollTrigger: { trigger: '.lp-highlight-box', start: 'top 85%' },
        y: 30, opacity: 0, duration: 0.7, ease: 'power2.out'
      });
    }, sectionRef);
    return () => ctx.revert();
  }, { scope: sectionRef });

  return (
    <section className="lp-valueprop navy lp-noise" ref={sectionRef}>
      <div className="lp-inner">
        <div className="lp-section-label">Propuesta de valor</div>
        <h2 className="lp-section-title">Diseñado para la realidad de tu negocio</h2>
        <p className="lp-section-subtitle">
          FinOp sabe lo difícil que es llevar un seguimiento de cada venta mientras se está operando, por eso está adaptado para analizar tus finanzas solo con la informacion disponible al final del día.
        </p>

        <div className="lp-highlight-box">
          <h3>No interrumpas tu día. Cierra al final.</h3>
          <p>
            Otros sistemas te obligan a registrar cada transacción en tiempo real. FinOp trabaja <strong>al final de tu jornada</strong>: abres en la mañana, operas normalmente todo el día sin tocar el sistema, y cierras en 5 minutos.
          </p>
          <div className="lp-compare">
            <div className="lp-compare-col bad">
              <h4><XCircleIcon style={{ width: 16, height: 16 }} /> Otros sistemas</h4>
              <p>Debes registrar cada venta durante el día. Te quitan tiempo y atención de tus clientes.</p>
            </div>
            <div className="lp-compare-col good">
              <h4><CheckCircleIcon style={{ width: 16, height: 16 }} /> FinOp</h4>
              <p>Operas normalmente. Cierras en minutos al final del día y obtienes toda la información.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Features (Bento Grid) ── */
function Features() {
  const items = [
    {
      Icon: DocumentTextIcon, bg: 'var(--lp-accent-lt)', fg: 'var(--lp-accent-dark)',
      title: 'Cierre diario guiado',
      desc: 'Proceso de 5 pasos. De 30 minutos a 5 minutos. El sistema calcula todo por ti.',
      col: 2, row: 2,
    },
    {
      Icon: CurrencyDollarIcon, bg: 'var(--lp-amber-lt)', fg: 'var(--lp-amber)',
      title: 'Rentabilidad automática',
      desc: 'Ingresos, costos, gastos y utilidad neta. Conoce tu margen real cada día.',
      col: 1, row: 1,
    },
    {
      Icon: BoltIcon, bg: 'var(--lp-primary-lt)', fg: 'var(--lp-primary)',
      title: 'Indicadores inteligentes',
      desc: 'Punto de equilibrio y estado del día. Datos claros para decisiones informadas.',
      col: 1, row: 1,
    },
    {
      Icon: MagnifyingGlassIcon, bg: 'var(--lp-red-lt)', fg: 'var(--lp-red)',
      title: 'Control de caja',
      desc: 'Detecta discrepancias automáticamente. Tres niveles de alerta según la gravedad.',
      col: 2, row: 1,
    },
  ];

  const gridRef = useRef(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from('.lp-features .lp-section-label, .lp-features .lp-section-title, .lp-features .lp-section-subtitle', {
        scrollTrigger: { trigger: gridRef.current, start: 'top 85%' },
        y: 20, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out'
      });
      gsap.from('.lp-feature-card', {
        scrollTrigger: { trigger: gridRef.current, start: 'top 80%' },
        y: 40, opacity: 0, duration: 0.6, stagger: 0.12, ease: 'power2.out'
      });
    }, gridRef);
    return () => ctx.revert();
  }, { scope: gridRef });

  return (
    <section className="lp-section lp-features" id="features">
      <div className="lp-inner">
        <div className="lp-section-label">Funcionalidades</div>
        <h2 className="lp-section-title">Cuatro pilares. Cero complicaciones.</h2>
        <p className="lp-section-subtitle">
          Todo lo que necesitas para controlar tus finanzas sin experiencia contable.
        </p>
        <div className="lp-features-grid" ref={gridRef}>
          {items.map((f, i) => (
            <div
              className={`lp-feature-card${f.col === 2 ? ' col-2' : ''}${f.row === 2 ? ' row-2' : ''}`}
              key={i}
            >
              <div className="lp-feature-icon" style={{ background: f.bg, color: f.fg }}>
                <f.Icon style={{ width: 24, height: 24 }} />
              </div>
              <h4>{f.title}</h4>
              <p>{f.desc}</p>
              {i === 0 && (
                <div className="lp-feature-steps">
                  <div className="lp-feature-step"><span className="lp-feature-step-num">1</span> Ingresa tus ventas del día</div>
                  <div className="lp-feature-step"><span className="lp-feature-step-num">2</span> Registra gastos y retiros</div>
                  <div className="lp-feature-step"><span className="lp-feature-step-num">3</span> Valida el dinero en caja</div>
                  <div className="lp-feature-step"><span className="lp-feature-step-num">4</span> Obtén tu rentabilidad al instante</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── How It Works (Timeline) ── */
function HowItWorks() {
  const steps = [
    { num: 1, title: 'Abre tu jornada', desc: 'Define la caja inicial y comienza a operar.', meta: '8:00 AM', Icon: ClockIcon },
    { num: 2, title: 'Opera normalmente', desc: 'Atiende clientes sin necesidad de tocar el sistema.', meta: 'Todo el día', Icon: BanknotesIcon },
    { num: 3, title: 'Cierra en 5 min', desc: 'Registra ventas y dinero en caja al finalizar.', meta: 'Cierre', Icon: DocumentTextIcon },
    { num: 4, title: 'Analiza', desc: 'Indicadores, tendencias y decisiones informadas.', meta: 'Dashboard', Icon: ChartBarIcon },
  ];

  const sectionRef = useRef(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from('.lp-steps .lp-step', {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
        y: 30, opacity: 0, duration: 0.6, stagger: 0.15, ease: 'power2.out'
      });
    }, sectionRef);
    return () => ctx.revert();
  }, { scope: sectionRef });

  return (
    <section className="lp-section navy lp-noise" id="how" ref={sectionRef}>
      <div className="lp-inner">
        <div className="lp-section-label">Cómo funciona</div>
        <h2 className="lp-section-title">De la apertura al análisis en cuatro pasos</h2>
        <p className="lp-section-subtitle">
          Un flujo de trabajo que se adapta a la rutina real de tu negocio.
        </p>
        <div className="lp-steps">
          {steps.map((s, i) => (
            <div className="lp-step" key={i}>
              <div className="lp-step-num">{s.num}</div>
              <div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
                <div className="lp-step-meta">{s.meta}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Benefits ── */
function Benefits() {
  const items = [
    { title: 'Más rápido', desc: 'Reduce el tiempo de cierre diario eliminando cálculos manuales y cuadernos.' },
    { title: 'Sin errores humanos', desc: 'El sistema calcula utilidades, costos y márgenes automáticamente.' },
    { title: 'Detecta problemas de caja', desc: 'Tres niveles de alerta según la diferencia entre caja esperada y real.' },
    { title: 'Decisiones con datos reales', desc: 'Conoce tu punto de equilibrio. Sabrás cuánto necesitas vender para ser rentable.' },
  ];

  const gridRef = useRef(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from('.lp-benefit', {
        scrollTrigger: { trigger: gridRef.current, start: 'top 85%' },
        y: 30, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out'
      });
    }, gridRef);
    return () => ctx.revert();
  }, { scope: gridRef });

  return (
    <section className="lp-section lp-benefits">
      <div className="lp-inner">
        <div className="lp-section-label">Beneficios</div>
        <h2 className="lp-section-title">Resultados tangibles desde el primer día</h2>
        <p className="lp-section-subtitle">
          Pequeños cambios en la gestión financiera que producen grandes diferencias.
        </p>
        <div className="lp-benefits-grid" ref={gridRef}>
          {items.map((b, i) => (
            <div className="lp-benefit" key={i}>
              <div className="lp-benefit-icon">
                <CheckCircleIcon style={{ width: 16, height: 16 }} />
              </div>
              <div>
                <h4>{b.title}</h4>
                <p>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Screenshots ── */
function Screenshots() {
  const [selectedImage, setSelectedImage] = useState(null);
  const screens = [
    { src: '/screenshots/dashboard.png', label: 'Dashboard — Vista general de tu negocio' },
    { src: '/screenshots/cierres.png', label: 'Cierre de jornada — Proceso guiado de 5 pasos' },
    { src: '/screenshots/configuracion.png', label: 'Configuración — Productos, costos y más' },
  ];

  const gridRef = useRef(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from('.lp-screen-card', {
        scrollTrigger: { trigger: gridRef.current, start: 'top 85%' },
        y: 40, opacity: 0, scale: 0.95, duration: 0.7, stagger: 0.15, ease: 'power2.out'
      });
    }, gridRef);
    return () => ctx.revert();
  }, { scope: gridRef });

  return (
    <section className="lp-section navy lp-noise lp-screenshots" aria-label="Pantallas de la aplicación">
      <div className="lp-inner">
        <div className="lp-section-label">Pantallas</div>
        <h2 className="lp-section-title">Una interfaz limpia y moderna</h2>
        <p className="lp-section-subtitle">
          Diseñada para ser intuitiva incluso si nunca has usado un sistema financiero.
        </p>
        <div className="lp-screens-grid" ref={gridRef}>
          {screens.map((s, i) => (
            <div className="lp-screen-card" key={i} onClick={() => setSelectedImage(s)} style={{ cursor: 'pointer' }}>
              <div className="lp-screen-mockup">
                <div className="lp-screen-mockup-bar">
                  <span className="lp-screen-dot" style={{ background: '#E05252' }} />
                  <span className="lp-screen-dot" style={{ background: '#E8992A' }} />
                  <span className="lp-screen-dot" style={{ background: '#4CAF82' }} />
                </div>
                <img src={s.src} alt={s.label} className="lp-screen-img" loading="lazy" decoding="async" />
              </div>
              <div className="lp-screen-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {selectedImage && (
        <div className="lp-img-modal" onClick={() => setSelectedImage(null)}>
          <div className="lp-img-modal-content" onClick={e => e.stopPropagation()}>
            <button className="lp-img-modal-close" onClick={() => setSelectedImage(null)} aria-label="Cerrar">✕</button>
            <img src={selectedImage.src} alt={selectedImage.label} />
            <p className="lp-img-modal-label">{selectedImage.label}</p>
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Deep Analysis ── */
function DeepAnalysis() {
  const sectionRef = useRef(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from('.lp-diag-card', {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
        y: 30, opacity: 0, duration: 0.7, stagger: 0.15, ease: 'power2.out'
      });
    }, sectionRef);
    return () => ctx.revert();
  }, { scope: sectionRef });

  const positivos = [
    { titulo: 'Márgenes de ganancia mejoran', detalle: 'Tu margen neto subió 4 % respecto al mes anterior gracias al control de gastos variables.' },
    { titulo: 'Gastos de operación controlados', detalle: 'Los gastos de transporte y servicios se mantuvieron dentro del presupuesto del 15 % de los ingresos.' },
  ];

  const mejorar = [
    {
      titulo: 'Costos de inventario elevados',
      detalle: 'El costo de los insumos representa el 42 % de tus ventas, superando el ideal del 35 %.',
      consejo: 'Negocia precios por volumen con tus proveedores actuales. Compra en conjunto con otros negocios para obtener descuentos.',
      contexto: 'El costo de ventas ideal en microempresas de alimentos está entre 30 % y 35 % de los ingresos.',
    },
    {
      titulo: 'Ventas concentradas en pocos horarios',
      detalle: 'El 68 % de tus ventas se generan entre 12:00 PM y 2:00 PM. Dependes demasiado del horario de almuerzo.',
      consejo: 'Implementa promociones en horas valle (8-11 AM) y prueba desayunos o productos de media tarde para diversificar ingresos.',
      contexto: 'Distribuir las ventas en varios horarios reduce el riesgo y aumenta el potencial de ingreso diario.',
    },
  ];

  return (
    <section className="lp-section" ref={sectionRef}>
      <div className="lp-inner">
        <div className="lp-section-label">Análisis profundo</div>
        <h2 className="lp-section-title">Tu negocio analizado por inteligencia artificial</h2>
        <p className="lp-section-subtitle">
          FinOp no solo registra tus datos. Los analiza, encuentra patrones y te da recomendaciones personalizadas.
        </p>

        <div className="lp-diag-grid">
          <div className="lp-diag-card">
            <div className="lp-diag-card-header">
              <span className="lp-diag-card-title">Diagnóstico del negocio</span>
              <span className="lp-diag-card-sub">30 días analizados</span>
            </div>
            <div className="lp-diag-card-body">

            <div className="lp-diag-section">
              <div className="lp-diag-badge success">Rentable</div>
              <p className="lp-diag-estado">
                Tus ingresos superaron tus gastos en el período. La tendencia es positiva y tu margen neto promedio fue del <strong>18 %</strong>.
              </p>
            </div>

            <div className="lp-diag-section">
              <h4 className="lp-diag-section-title"><CheckCircleIcon style={{ width: 14, height: 14, color: 'var(--lp-accent)', verticalAlign: 'text-bottom', marginRight: 4 }} /> Puntos positivos</h4>
              <div className="lp-diag-list">
                {positivos.map((p, i) => (
                  <div className="lp-diag-pp-item" key={i}>
                    <strong>{p.titulo}</strong>
                    <p>{p.detalle}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lp-diag-section">
              <h4 className="lp-diag-section-title"><ArrowTrendingUpIcon style={{ width: 14, height: 14, color: 'var(--lp-amber)', verticalAlign: 'text-bottom', marginRight: 4 }} /> Puntos a mejorar</h4>
              <div className="lp-diag-list-mejorar">
                {mejorar.map((p, i) => (
                  <div className="lp-diag-pm-item" key={i}>
                    <strong>{i + 1}. {p.titulo}</strong>
                    <p className="lp-diag-pm-detalle">{p.detalle}</p>
                    <div className="lp-diag-pm-consejo">
                      <LightBulbIcon style={{ width: 14, height: 14, verticalAlign: 'text-bottom', marginRight: 4 }} />
                      <strong>Consejo:</strong> {p.consejo}
                    </div>
                    <div className="lp-diag-pm-contexto">
                      <BookOpenIcon style={{ width: 14, height: 14, verticalAlign: 'text-bottom', marginRight: 4 }} />
                      <strong>Concepto:</strong> {p.contexto}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lp-diag-section">
              <h4 className="lp-diag-section-title"><LightBulbIcon style={{ width: 14, height: 14, color: '#E8992A', verticalAlign: 'text-bottom', marginRight: 4 }} /> Consejo general</h4>
              <div className="lp-diag-consejo">
                Considera reducir tus costos fijos renegociando el arriendo y optimizando los pedidos de insumos. Trabaja en aumentar tu ticket promedio agregando productos complementarios (bebidas, postres). Si mantienes la tendencia actual, podrías aumentar tu margen neto al 22 % en 60 días.
              </div>
            </div>
            </div>
          </div>

          <div className="lp-diag-card">
            <div className="lp-diag-card-header">
              <span className="lp-diag-card-title">Pregúntale a FinOp IA</span>
              <SparklesIcon style={{ width: 18, height: 18, color: 'var(--lp-accent)' }} />
            </div>

            <div className="lp-diag-chat">
              <div className="lp-chat-bubble ai">
                <div className="lp-chat-sender">FinOp IA</div>
                ¡Hola! He analizado tus datos de los últimos 30 días. ¿Sobre qué tema quieres profundizar?
              </div>
              <div className="lp-chat-bubble user">
                ¿Cuánto debo vender mañana para cubrir mis costos fijos?
              </div>
              <div className="lp-chat-bubble ai">
                <div className="lp-chat-sender">FinOp IA</div>
                De acuerdo a tus últimos 7 cierres, tus costos fijos diarios promedio son <strong>$185.000</strong> (arriendo, servicios, transporte). Con tu margen actual del 18 %, necesitas vender al menos <strong>$1.028.000</strong> mañana para cubrirlos. Tu punto de equilibrio diario está en <strong>$1.028.000</strong>.
              </div>
              <div className="lp-chat-typing">
                <span className="lp-chat-dot" />
                <span className="lp-chat-dot" />
                <span className="lp-chat-dot" />
              </div>
            </div>

            <div className="lp-diag-chat-footer">
              <div className="lp-diag-chat-sugerencias">
                <button className="lp-diag-chip" disabled>¿Qué días me conviene más operar?</button>
                <button className="lp-diag-chip" disabled>¿Cómo mejoro mi margen?</button>
                <button className="lp-diag-chip" disabled>¿Cuál es mi producto más rentable?</button>
              </div>
              <div className="lp-diag-chat-input">
                <input type="text" placeholder="Escribe tu pregunta..." disabled />
                <button disabled>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── FAQ ── */
function FAQ() {
  const [open, setOpen] = useState(null);
  const questions = [
    { q: '¿Necesito saber de contabilidad para usar FinOp?', a: 'No. FinOp está diseñado para personas sin formación contable. Te guía paso a paso y hace los cálculos por ti.' },
    { q: '¿Tengo que registrar cada venta durante el día?', a: 'No. Esa es la gran diferencia. Puedes operar tu negocio normalmente y solo usar FinOp al final de la jornada para cerrar.' },
    { q: '¿Funciona para cualquier tipo de negocio?', a: 'Está optimizado para microempresas de comidas, retail y servicios. Si vendes productos y manejas efectivo, FinOp es para ti.' },
    { q: '¿Cuánto tiempo toma cerrar una jornada?', a: 'De 3 a 5 minutos si haces conteo de productos. Menos de 1 minuto si omites el conteo y usas estimación desde caja.' },
    { q: '¿Es gratuito?', a: 'Actualmente FinOp es un proyecto académico en desarrollo y su uso es completamente gratuito.' },
  ];

  const sectionRef = useRef(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from('.lp-faq-item', {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 85%' },
        y: 20, opacity: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out'
      });
    }, sectionRef);
    return () => ctx.revert();
  }, { scope: sectionRef });

  return (
    <section className="lp-section navy lp-noise lp-faq" id="faq" ref={sectionRef}>
      <div className="lp-inner">
        <div className="lp-section-label">Preguntas frecuentes</div>
        <h2 className="lp-section-title">Resuelve tus dudas</h2>
        <p className="lp-section-subtitle">
          Lo más común que preguntan los emprendedores antes de empezar.
        </p>
        <div className="lp-faq-items" role="list">
          {questions.map((item, i) => (
            <div
              key={i}
              role="listitem"
              className={`lp-faq-item${open === i ? ' open' : ''}`}
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
            >
              <h4>
                {item.q}
                <span className="lp-faq-arrow" aria-hidden="true">▾</span>
              </h4>
              <div className="lp-faq-content">
                <div>
                  <p aria-hidden={open !== i}>{item.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Contact ── */
function Contact() {
  return (
    <section className="lp-section lp-contact" id="contact">
      <div className="lp-inner">
        <div className="lp-section-label">Contacto</div>
        <h2 className="lp-section-title">¿Tienes preguntas? Hablemos</h2>
        <p className="lp-section-subtitle">
          Escríbenos y te respondemos lo antes posible. FinOp es un proyecto académico de la Universidad Popular del Cesar.
        </p>
        <div className="lp-contact-grid">
          <a href="mailto:finop@gmail.com" className="lp-contact-card">
            <div className="lp-contact-icon"><EnvelopeIcon style={{ width: 18, height: 18 }} /></div>
            <div>
              <h4>Correo electrónico</h4>
              <span>finop@gmail.com</span>
            </div>
          </a>
          <a href="https://wa.me/573014746626" target="_blank" rel="noopener noreferrer" className="lp-contact-card">
            <div className="lp-contact-icon" style={{ background: '#25D366' }}>
              <svg viewBox="0 0 24 24" fill="#fff" width="20" height="20" style={{ display: 'block' }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <h4>WhatsApp</h4>
              <span>+57 301 474 6626</span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── CTA Final ── */
function CTAFinal() {
  const sectionRef = useRef(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from('.lp-cta-final h2, .lp-cta-final p, .lp-cta-final .lp-hero-actions > *', {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
        y: 30, opacity: 0, duration: 0.6, stagger: 0.12, ease: 'power2.out'
      });
    }, sectionRef);
    return () => ctx.revert();
  }, { scope: sectionRef });

  return (
    <section className="lp-cta-final" ref={sectionRef}>
      <div className="lp-inner">
        <h2>Saber la verdad no cuesta nada. No saberla, sí.</h2>
        <p>
          Comienza hoy sin compromiso. Sin tarjeta. Sin interrumpir tu jornada.
        </p>
        <div className="lp-hero-actions">
          <Link to="/login" className="lp-btn lp-btn-ghost lp-btn-lg">Iniciar sesión</Link>
          <Link to="/registro" className="lp-btn lp-btn-accent lp-btn-lg">
            Registrarme gratis <ArrowRightIcon style={{ width: 16, height: 16 }} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ── */
function Footer() {
  return (
    <footer className="lp-footer" role="contentinfo">
      <p>&copy; {new Date().getFullYear()} FinOp &mdash; Proyecto académico &mdash; Universidad Popular del Cesar</p>
    </footer>
  );
}

/* ── Main Landing Page ── */
export default function LandingPage() {
  return (
    <div className="landing-page">
      <a href="#main" className="lp-skip">Saltar al contenido</a>
      <ScrollProgress />
      <Header />
      <main>
        <Hero />
        <ValueProp />
        <Features />
        <HowItWorks />
        <Benefits />
        <Screenshots />
        <DeepAnalysis />
        <FAQ />
        <Contact />
        <CTAFinal />
      </main>
      <Footer />
    </div>
  );
}
