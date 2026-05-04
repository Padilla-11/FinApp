import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useApp();
  const navigate   = useNavigate();
  const [form, setForm]   = useState({ correo: '', contrasena: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.correo || !form.contrasena) { toast.error('Completa todos los campos'); return; }
    setLoading(true);
    try {
      await login(form.correo, form.contrasena);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.Mensaje || 'Correo o contraseña incorrectos';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="26" height="26" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth="2">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--fo-primary)', letterSpacing: '-.02em' }}>FinOp</div>
        </div>
        <div className="auth-title">Bienvenido de nuevo</div>
        <div className="auth-sub">Ingresa a tu cuenta para continuar</div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="label-text">Correo electrónico <span className="required">*</span></label>
            <input className="fo-input" type="email" placeholder="tucorreo@ejemplo.com"
              value={form.correo} onChange={set('correo')} autoComplete="email" />
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.375rem' }}>
              <label className="label-text" style={{ margin: 0 }}>Contraseña <span className="required">*</span></label>
              <a href="#" className="fo-hint">¿Olvidaste tu contraseña?</a>
            </div>
            <div style={{ position: 'relative' }}>
              <input className="fo-input" type={showPass ? 'text' : 'password'}
                placeholder="••••••••" value={form.contrasena} onChange={set('contrasena')}
                style={{ paddingRight: '2.75rem' }} autoComplete="current-password" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: '.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fo-text-muted)' }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showPass
                    ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                    : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                  }
                </svg>
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <hr className="fo-divider" />
        <p style={{ textAlign: 'center', fontSize: '.875rem', margin: 0 }}>
          ¿No tienes cuenta? <Link to="/registro" style={{ fontWeight: 500 }}>Crear cuenta gratis</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: '.75rem' }}>
          <span className="badge badge-info" style={{ fontSize: '.7rem' }}>Demo: demo@finop.co / demo123</span>
        </p>
      </div>
    </div>
  );
}
