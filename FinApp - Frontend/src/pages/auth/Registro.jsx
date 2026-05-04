import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import toast from 'react-hot-toast';

export default function Registro() {
  const { registrar } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', correo: '', pass1: '', pass2: '', terminos: false });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.type === 'checkbox' ? e.checked : e.target.value }));

  function strength(p) {
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  }

  const str = strength(form.pass1);
  const strLabel = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'][str];
  const strColor = ['', 'var(--fo-danger)', 'var(--fo-warning)', 'var(--fo-accent)', 'var(--fo-accent-dark)'][str];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre || !form.correo || !form.pass1) { toast.error('Completa todos los campos'); return; }
    if (form.pass1.length < 8) { toast.error('La contraseña debe tener mínimo 8 caracteres'); return; }
    if (form.pass1 !== form.pass2) { toast.error('Las contraseñas no coinciden'); return; }
    if (!form.terminos) { toast.error('Acepta los términos para continuar'); return; }
    setLoading(true);
    try {
      await registrar(form.nombre, form.correo, form.pass1);
      navigate('/onboarding');
    } catch (err) {
      toast.error(err.response?.data?.Mensaje || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="26" height="26" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth="2">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--fo-primary)' }}>FinOp</div>
        </div>
        <div className="auth-title">Crea tu cuenta</div>
        <div className="auth-sub">Empieza a controlar las finanzas de tu negocio</div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="label-text">Nombre completo <span className="required">*</span></label>
            <input className="fo-input" type="text" placeholder="Tu nombre y apellido" value={form.nombre} onChange={set('nombre')} />
          </div>
          <div className="form-group">
            <label className="label-text">Correo electrónico <span className="required">*</span></label>
            <input className="fo-input" type="email" placeholder="tucorreo@ejemplo.com" value={form.correo} onChange={set('correo')} />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="label-text">Contraseña <span className="required">*</span></label>
              <input className="fo-input" type="password" placeholder="Mínimo 8 caracteres" value={form.pass1} onChange={set('pass1')} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="label-text">Confirmar <span className="required">*</span></label>
              <input className="fo-input" type="password" placeholder="Repite la contraseña" value={form.pass2} onChange={set('pass2')} />
            </div>
          </div>
          {form.pass1 && (
            <div style={{ marginTop: '-.5rem', marginBottom: '1rem' }}>
              <div className="progress-wrap" style={{ height: 4 }}>
                <div className="progress-bar" style={{ width: `${str * 25}%`, background: strColor, transition: 'width .3s, background .3s' }} />
              </div>
              <div className="fo-hint" style={{ color: strColor }}>{strLabel}</div>
            </div>
          )}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '.625rem', cursor: 'pointer', fontSize: '.9rem' }}>
              <input type="checkbox" checked={form.terminos} onChange={(e) => setForm((p) => ({ ...p, terminos: e.target.checked }))} style={{ marginTop: 2 }} />
              <span>Acepto los <a href="#">términos de uso</a> y la <a href="#">política de privacidad</a>.</span>
            </label>
          </div>
          <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
          </button>
        </form>
        <hr className="fo-divider" />
        <p style={{ textAlign: 'center', fontSize: '.875rem', margin: 0 }}>
          ¿Ya tienes cuenta? <Link to="/login" style={{ fontWeight: 500 }}>Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
