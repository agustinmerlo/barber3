import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./servicios.css";

export default function Servicios() {
  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";
  const navigate = useNavigate();

  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Formato de precio
  const fmtCurrency = (n) =>
    new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(n) || 0);

  // Elegir imagen según nombre
  const getImageForService = (nombre = "") => {
    const lower = nombre.toLowerCase();
    if (lower.includes("corte")) return "/assets/corte.png";
    if (lower.includes("barba")) return "/assets/barba.png";
    if (lower.includes("color")) return "/assets/completo.png";
    if (lower.includes("ceja") || lower.includes("perfilado"))
      return "/assets/cejas.png";
    return "/assets/default-service.png";
  };

  useEffect(() => {
    let cancel = false;
    setCargando(true);
    setError("");

    // ✅ CORREGIDO: Cambiar /api/services/ por /api/servicios/
    fetch(`${API_BASE}/api/servicios/`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (!cancel) setServicios(Array.isArray(data) ? data : []);
      })
      .catch(() => !cancel && setError("No se pudieron cargar los servicios."))
      .finally(() => !cancel && setCargando(false));

    return () => {
      cancel = true;
    };
  }, [API_BASE]);

  const handleReservar = (id) => {
    navigate(`/reservar?id=${id}`);
  };

  return (
    <div className="servicios-page">
      {/* HEADER */}
      <header className="servicios-header">
        <div className="nav">
          <div className="logo">CLASE V</div>
          <nav>
            <a href="/cliente">Inicio</a>
            <a href="/servicios" className="active">Servicios</a>
            <a href="#barberos">Barberos</a>
            <a href="#contactos">Contactos</a>
          </nav>
        </div>
        <h1>Seleccionar servicios</h1>
      </header>

      {/* CONTENIDO */}
      <main className="servicios-content">
        {cargando && <p>Cargando...</p>}
        {error && <p className="error">{error}</p>}

        {/* BURBUJAS DESTACADAS */}
        {servicios.length > 0 && (
          <div className="burbujas-wrapper">
            <h2 className="burbujas-title">🌟 Servicios Destacados</h2>
            <div className="burbujas-container">
              {servicios.slice(0, 3).map((s) => (
                <div key={`burbuja-${s.id}`} className="burbuja-card">
                  <img
                    src={s.imagen || getImageForService(s.nombre)}
                    alt={s.nombre}
                    className="burbuja-img"
                    onError={(e) => (e.currentTarget.src = "/assets/default-service.png")}
                  />
                  <div className="burbuja-info">
                    <h4>{s.nombre}</h4>
                    <p className="burbuja-duracion">⏱️ {s.duracion || "60 min"}</p>
                    <p className="burbuja-precio">$ {fmtCurrency(s.precio)}</p>
                    <button className="btn-burbuja" onClick={() => handleReservar(s.id)}>
                      Reservar Ahora
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LISTA COMPLETA DE SERVICIOS */}
        <div className="servicios-grid">
          {servicios.map((s) => (
            <div key={s.id} className="servicio-card">
              <div className="servicio-left">
                <img
                  src={s.imagen || getImageForService(s.nombre)}
                  alt={s.nombre}
                  className="servicio-img"
                  onError={(e) => (e.currentTarget.src = "/assets/default-service.png")}
                />
                <div>
                  <h3>{s.nombre}</h3>
                  <p>{s.duracion || "60 minutos"}</p>
                </div>
              </div>

              <div className="servicio-right">
                <span className="precio">$ {fmtCurrency(s.precio)}</span>
                <button onClick={() => handleReservar(s.id)}>Reservar</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}