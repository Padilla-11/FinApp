import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './landing.css';

/* ── Intersection Observer hook ─────────────────── */
function useAnimateOnScroll() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('visible'); },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ── Reusable animated section wrapper ─────────── */
function AnimateSection({ children, className = '' }) {
  const ref = useAnimateOnScroll();
  return (
    <div ref={ref} className={`lp-animate ${className}`}>
      {children}
    </div>
  );
}

/* ── Header ──────────────────────────────────────── */
function Header() {
  return (
    <header className="lp-header">
      <Link to="/" className="lp-header-logo">
        <div className="lp-header-logo-icon">
          <svg width="16" height="16" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth="2.5">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            <polyline points="16 7 22 7 22 13"/>
          </svg>
        </div>
        FinOp
      </Link>
      <div className="lp-header-actions">
        <Link to="/login" className="lp-btn lp-btn-outline">Iniciar sesión</Link>
        <Link to="/registro" className="lp-btn lp-btn-primary">Registrarme</Link>
      </div>
    </header>
  );
}

/* ── Hero ───────────────────────────────────────── */
function Hero() {
  return (
    <section className="lp-hero">
      <AnimateSection>
        <h1>
          Control financiero sin{' '}
          <span className="lp-hero-accent">interrumpir tu negocio</span>
        </h1>
        <p>
          FinOp te permite cerrar tu jornada en minutos, sin necesidad de registrar cada venta durante el día. Descubre cuánto ganas realmente y toma decisiones informadas.
        </p>
        <div className="lp-hero-actions">
          <a href="#how" className="lp-btn lp-btn-outline lp-btn-lg">Ver cómo funciona</a>
          <Link to="/registro" className="lp-btn lp-btn-accent lp-btn-lg">Comenzar ahora →</Link>
        </div>
      </AnimateSection>
    </section>
  );
}

/* ── Value Prop ─────────────────────────────────── */
function ValueProp() {
  return (
    <section className="lp-section lp-valueprop">
      <div className="lp-section-label">Propuesta de valor</div>
      <h2 className="lp-section-title">Diseñado para la realidad de tu negocio</h2>
      <p className="lp-section-subtitle">
        FinOp es un sistema de gestión financiera para microempresas colombianas. No necesitas ser contador para saber si tu negocio gana o pierde.
      </p>

      <AnimateSection>
        <div className="lp-highlight-box">
          <h3>La diferencia fundamental</h3>
          <p>
            Otros sistemas te obligan a registrar cada transacción en tiempo real, interrumpiendo tu atención al cliente. FinOp trabaja <strong>al final de tu jornada</strong>: abres en la mañana, operas normalmente todo el día, y cierras en 5 minutos.
          </p>
          <div className="lp-compare">
            <div className="lp-compare-col bad">
              <h4>✕ Otros sistemas</h4>
              <p>Debes registrar cada venta, cada gasto y cada movimiento durante el día. Requieren tu atención constante y te quitan tiempo de atención al cliente.</p>
            </div>
            <div className="lp-compare-col good">
              <h4>✓ FinOp</h4>
              <p>Operas normalmente. Al final de la jornada cierras en minutos y obtienes toda la información financiera que necesitas sin haber interrumpido tu trabajo.</p>
            </div>
          </div>
        </div>
      </AnimateSection>
    </section>
  );
}

