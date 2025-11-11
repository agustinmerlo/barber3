// src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const DJANGO_LOGIN_URL = 'http://localhost:8000/api/usuarios/login/';
const AUTH_ME_URL = 'http://localhost:8000/api/usuarios/auth/me';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1) LOGIN
      const loginRes = await fetch(DJANGO_LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        const msg =
          loginData.error ||
          loginData.detail ||
          loginData.non_field_errors?.[0] ||
          loginData.email?.[0] ||
          loginData.password?.[0] ||
          'Credenciales inválidas. Intenta nuevamente.';
        throw new Error(msg);
      }

      // Guardar token
      const token = loginData.token;
      if (!token) {
        throw new Error('El backend no devolvió token.');
      }

      // 2) SINCRONIZAR ROL EFECTIVO DESDE BACKEND
      const meRes = await fetch(AUTH_ME_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
      });

      const meData = await meRes.json();

      if (!meRes.ok) {
        const msg =
          meData.error ||
          meData.detail ||
          'No se pudo obtener el perfil del usuario.';
        throw new Error(msg);
      }

      // Role efectivo (superuser/staff => admin)
      const role = (meData.role || 'cliente').toLowerCase();
      const userId = meData.user_id;

      // 3) ACTUALIZAR CONTEXTO
      const userData = {
        user_id: userId,
        email: meData.email,
        nombre: meData.nombre || '',
        apellido: meData.apellido || '',
        telefono: meData.telefono || '',
        role: role,
      };

      login(userData, token);

      // 4) REDIRECCIÓN SEGÚN ROL
      console.log('✅ Login exitoso:', userData);
      
      if (role === 'admin') {
        navigate('/home');
      } else if (role === 'barbero') {
        navigate('/barbero/home');
      } else {
        // ✅ CAMBIO: Los clientes van a la página principal, no al panel
        navigate('/cliente');
      }
    } catch (apiError) {
      console.error('❌ Error al iniciar sesión:', apiError);
      setError(apiError.message || 'Error de red o del servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background"></div>
      <div className="login-card">
        <div className="login-logo-container">
          <img src="/assets/logo.png" alt="Logo Barber Studio" className="logo-image" />
        </div>

        <h2>Iniciar Sesión</h2>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <span className="input-icon" role="img" aria-label="persona">
              👤
            </span>
            <input
              type="email"
              placeholder="Correo Electrónico"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <span className="input-icon" role="img" aria-label="candado">
              🔒
            </span>
            <input
              type="password"
              placeholder="Contraseña"
              name="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && (
            <p style={{ color: 'red', fontSize: '0.9em', marginTop: '8px' }}>{error}</p>
          )}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Iniciando...' : 'Entrar'}
          </button>
        </form>

        <p className="register-link-container">
          ¿No tienes una cuenta? <Link to="/register">Regístrate</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;