// src/pages/ReservarConfirmacion.jsx
import React, { useState } from "react";
import "./reservarConfirmacion.css";

export default function ReservarConfirmacion({ datosReserva, onVolver, onPagar }) {
  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

  // Obtener datos de la reserva desde props o localStorage
  const [reserva] = useState(() => {
    if (datosReserva) return datosReserva;
    
    const stored = localStorage.getItem('reservaConfirmacion');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Error parsing reserva:', e);
      }
    }
    
    // Datos de ejemplo
    return {
      servicios: [
        { id: 1, nombre: "Corte Clásico", precio: 25, duracion: "45 min", cantidad: 1 },
        { id: 3, nombre: "Corte + Barba", precio: 35, duracion: "60 min", cantidad: 1 },
      ],
      total: 60,
      duracionTotal: 105,
      fecha: "2025-10-25",
      barbero: { id: 1, nombre: "Carlos Martínez", especialidad: "Cortes Clásicos" },
      horario: "15:00"
    };
  });

  // Datos del formulario
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    email: ""
  });

  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  // Calcular seña (30% del total)
  const calcularSeña = () => {
    return Math.round(reserva.total * 0.3);
  };

  // Formatear fecha
  const formatearFecha = (fecha) => {
    if (!fecha) return "No disponible";
    const date = new Date(fecha + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Validar teléfono argentino
  const validarTelefono = (telefono) => {
    // Formato: +54 9 xxx xxx-xxxx o similar
    const regex = /^(\+54)?[\s]?9?[\s]?(\d{2,4})[\s]?(\d{3,4})[\s]?-?(\d{4})$/;
    return regex.test(telefono);
  };

  // Validar email
  const validarEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errores[name]) {
      setErrores(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  // Validar formulario
  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = "El nombre es requerido";
    }

    if (!formData.apellido.trim()) {
      nuevosErrores.apellido = "El apellido es requerido";
    }

    if (!formData.telefono.trim()) {
      nuevosErrores.telefono = "El teléfono es requerido";
    } else if (!validarTelefono(formData.telefono)) {
      nuevosErrores.telefono = "Formato inválido. Ej: +54 9 387 123-4567";
    }

    if (!formData.email.trim()) {
      nuevosErrores.email = "El email es requerido";
    } else if (!validarEmail(formData.email)) {
      nuevosErrores.email = "Email inválido";
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // Manejar pago de seña
  const handlePagarSeña = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    // ✅ CRÍTICO: Guardar AMBOS datos en localStorage
    localStorage.setItem('clienteData', JSON.stringify(formData));
    
    // ✅ Guardar la reserva completa con todos los datos necesarios
    const reservaCompleta = {
      servicios: reserva.servicios || [],
      total: reserva.total || 0,
      duracionTotal: reserva.duracionTotal || 0,
      duracion_total: reserva.duracionTotal || 0, // Alias por compatibilidad
      fecha: reserva.fecha,
      barbero: reserva.barbero || {},
      horario: reserva.horario
    };
    
    localStorage.setItem('reservaConfirmacion', JSON.stringify(reservaCompleta));
    
    // DEBUG: Verificar qué se guardó
    console.log('✅ Datos guardados en localStorage:');
    console.log('  - clienteData:', formData);
    console.log('  - reservaConfirmacion:', reservaCompleta);

    // Navegar a la página de pago
    if (onPagar) {
      onPagar(formData);
    } else {
      window.location.href = '/reservar/pago';
    }
  };

  const handleVolver = () => {
    if (onVolver) {
      onVolver();
    } else {
      window.history.back();
    }
  };

  return (
    <div className="confirmacion-page">
      {/* HEADER */}
      <header className="confirmacion-header">
        <div className="nav">
          <div className="logo">CLASE V</div>
          <nav>
            <a href="/cliente">Inicio</a>
            <a href="/servicios">Servicios</a>
            <a href="#barberos">Barberos</a>
            <a href="#contactos">Contactos</a>
          </nav>
        </div>
        <h1>Confirmar Reserva</h1>
      </header>

      <main className="confirmacion-content">
        <div className="confirmacion-split">
          {/* IZQUIERDA: RESUMEN DE RESERVA */}
          <div className="resumen-completo">
            <h2>📋 Resumen de tu Reserva</h2>

            {/* Fecha y Horario */}
            <section className="info-section">
              <div className="info-icon">📅</div>
              <div className="info-content">
                <h3>Fecha y Horario</h3>
                <p className="info-principal">{formatearFecha(reserva.fecha)}</p>
                <p className="info-secundario">Hora: {reserva.horario}</p>
              </div>
            </section>

            {/* Barbero */}
            <section className="info-section">
              <div className="info-icon">✂️</div>
              <div className="info-content">
                <h3>Barbero</h3>
                <p className="info-principal">{reserva.barbero?.nombre}</p>
                <p className="info-secundario">{reserva.barbero?.especialidad}</p>
              </div>
            </section>

            {/* Servicios */}
            <section className="info-section servicios-section">
              <div className="info-icon">💼</div>
              <div className="info-content">
                <h3>Servicios</h3>
                <div className="servicios-detalle">
                  {reserva.servicios?.map((servicio, index) => (
                    <div key={index} className="servicio-linea">
                      <div>
                        <span className="servicio-nombre">{servicio.nombre}</span>
                        {servicio.cantidad > 1 && (
                          <span className="servicio-cantidad"> x{servicio.cantidad}</span>
                        )}
                        <p className="servicio-duracion">{servicio.duracion}</p>
                      </div>
                      <span className="servicio-precio">
                        ${Number(servicio.precio) * (servicio.cantidad || 1)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="duracion-total">
                  <span>Duración total:</span>
                  <strong>{reserva.duracionTotal} minutos</strong>
                </div>
              </div>
            </section>

            {/* Ubicación */}
            <section className="info-section">
              <div className="info-icon">📍</div>
              <div className="info-content">
                <h3>Ubicación</h3>
                <p className="info-principal">Barbería Clase V</p>
                <p className="info-secundario">Av. Belgrano 1234, Salta Capital</p>
                <p className="info-secundario">Salta, Argentina</p>
                <a 
                  href="https://maps.google.com/?q=Barbería+Clase+V+Salta" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-mapa"
                >
                  Ver en el mapa →
                </a>
              </div>
            </section>

            {/* Total */}
            <section className="total-section">
              <div className="total-linea">
                <span>Total del servicio:</span>
                <strong>${reserva.total}</strong>
              </div>
              <div className="seña-info">
                <div className="seña-linea">
                  <span>Seña a pagar (30%):</span>
                  <strong className="precio-seña">${calcularSeña()}</strong>
                </div>
                <p className="seña-nota">
                  El resto se abona al finalizar el servicio
                </p>
              </div>
            </section>
          </div>

          {/* DERECHA: FORMULARIO DE DATOS */}
          <div className="formulario-cliente">
            <h2>📝 Tus Datos</h2>
            <p className="formulario-subtitulo">
              Completa tus datos para confirmar la reserva
            </p>

            <form onSubmit={handlePagarSeña} className="form-datos">
              {/* Nombre */}
              <div className="form-group">
                <label htmlFor="nombre">Nombre *</label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className={errores.nombre ? "input-error" : ""}
                  placeholder="Juan"
                />
                {errores.nombre && (
                  <span className="error-mensaje">{errores.nombre}</span>
                )}
              </div>

              {/* Apellido */}
              <div className="form-group">
                <label htmlFor="apellido">Apellido *</label>
                <input
                  type="text"
                  id="apellido"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleChange}
                  className={errores.apellido ? "input-error" : ""}
                  placeholder="Pérez"
                />
                {errores.apellido && (
                  <span className="error-mensaje">{errores.apellido}</span>
                )}
              </div>

              {/* Teléfono */}
              <div className="form-group">
                <label htmlFor="telefono">Teléfono (Argentina) *</label>
                <input
                  type="tel"
                  id="telefono"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  className={errores.telefono ? "input-error" : ""}
                  placeholder="+54 9 387 123-4567"
                />
                {errores.telefono && (
                  <span className="error-mensaje">{errores.telefono}</span>
                )}
              </div>

              {/* Email */}
              <div className="form-group">
                <label htmlFor="email">Correo Electrónico *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errores.email ? "input-error" : ""}
                  placeholder="juan.perez@ejemplo.com"
                />
                {errores.email && (
                  <span className="error-mensaje">{errores.email}</span>
                )}
              </div>

              {/* Info de privacidad */}
              <div className="info-privacidad">
                <p>
                  🔒 Tus datos están protegidos y solo se usarán para confirmar tu reserva
                </p>
              </div>

              {/* Botones */}
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-volver-form"
                  onClick={handleVolver}
                  disabled={enviando}
                >
                  ← Volver
                </button>
                <button
                  type="submit"
                  className="btn-pagar-seña"
                  disabled={enviando}
                >
                  {enviando ? "Procesando..." : `💳 Pagar Seña $${calcularSeña()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}