/* ── Features ───────────────────────────────────── */
function Features() {
  const items = [
    {
      icon: '📋', bg: '#edf3fa', title: 'Cierre diario guiado',
      desc: 'Proceso de 5 pasos para cerrar tu jornada sin errores. El sistema calcula todo automáticamente.'
    },
    {
      icon: '📊', bg: '#edf7ed', title: 'Rentabilidad automática',
      desc: 'Calcula tus ingresos, costos, gastos y utilidad neta. Conoce tu margen de ganancia real cada día.'
    },
    {
      icon: '🎯', bg: '#fff0e8', title: 'Indicadores inteligentes',
      desc: 'Punto de equilibrio, margen de ganancia y estado del día. Datos claros para tomar decisiones informadas.'
    },
    {
      icon: '🔍', bg: '#fce4e4', title: 'Control de caja',
      desc: 'Detecta discrepancias automáticamente entre el efectivo esperado y el real. Identifica problemas sin esfuerzo.'
    },
  ];

  return (
    <section className="lp-section lp-features" id="features">
      <div className="lp-section-label">Funcionalidades</div>
      <h2 className="lp-section-title">Todo lo que necesitas para controlar tus finanzas</h2>
      <p className="lp-section-subtitle">
        Cuatro pilares que convierten un proceso complejo en algo simple y accesible para cualquier emprendedor.
      </p>
      <AnimateSection>
        <div className="lp-features-grid">
          {items.map((f, i) => (
            <div className="lp-feature-card" key={i}>
              <div className="lp-feature-icon" style={{ background: f.bg }}>{f.icon}</div>
              <h4>{f.title}</h4>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </AnimateSection>
    </section>
  );
}

/* ── How It Works ───────────────────────────────── */
function HowItWorks() {
  const steps = [
    { num: 1, title: 'Abre tu jornada', desc: 'Define la caja inicial y comienza a operar.', meta: '8:00 AM' },
    { num: 2, title: 'Opera normalmente', desc: 'Atiende a tus clientes sin tocar el sistema.', meta: 'Todo el día' },
    { num: 3, title: 'Cierra en 5 minutos', desc: 'Registra ventas del día y dinero en caja al finalizar.', meta: 'Cierre de jornada' },
    { num: 4, title: 'Analiza resultados', desc: 'Revisa indicadores, detecta patrones y mejora.', meta: 'Dashboard' },
  ];

  return (
    <section className="lp-section" id="how">
      <div className="lp-section-label">Cómo funciona</div>
      <h2 className="lp-section-title">De la apertura al análisis en cuatro pasos</h2>
      <p className="lp-section-subtitle">
        Un flujo de trabajo simple que se adapta a la rutina de cualquier microempresa.
      </p>
      <AnimateSection>
        <div className="lp-steps">
          {steps.map((s, i) => (
            <div className="lp-step" key={i}>
              <div className="lp-step-num">{s.num}</div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
              <div className="lp-step-meta">{s.meta}</div>
            </div>
          ))}
        </div>
      </AnimateSection>
    </section>
  );
}

/* ── Benefits ────────────────────────────────────── */
function Benefits() {
  const items = [
    { title: 'De 30 a 5 minutos', desc: 'Reduce el tiempo de cierre diario eliminando cálculos manuales y anotaciones en cuaderno.' },
    { title: 'Sin errores humanos', desc: 'El sistema calcula automáticamente utilidades, costos y márgenes. Sin errores de suma ni de deducción.' },
    { title: 'Detecta problemas de caja', desc: 'Identifica automáticamente si falta o sobra dinero en caja. Tres niveles de alerta según la gravedad.' },
    { title: 'Decisiones basadas en datos', desc: 'Conoce tu punto de equilibrio y sabe exactamente cuánto necesitas vender para no perder dinero.' },
  ];

  return (
    <section className="lp-section lp-benefits">
      <div className="lp-section-label">Beneficios</div>
      <h2 className="lp-section-title">Resultados tangibles para tu negocio</h2>
      <p className="lp-section-subtitle">
        Pequeños cambios en la gestión que producen grandes diferencias en tus resultados.
      </p>
      <AnimateSection>
        <div className="lp-benefits-grid">
          {items.map((b, i) => (
            <div className="lp-benefit" key={i}>
              <div className="lp-benefit-check">✓</div>
              <div>
                <h4>{b.title}</h4>
                <p>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </AnimateSection>
    </section>
  );
}

/* ── Screenshots ────────────────────────────────── */
function Screenshots() {
  const screens = [
    { src: '/screenshots/dashboard.png', label: 'Dashboard — Vista general de tu negocio' },
    { src: '/screenshots/cierres.png', label: 'Cierre de jornada — Proceso guiado de 5 pasos' },
    { src: '/screenshots/configuracion.png', label: 'Configuración — Productos, costos y más' },
  ];

  return (
    <section className="lp-section lp-screenshots">
      <div className="lp-section-label">Pantallas</div>
      <h2 className="lp-section-title">Una interfaz limpia y profesional</h2>
      <p className="lp-section-subtitle">
        Diseñada para ser intuitiva incluso si nunca has usado un sistema financiero.
      </p>
      <AnimateSection>
        <div className="lp-screens-grid">
          {screens.map((s, i) => (
            <div className="lp-screen-card" key={i}>
              <img src={s.src} alt={s.label} className="lp-screen-img" />
              <div className="lp-screen-label">{s.label}</div>
            </div>
          ))}
        </div>
      </AnimateSection>
    </section>
  );
}

/* ── Use Case ────────────────────────────────────── */
function UseCase() {
  return (
    <section className="lp-section lp-usecase">
      <div className="lp-section-label">Caso de uso</div>
      <h2 className="lp-section-title">La historia de María</h2>
      <p className="lp-section-subtitle">
        Un ejemplo real de cómo FinOp transforma la gestión diaria de un pequeño negocio.
      </p>
      <AnimateSection>
        <div className="lp-usecase-story">
          <p><strong>María tiene una venta de empanadas.</strong> Antes anotaba todo en un cuaderno: cuánto vendió, cuánto gastó en harina, cuánto pagó de gas. Al final del mes miraba cuánto dinero tenía y asumía que era su ganancia — sin saber si realmente estaba perdiendo dinero o si alguien había tomado efectivo sin registrar.</p>
          <div className="lp-usecase-steps">
            <div className="lp-usecase-step">
              <div className="lp-usecase-step-num">1</div>
              <p>Abre su jornada con <strong>$150.000</strong> en caja y continúa su día normalmente, atendiendo clientes.</p>
            </div>
            <div className="lp-usecase-step">
              <div className="lp-usecase-step-num">2</div>
              <p>Al final del día, en <strong>5 minutos</strong>, registra las unidades que vendió de cada producto.</p>
            </div>
            <div className="lp-usecase-step">
              <div className="lp-usecase-step-num">3</div>
              <p>FinOp le muestra que vendió <strong>$397.500</strong> y que su punto de equilibrio es <strong>$415.000</strong>. Hoy no alcanzó.</p>
            </div>
            <div className="lp-usecase-step">
              <div className="lp-usecase-step-num">4</div>
              <p>Ahora María sabe que necesita vender <strong>$415.000 diarios</strong> para cubrir sus costos. Con este dato, ajusta sus precios y su estrategia.</p>
            </div>
          </div>
        </div>
      </AnimateSection>
    </section>
  );
}

/* ── FAQ ──────────────────────────────────────────── */
function FAQ() {
  const [open, setOpen] = useState(null);
  const questions = [
    {
      q: '¿Necesito saber de contabilidad para usar FinOp?',
      a: 'No. FinOp está diseñado para personas sin formación contable. El sistema te guía paso a paso y hace los cálculos por ti. Solo necesitas saber leer números básicos.'
    },
    {
      q: '¿Tengo que registrar cada venta durante el día?',
      a: 'No. Esa es la principal diferencia con otros sistemas. Puedes operar tu negocio normalmente durante el día y solo usar FinOp al final de la jornada para cerrar. No necesitas tocar el sistema mientras atiendes clientes.'
    },
    {
      q: '¿Funciona para cualquier tipo de negocio?',
      a: 'FinOp está optimizado para microempresas de comidas rápidas, retail y servicios personales. Si vendes productos o servicios al detal y manejas efectivo diariamente, FinOp es para ti.'
    },
    {
      q: '¿Cuánto tiempo toma cerrar una jornada?',
      a: 'Entre 3 y 5 minutos si registras el conteo de productos. Si omites el conteo, puedes cerrar en menos de 1 minuto con los datos estimados desde tu caja final.'
    },
    {
      q: '¿Es gratuito?',
      a: 'Actualmente FinOp es un proyecto académico en desarrollo y su uso es completamente gratuito. En el futuro se evaluará un modelo sostenible que mantenga una opción gratuita para microempresarios.'
    },
  ];

  return (
    <section className="lp-section lp-faq" id="faq">
      <div className="lp-section-label">Preguntas frecuentes</div>
      <h2 className="lp-section-title">Resuelve tus dudas</h2>
      <p className="lp-section-subtitle">
        Las preguntas más comunes sobre cómo FinOp puede ayudarte.
      </p>
      <div className="lp-faq-items">
        {questions.map((item, i) => (
          <div key={i} className={`lp-faq-item${open === i ? ' open' : ''}`} onClick={() => setOpen(open === i ? null : i)}>
            <h4>
              {item.q}
              <span className="lp-faq-arrow">▾</span>
            </h4>
            <p>{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Contact ─────────────────────────────────────── */
function Contact() {
  return (
    <section className="lp-section lp-contact" id="contact">
      <div className="lp-section-label">Contacto</div>
      <h2 className="lp-section-title">¿Tienes preguntas? Hablemos</h2>
      <p className="lp-section-subtitle">
        Estamos disponibles para resolver tus dudas o ayudarte a empezar.
      </p>
      <div className="lp-contact-grid">
        <a href="mailto:pjpadilla@unicesar.edu.co" className="lp-contact-card">
          <div className="lp-contact-icon">✉️</div>
          <div>
            <h4>Correo electrónico</h4>
            <span>pjpadilla@unicesar.edu.co</span>
          </div>
        </a>
        <a href="https://wa.me/573014746626" target="_blank" rel="noopener noreferrer" className="lp-contact-card">
          <div className="lp-contact-icon">💬</div>
          <div>
            <h4>WhatsApp</h4>
            <span>+57 301 474 6626</span>
          </div>
        </a>
      </div>
    </section>
  );
}

/* ── CTA Final ───────────────────────────────────── */
function CTAFinal() {
  return (
    <section className="lp-cta-final">
      <AnimateSection>
        <h2>Empieza a conocer los números reales de tu negocio</h2>
        <p>
          Sin complicaciones, sin interrumpir tu jornada. Descubre en minutos si tu negocio gana o pierde.
        </p>
        <div className="lp-hero-actions">
          <Link to="/login" className="lp-btn lp-btn-outline lp-btn-lg">Iniciar sesión</Link>
          <Link to="/registro" className="lp-btn lp-btn-accent lp-btn-lg">Registrarme gratis</Link>
        </div>
      </AnimateSection>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────── */
function Footer() {
  return (
    <footer className="lp-footer">
      <p>© {new Date().getFullYear()} FinOp — Proyecto académico — Universidad del Cesar</p>
    </footer>
  );
}

/* ── Main Landing Page ───────────────────────────── */
export default function LandingPage() {
  return (
    <div className="landing-page">
      <Header />
      <Hero />
      <ValueProp />
      <Features />
      <HowItWorks />
      <Benefits />
      <Screenshots />
      <UseCase />
      <FAQ />
      <Contact />
      <CTAFinal />
      <Footer />
    </div>
  );
}
