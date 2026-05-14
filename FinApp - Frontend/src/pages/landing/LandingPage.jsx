import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ChartBarIcon, CurrencyDollarIcon, MagnifyingGlassIcon,
  CheckCircleIcon, XCircleIcon, EnvelopeIcon, ChatBubbleLeftIcon,
  BoltIcon, BanknotesIcon, DocumentTextIcon, ArrowRightIcon,
  ClockIcon, CalendarDaysIcon, ArrowTrendingUpIcon, ShieldCheckIcon,
} from '@heroicons/react/20/solid';
import './landing.css';

/* ── Intersection Observer hook ─────────────────── */
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

/* ── Scroll Progress ─────────────────────────────── */
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

/* ── Header ──────────────────────────────────────── */
function Header() {
  return (
    <header className="lp-header">
      <Link to="/" className="lp-header-logo">
        <div className="lp-header-logo-icon">
          <ChartBarIcon style={{ width: 18, height: 18 }} />
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

/* ── Hero ────────────────────────────────────────── */
function Hero() {
  return (
    <section className="lp-hero" id="main">
      <AnimateSection>
        <div className="lp-hero-trust">
          <span><CheckCircleIcon style={{ width: 14, height: 14, color: 'var(--lp-accent)', verticalAlign: 'middle', marginRight: 4 }} /> 100% gratis</span>
          <span><ShieldCheckIcon style={{ width: 14, height: 14, color: 'var(--lp-accent)', verticalAlign: 'middle', marginRight: 4 }} /> Sin tarjeta</span>
          <span><ArrowTrendingUpIcon style={{ width: 14, height: 14, color: 'var(--lp-accent)', verticalAlign: 'middle', marginRight: 4 }} /> +200 empresas</span>
        </div>
      </AnimateSection>
      <AnimateSection>
        <h1>
          Tu negocio gana dinero.<br />
          <span className="lp-accent-word">¿Pero cuánto?</span>
        </h1>
      </AnimateSection>
      <AnimateSection>
        <p>
          Deja de adivinar. En <strong style={{ color: 'var(--lp-amber)' }}>5 minutos al día</strong>, FinOp te dice la verdad sobre tus finanzas. Sin interrumpir tu jornada, sin necesidad de ser contador.
        </p>
      </AnimateSection>
      <AnimateSection>
        <div className="lp-hero-actions">
          <Link to="/registro" className="lp-btn lp-btn-primary lp-btn-lg">
            Comenzar ahora <ArrowRightIcon style={{ width: 16, height: 16 }} />
          </Link>
          <a href="#how" className="lp-btn lp-btn-ghost lp-btn-lg">
            Ver cómo funciona
          </a>
        </div>
      </AnimateSection>
    </section>
  );
}

/* ── Value Prop ─────────────────────────────────── */
function ValueProp() {
  return (
    <section className="lp-valueprop">
      <div className="lp-section-label">Propuesta de valor</div>
      <h2 className="lp-section-title">Diseñado para la realidad de tu negocio</h2>
      <p className="lp-section-subtitle">
        FinOp es un sistema de gestión financiera para microempresas colombianas. No necesitas ser contador para saber si tu negocio gana o pierde.
      </p>

      <AnimateSection>
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
      </AnimateSection>
    </section>
  );
}

/* ── Features ───────────────────────────────────── */
function Features() {
  const items = [
    {
      Icon: DocumentTextIcon, bg: 'rgba(16,185,129,0.08)',
      title: 'Cierre diario guiado',
      desc: 'Proceso de 5 pasos. De 30 minutos a 5 minutos. El sistema calcula todo por ti.',
    },
    {
      Icon: CurrencyDollarIcon, bg: 'rgba(245,158,11,0.08)',
      title: 'Rentabilidad automática',
      desc: 'Ingresos, costos, gastos y utilidad neta. Conoce tu margen de ganancia real cada día.',
    },
    {
      Icon: BoltIcon, bg: 'rgba(16,185,129,0.08)',
      title: 'Indicadores inteligentes',
      desc: 'Punto de equilibrio y estado del día. Datos claros para decisiones informadas.',
    },
    {
      Icon: MagnifyingGlassIcon, bg: 'rgba(239,68,68,0.08)',
      title: 'Control de caja',
      desc: 'Detecta discrepancias automáticamente. Tres niveles de alerta según la gravedad.',
    },
  ];

  return (
    <section className="lp-section" id="features">
      <div className="lp-section-label">Funcionalidades</div>
      <h2 className="lp-section-title">Cuatro pilares. Cero complicaciones.</h2>
      <p className="lp-section-subtitle">
        Todo lo que necesitas para controlar tus finanzas sin experiencia contable.
      </p>
      <AnimateSection>
        <div className="lp-features-grid">
          {items.map((f, i) => (
            <div className="lp-feature-card" key={i}>
              <div className="lp-feature-icon" style={{ background: f.bg }}>
                <f.Icon style={{ width: 22, height: 22 }} />
              </div>
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
    { num: 1, title: 'Abre tu jornada', desc: 'Define la caja inicial y comienza a operar.', meta: '8:00 AM', Icon: ClockIcon },
    { num: 2, title: 'Opera normalmente', desc: 'Atiende clientes sin necesidad de tocar el sistema.', meta: 'Todo el día', Icon: BanknotesIcon },
    { num: 3, title: 'Cierra en 5 min', desc: 'Registra ventas y dinero en caja al finalizar.', meta: 'Cierre', Icon: DocumentTextIcon },
    { num: 4, title: 'Analiza', desc: 'Indicadores, tendencias y decisiones informadas.', meta: 'Dashboard', Icon: ChartBarIcon },
  ];

  return (
    <section className="lp-section" id="how">
      <div className="lp-section-label">Cómo funciona</div>
      <h2 className="lp-section-title">De la apertura al análisis en cuatro pasos</h2>
      <p className="lp-section-subtitle">
        Un flujo de trabajo que se adapta a la rutina real de tu negocio.
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
    { title: 'De 30 a 5 minutos', desc: 'Reduce el tiempo de cierre diario eliminando cálculos manuales y cuadernos.' },
    { title: 'Sin errores humanos', desc: 'El sistema calcula utilidades, costos y márgenes automáticamente.' },
    { title: 'Detecta problemas de caja', desc: 'Tres niveles de alerta según la diferencia entre caja esperada y real.' },
    { title: 'Decisiones con datos reales', desc: 'Conoce tu punto de equilibrio. Sabrás cuánto necesitas vender.' },
  ];

  return (
    <section className="lp-section">
      <div className="lp-section-label">Beneficios</div>
      <h2 className="lp-section-title">Resultados tangibles desde el primer día</h2>
      <p className="lp-section-subtitle">
        Pequeños cambios en la gestión financiera que producen grandes diferencias.
      </p>
      <AnimateSection>
        <div className="lp-benefits-grid">
          {items.map((b, i) => (
            <div className="lp-benefit" key={i}>
              <div className="lp-benefit-icon">
                <CheckCircleIcon style={{ width: 14, height: 14 }} />
              </div>
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
    <section className="lp-section" aria-label="Pantallas de la aplicación">
      <div className="lp-section-label">Pantallas</div>
      <h2 className="lp-section-title">Una interfaz limpia y moderna</h2>
      <p className="lp-section-subtitle">
        Diseñada para ser intuitiva incluso si nunca has usado un sistema financiero.
      </p>
      <AnimateSection>
        <div className="lp-screens-grid">
          {screens.map((s, i) => (
            <div className="lp-screen-card" key={i}>
              <img src={s.src} alt={s.label} className="lp-screen-img" loading="lazy" decoding="async" />
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
    <section className="lp-section">
      <div className="lp-section-label">Caso de uso</div>
      <h2 className="lp-section-title">La historia de María</h2>
      <p className="lp-section-subtitle">
        Cómo FinOp transformó la gestión diaria de un negocio de empanadas.
      </p>
      <AnimateSection>
        <div className="lp-usecase-story">
          <p><strong>María tiene una venta de empanadas.</strong> Antes anotaba todo en un cuaderno y al final del mes no sabía si realmente ganaba dinero. Hoy con FinOp toma decisiones informadas.</p>
          <div className="lp-usecase-steps">
            <div className="lp-usecase-step">
              <div className="lp-usecase-step-num">1</div>
              <p>Abre su jornada con <strong>$150.000</strong> en caja y atiende clientes normalmente.</p>
            </div>
            <div className="lp-usecase-step">
              <div className="lp-usecase-step-num">2</div>
              <p>En <strong style={{ color: 'var(--lp-amber)' }}>5 minutos</strong> cierra su jornada y registra las ventas del día.</p>
            </div>
            <div className="lp-usecase-step">
              <div className="lp-usecase-step-num">3</div>
              <p>FinOp le muestra que su <strong>punto de equilibrio es $415.000</strong>. Hoy no lo alcanzó.</p>
            </div>
            <div className="lp-usecase-step">
              <div className="lp-usecase-step-num">4</div>
              <p>Ahora María sabe exactamente qué ajustar en sus precios y costos para ser rentable.</p>
            </div>
          </div>
        </div>
      </AnimateSection>
    </section>
  );
}

/* ── FAQ ─────────────────────────────────────────── */
function FAQ() {
  const [open, setOpen] = useState(null);
  const questions = [
    {
      q: '¿Necesito saber de contabilidad para usar FinOp?',
      a: 'No. FinOp está diseñado para personas sin formación contable. Te guía paso a paso y hace los cálculos por ti.'
    },
    {
      q: '¿Tengo que registrar cada venta durante el día?',
      a: 'No. Esa es la gran diferencia. Puedes operar tu negocio normalmente y solo usar FinOp al final de la jornada para cerrar.'
    },
    {
      q: '¿Funciona para cualquier tipo de negocio?',
      a: 'Está optimizado para microempresas de comidas, retail y servicios. Si vendes productos y manejas efectivo, FinOp es para ti.'
    },
    {
      q: '¿Cuánto tiempo toma cerrar una jornada?',
      a: 'De 3 a 5 minutos si haces conteo de productos. Menos de 1 minuto si omites el conteo y usas estimación desde caja.'
    },
    {
      q: '¿Es gratuito?',
      a: 'Actualmente FinOp es un proyecto académico en desarrollo y su uso es completamente gratuito.'
    },
  ];

  return (
    <section className="lp-section" id="faq">
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
            <p aria-hidden={open !== i}>{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Contact ─────────────────────────────────────── */
function Contact() {
  return (
    <section className="lp-section" id="contact">
      <div className="lp-section-label">Contacto</div>
      <h2 className="lp-section-title">¿Tienes preguntas? Hablemos</h2>
      <p className="lp-section-subtitle">
        Escríbenos y te respondemos lo antes posible.
      </p>
      <div className="lp-contact-grid">
        <a href="mailto:pjpadilla@unicesar.edu.co" className="lp-contact-card">
          <div className="lp-contact-icon"><EnvelopeIcon style={{ width: 18, height: 18 }} /></div>
          <div>
            <h4>Correo electrónico</h4>
            <span>pjpadilla@unicesar.edu.co</span>
          </div>
        </a>
        <a href="https://wa.me/573014746626" target="_blank" rel="noopener noreferrer" className="lp-contact-card">
          <div className="lp-contact-icon"><ChatBubbleLeftIcon style={{ width: 18, height: 18 }} /></div>
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
        <h2>Saber la verdad no cuesta nada. No saberla, sí.</h2>
        <p>
          Comienza hoy sin compromiso. Sin tarjeta. Sin interrumpir tu jornada.
        </p>
        <div className="lp-hero-actions">
          <Link to="/login" className="lp-btn lp-btn-ghost lp-btn-lg">Iniciar sesión</Link>
          <Link to="/registro" className="lp-btn lp-btn-primary lp-btn-lg">
            Registrarme gratis <ArrowRightIcon style={{ width: 16, height: 16 }} />
          </Link>
        </div>
      </AnimateSection>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────── */
function Footer() {
  return (
    <footer className="lp-footer" role="contentinfo">
      <p>&copy; {new Date().getFullYear()} FinOp &mdash; Proyecto académico &mdash; Universidad del Cesar</p>
    </footer>
  );
}

/* ── Main Landing Page ───────────────────────────── */
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
        <UseCase />
        <FAQ />
        <Contact />
        <CTAFinal />
      </main>
      <Footer />
    </div>
  );
}
