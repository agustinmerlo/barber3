// src/pages/cliente.jsx - VERSIÓN CORREGIDA
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./cliente.css";

const API_URL = "http://localhost:8000/api";

export default function Cliente() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth(); // ← AGREGAR loading
  const [barbers, setBarbers] = useState([]);
  const [loadingBarbers, setLoadingBarbers] = useState(true);

  // Cargar barberos desde la API (solo los activos, no eliminados)
  useEffect(() => {
    const fetchBarbers = async () => {
      setLoadingBarbers(true);
      try {
        const response = await fetch(`${API_URL}/barbers/`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        // Filtrar solo barberos activos (no eliminados)
        const activeBarbers = (data?.results ?? data).filter(b => !b.is_deleted);
        setBarbers(activeBarbers);
      } catch (error) {
        console.error("Error cargando barberos:", error);
        // En caso de error, mostrar barberos por defecto
        setBarbers([
          { id: 1, name: "Alex", specialty: "Fade • Clásicos • Estilizado" },
          { id: 2, name: "Bruno", specialty: "Navaja • Barba • Old school" },
          { id: 3, name: "Chris", specialty: "Cabello largo • Tendencias" }
        ]);
      } finally {
        setLoadingBarbers(false);
      }
    };

    fetchBarbers();
  }, []);

  // ✅ CORREGIDO: Handler que espera la carga del contexto
  const handleMiCuenta = () => {
    // Si el contexto aún está cargando, no hacer nada
    if (loading) {
      console.log('⏳ Esperando verificación de autenticación...');
      return;
    }

    console.log('🔍 isAuthenticated:', isAuthenticated);
    
    if (isAuthenticated) {
      console.log('✅ Usuario autenticado, redirigiendo a panel-cliente');
      navigate('/panel-cliente');
    } else {
      console.log('❌ Usuario no autenticado, redirigiendo a login');
      navigate('/login');
    }
  };

  return (
    <div className="client-landing">
      {/* HERO SIN IMAGEN */}
      <section className="hero hero--plain">
        <div className="hero__content">
          <h1 className="hero__title">Barber Studio</h1>
          <p className="hero__subtitle">Cortes precisos • Afeitado clásico • Estilo contemporáneo</p>
          <div className="hero__cta">
            <Link to="/reservar" className="btn btn--primary">Reservar turno</Link>
            <a href="#servicios" className="btn btn--ghost">Ver servicios</a>
            {/* ✅ Mostrar estado de carga en el botón */}
            <button 
              onClick={handleMiCuenta}
              className="btn btn--outline"
              disabled={loading}
            >
              {loading ? '⏳ Verificando...' : '👤 Mi Cuenta'}
            </button>
          </div>
        </div>
      </section>

      {/* ... resto del código igual ... */}
      
      {/* SELLING POINTS */}
      <section className="usp">
        <div className="container usp__grid">
          <div className="usp__item">
            <h3>Barberos expertos</h3>
            <p>Técnicas tradicionales y modernas para cada estilo.</p>
          </div>
          <div className="usp__item">
            <h3>Productos pro</h3>
            <p>Usamos líneas profesionales para un acabado superior.</p>
          </div>
          <div className="usp__item">
            <h3>Reserva fácil</h3>
            <p>Elegí servicio, fecha y hora en menos de un minuto.</p>
          </div>
        </div>
      </section>

      {/* SERVICIOS */}
      <section id="servicios" className="services">
        <div className="container">
          <div className="section-head">
            <h2>Servicios</h2>
            <p>Los clásicos de barbería con un toque premium.</p>
          </div>
          <ul className="services__grid">
            <li className="card">
              <div className="card__body">
                <h4>Corte de cabello</h4>
                <p>Asesoría + lavado + styling.</p>
                <span className="price">$</span>
              </div>
            </li>
            <li className="card">
              <div className="card__body">
                <h4>Barba clásica</h4>
                <p>Toalla caliente + navaja + bálsamo.</p>
                <span className="price">$</span>
              </div>
            </li>
            <li className="card">
              <div className="card__body">
                <h4>Afeitado clásico</h4>
                <p>Experiencia tradicional con navaja.</p>
                <span className="price">$</span>
              </div>
            </li>
            <li className="card">
              <div className="card__body">
                <h4>Combo corte + barba</h4>
                <p>Look completo en una sola visita.</p>
                <span className="price">$</span>
              </div>
            </li>
          </ul>
          <div className="center">
            <Link to="/reservar" className="btn btn--primary btn--lg">Reservar ahora</Link>
          </div>
        </div>
      </section>

      {/* BARBERS - Dinámicos desde la API */}
      <section className="barbers">
        <div className="container">
          <div className="section-head">
            <h2>Nuestro equipo</h2>
            <p>Profesionales dedicados a tu mejor versión.</p>
          </div>

          {loadingBarbers ? (
            <div className="barbers-loading">
              <div className="spinner"></div>
              <p>Cargando nuestro equipo...</p>
            </div>
          ) : barbers.length === 0 ? (
            <div className="barbers-empty">
              <div className="empty-icon">✂️</div>
              <p>Próximamente conocerás a nuestro equipo de expertos.</p>
            </div>
          ) : (
            <div className="barbers__grid">
              {barbers.map((barber) => (
                <div key={barber.id} className="barber-card-client">
                  <div className="barber-image-wrapper">
                    {barber.photo ? (
                      <img 
                        src={barber.photo} 
                        alt={barber.name}
                        className="barber-image"
                      />
                    ) : (
                      <div className="barber-avatar-client">
                        {barber.name?.charAt(0)?.toUpperCase() || "B"}
                      </div>
                    )}
                  </div>
                  <div className="barber-info">
                    <h4 className="barber-name">{barber.name}</h4>
                    <p className="barber-specialty">
                      {barber.specialty || "Especialista en barbería"}
                    </p>
                    {barber.work_schedule && (
                      <p className="barber-schedule">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {barber.work_schedule}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* INFO */}
      <section className="info">
        <div className="container info__grid">
          <div>
            <h3>Horarios</h3>
            <ul className="hours">
              <li>Lun–Vie: 10:00–20:00</li>
              <li>Sáb: 10:00–18:00</li>
              <li>Dom: Cerrado</li>
            </ul>
            <Link to="/reservar" className="btn btn--primary">Agendar</Link>
          </div>
          <div>
            <h3>Ubicación</h3>
            <p>Av. Principal 123, Salta</p>
            <div className="map-embed">
              <iframe
                title="mapa"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps/embed?pb=!1m18!..."
              />
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer__grid">
          <p>© {new Date().getFullYear()} Barber Studio — Todos los derechos reservados.</p>
          <div className="footer-links">
            <button 
              onClick={handleMiCuenta}
              className="footer-link-btn"
              disabled={loading}
            >
              {loading ? 'Verificando...' : 'Mi Cuenta'}
            </button>
            <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
          </div>
        </div>
      </footer>
    </div>
  );
}