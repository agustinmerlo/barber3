// src/pages/HomeBarbero.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./HomeBarbero.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

const sections = [
  { name: "Agenda", icon: "📅" },
  { name: "Perfil", icon: "👤" },
];

export default function HomeBarbero() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("Agenda");
  const [reservasConfirmadas, setReservasConfirmadas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [userInfo, setUserInfo] = useState(null);

  // ✅ FIX: Obtener info del usuario PRIMERO
  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(`${API_BASE}/api/usuarios/profile/`, {
          headers: {
            "Authorization": `Token ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUserInfo(data);
          localStorage.setItem("userId", data.id);
          console.log("✅ Usuario cargado:", data);
        }
      } catch (err) {
        console.error("❌ Error obteniendo perfil:", err);
      }
    };

    getUserInfo();
  }, []);

  // ✅ FIX: Cargar reservas SOLO cuando userInfo esté disponible
  useEffect(() => {
    if (activeSection !== "Agenda" || !userInfo?.id) {
      return;
    }

    console.log("📅 Cargando reservas INICIAL para barbero ID:", userInfo.id);
    cargarReservasConfirmadas();
  }, [activeSection, userInfo?.id]);

  const cargarReservasConfirmadas = async () => {
    setCargando(true);
    setError("");
    
    try {
      const userId = userInfo?.id || localStorage.getItem("userId");
      
      if (!userId) {
        console.warn("⚠️ No hay userId disponible");
        setCargando(false);
        return;
      }

      console.log(`🔍 Buscando reservas para barbero ID: ${userId}`);
      
      const response = await fetch(`${API_BASE}/api/reservas/?estado=confirmada`);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      const reservas = Array.isArray(data) ? data : data?.results ?? [];
      
      console.log(`📦 Total reservas confirmadas: ${reservas.length}`);
      
      // 🔍 MOSTRAR TODOS LOS barbero_id para debugging
      console.log("🔍 Datos COMPLETOS de reservas:", reservas.map(r => ({
        id: r.id,
        barbero_id: r.barbero_id,
        barbero: r.barbero,
        barbero_nombre: r.barbero_nombre,
        cliente: `${r.nombre_cliente} ${r.apellido_cliente}`,
        fecha: r.fecha,
        estado: r.estado
      })));
      
      // ✅ DOBLE FILTRO: Por barbero_id O por nombre (fallback)
      const nombreBarbero = userInfo?.username || userInfo?.first_name;
      const misReservas = reservas.filter(r => {
        const matchPorId = r.barbero_id === parseInt(userId);
        
        const matchPorNombre = nombreBarbero && (
          r.barbero_nombre?.toLowerCase().includes(nombreBarbero.toLowerCase()) ||
          r.barbero_nombre?.toLowerCase().includes(`${userInfo?.first_name} ${userInfo?.last_name}`.toLowerCase())
        );
        
        const match = matchPorId || matchPorNombre;
        
        console.log(`Reserva #${r.id}: barbero_id=${r.barbero_id}, barbero_nombre="${r.barbero_nombre}", match=${match} (por ID: ${matchPorId}, por nombre: ${matchPorNombre})`);
        
        if (match) {
          console.log(`✅ Reserva #${r.id} coincide con barbero ${userId} (${nombreBarbero})`);
        }
        return match;
      });

      console.log(`🎯 Reservas del barbero: ${misReservas.length}`);

      // Ordenar por fecha y hora
      const reservasOrdenadas = misReservas.sort((a, b) => {
        const fechaA = new Date(`${a.fecha}T${a.horario}`);
        const fechaB = new Date(`${b.fecha}T${b.horario}`);
        return fechaA - fechaB;
      });

      // 🆕 Detectar nuevas reservas
      const cantidadAnterior = reservasConfirmadas.length;
      const cantidadNueva = reservasOrdenadas.length;
      
      if (cantidadNueva > cantidadAnterior && cantidadAnterior > 0) {
        const nuevasReservas = cantidadNueva - cantidadAnterior;
        mostrarNotificacion(`🔔 ¡Tienes ${nuevasReservas} nueva${nuevasReservas > 1 ? 's' : ''} reserva${nuevasReservas > 1 ? 's' : ''}!`);
      }

      setReservasConfirmadas(reservasOrdenadas);
    } catch (err) {
      console.error("❌ Error cargando reservas:", err);
      setError("Error al cargar las reservas");
    } finally {
      setCargando(false);
    }
  };

  // 🆕 Función para mostrar notificaciones
  const mostrarNotificacion = (mensaje) => {
    const notif = document.createElement('div');
    notif.className = 'notificacion-barbero';
    notif.textContent = mensaje;
    document.body.appendChild(notif);

    setTimeout(() => {
      notif.classList.add('fade-out');
      setTimeout(() => notif.remove(), 300);
    }, 5000);

    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjCJ0fPTgjMGGGS37OilUxMNTKXh8bllHgU2j9Xyzn0vBSF7yfLajj0HE2K16+mqWhQKRp/g8r5sIQYwi9Hz04IzBhhkt+zopVMTDUyl4fG5ZR4FNo/V8s59LwUhe8ny2o49BxNitevpqlUUCkef3++6ZyEFM4vS8dSAMAYXY7bs56RREw1PpeDxuGYdBTaP1/HOfC0FJH3I8dmP'); 
      audio.play().catch(() => {});
    } catch (e) {
      // Ignorar error de audio
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    navigate("/");
  };

  // ✅ FIX CRÍTICO: Formatear fecha en zona horaria local (no UTC)
  const formatearFecha = (fecha) => {
    if (!fecha) return "-";
    
    // Parsear manualmente en zona horaria local
    const [year, month, day] = fecha.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    
    if (isNaN(d.getTime())) return fecha;
    
    return d.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
  };

  const formatearHora = (hora) => {
    if (!hora) return "-";
    if (typeof hora !== "string") return String(hora);
    const [h, m] = hora.substring(0, 5).split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  // ✅ FIX CRÍTICO: Comparar fechas en zona horaria local
  const esHoy = (fecha) => {
    if (!fecha) return false;
    
    // Obtener fecha actual en formato YYYY-MM-DD (local)
    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('en-CA'); // Formato YYYY-MM-DD
    
    console.log(`🔍 Comparando: fecha="${fecha}" vs hoy="${hoyStr}"`);
    
    return fecha === hoyStr;
  };

  // ✅ FIX: Comparar fechas en zona horaria local
  const esFutura = (fecha, hora) => {
    if (!fecha || !hora) return false;
    
    // Parsear en zona horaria local (no UTC)
    const [year, month, day] = fecha.split('-').map(Number);
    const [hours, minutes] = hora.split(':').map(Number);
    
    const fechaReserva = new Date(year, month - 1, day, hours, minutes);
    const ahora = new Date();
    
    const resultado = fechaReserva > ahora;
    
    console.log(`⏰ esFutura: ${fecha} ${hora} -> ${resultado} (reserva: ${fechaReserva.toLocaleString()}, ahora: ${ahora.toLocaleString()})`);
    
    return resultado;
  };

  const reservasFuturas = reservasConfirmadas.filter(r => esFutura(r.fecha, r.horario));
  const reservasHoy = reservasFuturas.filter(r => esHoy(r.fecha));

  console.log(`📊 Estadísticas: Total=${reservasConfirmadas.length}, Futuras=${reservasFuturas.length}, Hoy=${reservasHoy.length}`);

  return (
    <div className="home-container">
      <aside className="sidebar">
        <h2 className="brand">Barbería Clase V</h2>
        
        <nav className="menu">
          {sections.map((sec) => (
            <button
              key={sec.name}
              className={`menu-item ${activeSection === sec.name ? "active" : ""}`}
              onClick={() => setActiveSection(sec.name)}
            >
              <span className="icon">{sec.icon}</span>
              {sec.name}
            </button>
          ))}
        </nav>
        
        <button className="logout" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </aside>

      <main className="dashboard">
        <header className="header">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <h1>Agenda</h1>
              {userInfo && (
                <div style={{fontSize: '0.9em', color: '#aaa'}}>
                  Barbero: {userInfo.username} (ID: {userInfo.id})
                </div>
              )}
            </div>
            {/* 🆕 Botón de actualización manual */}
            <button 
              onClick={() => cargarReservasConfirmadas()}
              disabled={cargando}
              style={{
                padding: '8px 16px',
                background: '#ffc107',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🔄 {cargando ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
        </header>

        {activeSection === "Perfil" ? (
          <div className="perfil-section">
            <div className="stat-card">
              <div className="profile-panel-header">
                <div className="avatar large">
                  {userInfo?.username?.charAt(0).toUpperCase() || "B"}
                </div>
                <div className="profile-panel-meta">
                  <strong className="profile-panel-name">
                    {userInfo?.username || "Barbero"}
                  </strong>
                  <span className="profile-panel-role">Barbero</span>
                  <small className="profile-panel-email">
                    {userInfo?.email || "barbero@clasev.com"}
                  </small>
                </div>
              </div>

              <div className="profile-panel-actions">
                <button className="btn-secondary" onClick={() => alert('Editar perfil')}>
                  Editar perfil
                </button>
                <button className="btn-secondary" onClick={() => alert('Configuración')}>
                  Configuración
                </button>
                <button className="btn-danger" onClick={handleLogout}>
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Próximas citas */}
            <div className="appointments-section">
              <h2>Próximas citas</h2>
              {cargando ? (
                <div className="loading">Cargando agenda...</div>
              ) : error ? (
                <div className="error-message">{error}</div>
              ) : reservasHoy.length === 0 ? (
                <div className="empty-state">No tienes citas para hoy</div>
              ) : (
                <div className="appointments-list">
                  {reservasHoy.map((reserva) => (
                    <div key={reserva.id} className="appointment-card">
                      <div className="appointment-time">
                        {formatearHora(reserva.horario)}
                      </div>
                      <div className="appointment-details">
                        <strong>{reserva.nombre_cliente} {reserva.apellido_cliente}</strong>
                        {" - "}
                        {reserva.servicios && reserva.servicios.length > 0 
                          ? reserva.servicios.map(s => s.nombre).join(", ")
                          : "Sin servicio"
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Estadísticas */}
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Citas de hoy</h3>
                <div className="highlight">{reservasHoy.length}</div>
              </div>

              <div className="stat-card">
                <h3>Próximas citas</h3>
                <div className="highlight">{reservasFuturas.length}</div>
              </div>

              <div className="stat-card">
                <h3>Total confirmadas</h3>
                <div className="highlight">{reservasConfirmadas.length}</div>
              </div>
            </div>

            {/* Lista completa de citas futuras */}
            {reservasFuturas.length > 0 && (
              <div className="stat-card">
                <h3 style={{marginBottom: '20px', color: '#ffc107'}}>Todas las citas próximas</h3>
                <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                  {reservasFuturas.map((reserva) => (
                    <li key={reserva.id} style={{
                      padding: '12px 0',
                      borderBottom: '1px solid #333',
                      color: '#ddd'
                    }}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div>
                          <strong style={{color: '#fff'}}>
                            {reserva.nombre_cliente} {reserva.apellido_cliente}
                          </strong>
                          <div style={{fontSize: '0.9em', color: '#aaa', marginTop: '4px'}}>
                            {formatearFecha(reserva.fecha)} - {formatearHora(reserva.horario)}
                          </div>
                        </div>
                        <div style={{
                          background: esHoy(reserva.fecha) ? '#ffc107' : '#2a2a2a',
                          color: esHoy(reserva.fecha) ? '#000' : '#ffc107',
                          padding: '4px 12px',
                          borderRadius: '8px',
                          fontSize: '0.85em',
                          fontWeight: '600'
                        }}>
                          {reserva.servicios && reserva.servicios.length > 0 
                            ? reserva.servicios.map(s => s.nombre).join(", ")
                            : "Sin servicio"
                          }
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}