// src/pages/PagoTransferencia.jsx
import React, { useState } from "react";
import "./pagoTransferencia.css";

export default function PagoTransferencia() {
  const [reserva] = useState(() => {
    const stored = localStorage.getItem('reservaConfirmacion');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Error parsing reserva:', e);
      }
    }
    return null;
  });

  const [clienteData] = useState(() => {
    const stored = localStorage.getItem('clienteData');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Error parsing cliente:', e);
      }
    }
    return null;
  });

  const [comprobante, setComprobante] = useState(null);
  const [previsualizacion, setPrevisualizacion] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState("");
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  // Datos bancarios
  const datosBancarios = {
    banco: "Banco Macro",
    titular: "Barbería Clase V S.A.",
    tipoCuenta: "Cuenta Corriente",
    numeroCuenta: "1234567890",
    cbu: "0000123456789012345678",
    alias: "CLASEV.BARBER",
  };

  const calcularSeña = () => {
    if (!reserva) return 0;
    return Math.round(reserva.total * 0.3);
  };

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

  const handleCopiar = (texto, campo) => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(campo);
      setTimeout(() => setCopiado(""), 2000);
    });
  };

  const handleArchivoChange = (e) => {
    const archivo = e.target.files[0];
    if (archivo) {
      // Validar que sea una imagen
      if (!archivo.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido');
        return;
      }

      // Validar tamaño (máx 5MB)
      if (archivo.size > 5 * 1024 * 1024) {
        alert('El archivo es muy grande. Máximo 5MB');
        return;
      }

      setComprobante(archivo);

      // Crear previsualización
      const reader = new FileReader();
      reader.onloadend = () => {
        setPrevisualizacion(reader.result);
      };
      reader.readAsDataURL(archivo);
    }
  };

  const handleEliminarComprobante = () => {
    setComprobante(null);
    setPrevisualizacion(null);
  };

  const handleEnviarComprobante = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!comprobante) {
      alert('Por favor adjunta el comprobante de transferencia');
      return;
    }

    if (!reserva || !clienteData) {
      alert('❌ Faltan datos de la reserva. Por favor vuelve a empezar.');
      return;
    }

    // Validar que reserva tenga todos los campos necesarios
    if (!reserva.fecha || !reserva.horario || !reserva.barbero || !reserva.servicios || !reserva.total) {
      console.error('Datos de reserva incompletos:', reserva);
      alert('❌ Los datos de la reserva están incompletos. Por favor vuelve a empezar.');
      return;
    }

    setEnviando(true);

    try {
      const formData = new FormData();
      
      // ✅ CRÍTICO: Orden y estructura exacta que espera el backend
      
      // 1. Datos de la reserva (JSON string)
      formData.append('reserva', JSON.stringify({
        fecha: reserva.fecha,
        horario: reserva.horario,
        barbero: {
          id: reserva.barbero.id || reserva.barbero.barbero_id,
          nombre: reserva.barbero.nombre || reserva.barbero.barbero_nombre
        },
        servicios: reserva.servicios,
        total: Number(reserva.total),
        duracionTotal: Number(reserva.duracionTotal || reserva.duracion_total || 0)
      }));
      
      // 2. Datos del cliente (JSON string)
      formData.append('cliente', JSON.stringify({
        nombre: clienteData.nombre,
        apellido: clienteData.apellido,
        telefono: clienteData.telefono,
        email: clienteData.email
      }));
      
      // 3. Archivo del comprobante
      formData.append('comprobante', comprobante);
      
      // 4. Monto de la seña
      formData.append('monto', calcularSeña().toString());

      // ✅ DEBUG: Ver qué se está enviando
      console.log('📤 Enviando al backend:');
      console.log('  - Reserva:', JSON.parse(formData.get('reserva')));
      console.log('  - Cliente:', JSON.parse(formData.get('cliente')));
      console.log('  - Monto:', formData.get('monto'));
      console.log('  - Comprobante:', comprobante.name);

      const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";
      const response = await fetch(`${API_BASE}/api/reservas/crear/`, {
        method: 'POST',
        body: formData
        // ⚠️ NO incluir headers de Content-Type, FormData lo maneja automáticamente
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Respuesta exitosa:', data);
        
        // Guardar ID de reserva para seguimiento
        localStorage.setItem('reservaId', data.id);
        
        // Mostrar modal de confirmación
        setMostrarConfirmacion(true);
        
        // Limpiar datos después de 3 segundos
        setTimeout(() => {
          localStorage.removeItem('reservaConfirmacion');
          localStorage.removeItem('serviciosReserva');
          localStorage.removeItem('clienteData');
        }, 3000);
        
      } else {
        // Mostrar el error exacto del backend
        console.error('❌ Error del servidor:', data);
        throw new Error(data.error || 'Error al enviar el comprobante');
      }
    } catch (error) {
      console.error('❌ Error completo:', error);
      alert(`❌ Hubo un error al enviar el comprobante. Por favor intenta nuevamente.\n\nDetalle: ${error.message}`);
      setEnviando(false);
    }
  };

  const handleCerrarConfirmacion = () => {
    setMostrarConfirmacion(false);
    window.location.href = '/cliente';
  };

  if (!reserva) {
    return (
      <div className="pago-page">
        <div className="error-container">
          <h2>❌ No se encontró información de la reserva</h2>
          <p>Por favor, vuelve a empezar el proceso de reserva.</p>
          <button onClick={() => window.location.href = '/reservar'}>
            Volver a reservar
          </button>
        </div>
      </div>
    );
  }

  if (!clienteData) {
    return (
      <div className="pago-page">
        <div className="error-container">
          <h2>❌ No se encontró información del cliente</h2>
          <p>Por favor, vuelve a completar tus datos.</p>
          <button onClick={() => window.history.back()}>
            Volver atrás
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pago-page">
      {/* HEADER */}
      <header className="pago-header">
        <div className="nav">
          <div className="logo">CLASE V</div>
          <nav>
            <a href="/cliente">Inicio</a>
            <a href="/servicios">Servicios</a>
            <a href="#barberos">Barberos</a>
            <a href="#contactos">Contactos</a>
          </nav>
        </div>
        <h1>Pago de Seña</h1>
      </header>

      <main className="pago-content">
        <div className="pago-split">
          {/* IZQUIERDA: DATOS BANCARIOS */}
          <div className="datos-bancarios-container">
            <div className="instrucciones-pago">
              <h2>💳 Instrucciones de Pago</h2>
              <p>Realiza la transferencia por <strong>${calcularSeña()}</strong> a la siguiente cuenta:</p>
            </div>

            <div className="datos-bancarios">
              <h3>Datos Bancarios</h3>
              
              <div className="dato-item">
                <span className="dato-label">🏦 Banco:</span>
                <div className="dato-valor-container">
                  <span className="dato-valor">{datosBancarios.banco}</span>
                </div>
              </div>

              <div className="dato-item">
                <span className="dato-label">👤 Titular:</span>
                <div className="dato-valor-container">
                  <span className="dato-valor">{datosBancarios.titular}</span>
                </div>
              </div>

              <div className="dato-item">
                <span className="dato-label">📌 Tipo de Cuenta:</span>
                <div className="dato-valor-container">
                  <span className="dato-valor">{datosBancarios.tipoCuenta}</span>
                </div>
              </div>

              <div className="dato-item">
                <span className="dato-label">🔢 N° de Cuenta:</span>
                <div className="dato-valor-container">
                  <span className="dato-valor">{datosBancarios.numeroCuenta}</span>
                  <button 
                    className="btn-copiar"
                    onClick={() => handleCopiar(datosBancarios.numeroCuenta, 'cuenta')}
                  >
                    {copiado === 'cuenta' ? '✓' : '📋'}
                  </button>
                </div>
              </div>

              <div className="dato-item destacado">
                <span className="dato-label">🔑 CBU:</span>
                <div className="dato-valor-container">
                  <span className="dato-valor">{datosBancarios.cbu}</span>
                  <button 
                    className="btn-copiar"
                    onClick={() => handleCopiar(datosBancarios.cbu, 'cbu')}
                  >
                    {copiado === 'cbu' ? '✓' : '📋'}
                  </button>
                </div>
              </div>

              <div className="dato-item destacado">
                <span className="dato-label">✨ Alias:</span>
                <div className="dato-valor-container">
                  <span className="dato-valor">{datosBancarios.alias}</span>
                  <button 
                    className="btn-copiar"
                    onClick={() => handleCopiar(datosBancarios.alias, 'alias')}
                  >
                    {copiado === 'alias' ? '✓' : '📋'}
                  </button>
                </div>
              </div>
            </div>

            <div className="monto-transferir">
              <h3>Monto a Transferir</h3>
              <p className="monto-grande">${calcularSeña()}</p>
              <p className="monto-detalle">
                Seña del 30% • Resto en efectivo: ${reserva.total - calcularSeña()}
              </p>
            </div>

            {/* RESUMEN BREVE */}
            <div className="resumen-breve">
              <h3>📋 Resumen de tu Reserva</h3>
              <div className="resumen-linea">
                <span>Fecha:</span>
                <strong>{formatearFecha(reserva.fecha)}</strong>
              </div>
              <div className="resumen-linea">
                <span>Horario:</span>
                <strong>{reserva.horario}</strong>
              </div>
              <div className="resumen-linea">
                <span>Barbero:</span>
                <strong>{reserva.barbero?.nombre}</strong>
              </div>
              <div className="resumen-linea">
                <span>Servicios:</span>
                <strong>{reserva.servicios?.length}</strong>
              </div>
            </div>
          </div>

          {/* DERECHA: SUBIR COMPROBANTE */}
          <div className="subir-comprobante-container">
            <h2>📸 Adjuntar Comprobante</h2>
            <p className="comprobante-instruccion">
              Una vez realizada la transferencia, adjunta el comprobante aquí
            </p>

            <form onSubmit={handleEnviarComprobante} className="form-comprobante">
              <div className="upload-area">
                {!previsualizacion ? (
                  <label htmlFor="file-upload" className="upload-label">
                    <div className="upload-icon">📷</div>
                    <p className="upload-texto">
                      Click para seleccionar imagen
                    </p>
                    <p className="upload-hint">
                      Formatos: JPG, PNG • Máx 5MB
                    </p>
                    <input
                      id="file-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleArchivoChange}
                      className="file-input"
                    />
                  </label>
                ) : (
                  <div className="preview-container">
                    <img 
                      src={previsualizacion} 
                      alt="Comprobante" 
                      className="preview-imagen"
                    />
                    <button
                      type="button"
                      className="btn-eliminar-preview"
                      onClick={handleEliminarComprobante}
                    >
                      ✕ Eliminar
                    </button>
                  </div>
                )}
              </div>

              {comprobante && (
                <div className="archivo-seleccionado">
                  <span className="archivo-nombre">📎 {comprobante.name}</span>
                  <span className="archivo-tamaño">
                    {(comprobante.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              )}

              <div className="info-importante">
                <h4>⚠️ Importante:</h4>
                <ul>
                  <li>Asegúrate de que el comprobante sea legible</li>
                  <li>Debe mostrar claramente el monto transferido</li>
                  <li>Tu reserva se confirmará en las próximas horas</li>
                  <li>Recibirás un email de confirmación</li>
                </ul>
              </div>

              <div className="form-buttons">
                <button
                  type="button"
                  className="btn-volver-pago"
                  onClick={() => window.history.back()}
                  disabled={enviando}
                >
                  ← Volver
                </button>
                <button
                  type="submit"
                  className="btn-confirmar-pago"
                  disabled={!comprobante || enviando}
                >
                  {enviando ? "Enviando..." : "✓ Confirmar Pago"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* MODAL DE CONFIRMACIÓN MEJORADO */}
      {mostrarConfirmacion && (
        <div className="modal-overlay-success">
          <div className="modal-confirmacion-success">
            {/* Animación de éxito */}
            <div className="success-animation">
              <div className="success-circle">
                <div className="success-checkmark">✓</div>
              </div>
              <div className="success-particles">
                <span className="particle"></span>
                <span className="particle"></span>
                <span className="particle"></span>
                <span className="particle"></span>
              </div>
            </div>

            <h2 className="success-title">¡Comprobante Enviado!</h2>
            <p className="success-subtitle">
              Tu reserva está siendo procesada por nuestro equipo
            </p>

            {/* Resumen de la reserva */}
            <div className="reserva-summary">
              <div className="summary-header">
                <span className="summary-icon">📋</span>
                <h3>Resumen de tu Reserva</h3>
              </div>
              <div className="summary-content">
                <div className="summary-row">
                  <span className="summary-label">Fecha</span>
                  <strong>{formatearFecha(reserva.fecha)}</strong>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Horario</span>
                  <strong>{reserva.horario}</strong>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Barbero</span>
                  <strong>{reserva.barbero?.nombre}</strong>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Seña pagada</span>
                  <strong className="price">${calcularSeña()}</strong>
                </div>
              </div>
            </div>

            {/* Información de contacto */}
            <div className="contact-info-grid">
              <div className="contact-card">
                <div className="contact-icon email">📧</div>
                <p className="contact-title">Email de confirmación</p>
                <strong className="contact-value">{clienteData?.email}</strong>
              </div>
              <div className="contact-card">
                <div className="contact-icon whatsapp">📱</div>
                <p className="contact-title">WhatsApp</p>
                <strong className="contact-value">{clienteData?.telefono}</strong>
              </div>
            </div>

            {/* Tiempo de verificación */}
            <div className="verification-timeline">
              <div className="timeline-item active">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <strong>Comprobante recibido</strong>
                  <span>Ahora mismo</span>
                </div>
              </div>
              <div className="timeline-line"></div>
              <div className="timeline-item pending">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <strong>Verificación</strong>
                  <span>En las próximas 24 horas</span>
                </div>
              </div>
              <div className="timeline-line"></div>
              <div className="timeline-item pending">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <strong>Confirmación final</strong>
                  <span>Recibirás email y WhatsApp</span>
                </div>
              </div>
            </div>

            {/* Botón de cierre */}
            <button 
              className="btn-entendido"
              onClick={handleCerrarConfirmacion}
            >
              Entendido, ir a mi cuenta
            </button>

            <p className="modal-footer-note">
              💡 Podrás ver el estado de tu reserva en "Mis Reservas"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}