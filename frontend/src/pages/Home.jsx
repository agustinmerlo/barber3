import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import Perfil from "./Perfil";
import ReservasPendientes from "./ReservasPendientes";
import Agenda from "./Agenda";
import Pagos from "./Pagos";
import MovimientosCaja from "./MovimientosCaja";

const API_URL = "http://localhost:8000/api";

const sections = [
  { name: "Inicio", icon: "🏠" },
  { name: "Pagos", icon: "💰" },
  { name: "Caja", icon: "💵" },
  { name: "Barberos", icon: "✂️" },
  { name: "Servicios", icon: "🧴" },
  { name: "Proveedores", icon: "📦" },
  { name: "Empleados", icon: "👥" },
  { name: "Reservas", icon: "📋" },
  { name: "Agenda", icon: "📅" },
  { name: "Perfil", icon: "👤" },
];

const BellIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 006 14h12a1 1 0 00.707-1.707L18 11.586V8a6 6 0 00-6-6z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M9 18a3 3 0 006 0" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const Home = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("Inicio");
  const [role, setRole] = useState(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("userRole");
    if (storedRole) setRole(storedRole);
  }, []);

  // ✅ Estado para citas dinámicas
  const [citas, setCitas] = useState([]);
  const [loadingCitas, setLoadingCitas] = useState(true);

  const [popularServices, setPopularServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [savingIds, setSavingIds] = useState({});
  const [errorMsg, setErrorMsg] = useState("");

  const [notifications, setNotifications] = useState([
    { id: 1, text: "Nueva cita reservada para 15:30", read: false, time: "hace 2 min" },
    { id: 2, text: "Pago confirmado de Luis Rodríguez", read: false, time: "hace 15 min" },
    { id: 3, text: "Stock bajo: Pomada mate", read: true, time: "hoy 10:05" },
  ]);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef(null);

  // ✅ Cargar servicios
  useEffect(() => {
    const load = async () => {
      setLoadingServices(true);
      setErrorMsg("");
      try {
        const res = await fetch(`${API_URL}/servicios/`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPopularServices(data);
      } catch (err) {
        console.error("Error cargando servicios", err);
        setErrorMsg("No se pudieron cargar los servicios.");
      } finally {
        setLoadingServices(false);
      }
    };
    load();
  }, []);

  // ✅ Cargar próximas citas de TODOS los barberos
  useEffect(() => {
    const cargarCitas = async () => {
      setLoadingCitas(true);
      try {
        const res = await fetch(`${API_URL}/reservas/?estado=confirmada`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        const reservas = Array.isArray(data) ? data : data?.results ?? [];
        
        console.log("📦 Total reservas confirmadas:", reservas.length);
        console.log("🔍 Primeras 3 reservas:", reservas.slice(0, 3).map(r => ({
          id: r.id,
          fecha: r.fecha,
          horario: r.horario,
          cliente: `${r.nombre_cliente} ${r.apellido_cliente}`,
          barbero: r.barbero_nombre
        })));
        
        // Filtrar solo citas futuras
        const ahora = new Date();
        console.log("⏰ Fecha actual:", ahora.toLocaleString());
        
        const citasFuturas = reservas.filter(r => {
          if (!r.fecha || !r.horario) {
            console.log("❌ Reserva sin fecha/horario:", r.id);
            return false;
          }
          const [year, month, day] = r.fecha.split('-').map(Number);
          const [hours, minutes] = r.horario.split(':').map(Number);
          const fechaReserva = new Date(year, month - 1, day, hours, minutes);
          const esFutura = fechaReserva > ahora;
          
          if (!esFutura) {
            console.log(`⏳ Reserva ${r.id} ya pasó: ${fechaReserva.toLocaleString()}`);
          } else {
            console.log(`✅ Reserva ${r.id} es futura: ${fechaReserva.toLocaleString()}`);
          }
          
          return esFutura;
        });

        console.log(`🎯 Reservas futuras encontradas: ${citasFuturas.length}`);

        // Ordenar por fecha/hora más próxima
        const citasOrdenadas = citasFuturas.sort((a, b) => {
          const [yearA, monthA, dayA] = a.fecha.split('-').map(Number);
          const [hoursA, minutesA] = a.horario.split(':').map(Number);
          const fechaA = new Date(yearA, monthA - 1, dayA, hoursA, minutesA);
          
          const [yearB, monthB, dayB] = b.fecha.split('-').map(Number);
          const [hoursB, minutesB] = b.horario.split(':').map(Number);
          const fechaB = new Date(yearB, monthB - 1, dayB, hoursB, minutesB);
          
          return fechaA - fechaB;
        });

        // Tomar solo las primeras 4
        const citasAMostrar = citasOrdenadas.slice(0, 4);
        console.log("📋 Citas a mostrar:", citasAMostrar.length);
        setCitas(citasAMostrar);
      } catch (err) {
        console.error("❌ Error cargando citas:", err);
      } finally {
        setLoadingCitas(false);
      }
    };
    
    if (activeSection === "Inicio") {
      cargarCitas();
    }
  }, [activeSection]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    navigate("/");
  };

  const handleSectionClick = (section) => {
    setActiveSection(section.name);

    // ✅ NAVEGACIÓN PARA BARBEROS
    if (section.name === "Barberos") {
      if (role === "admin") {
        navigate("/barbers");
      } else {
        alert("Solo los administradores pueden acceder a esta sección.");
      }
      return;
    }

    // ✅ NAVEGACIÓN PARA SERVICIOS
    if (section.name === "Servicios") {
      if (role === "admin") {
        navigate("/services-admin");
      } else {
        alert("Solo los administradores pueden acceder a esta sección.");
      }
      return;
    }

    // ✅ NAVEGACIÓN PARA PROVEEDORES
    if (section.name === "Proveedores") {
      if (role === "admin") {
        navigate("/proveedores");
      } else {
        alert("Solo los administradores pueden acceder a esta sección.");
      }
      return;
    }

    // ✅ NAVEGACIÓN PARA EMPLEADOS
    if (section.name === "Empleados") {
      if (role === "admin") {
        navigate("/empleados");
      } else {
        alert("Solo los administradores pueden acceder a esta sección.");
      }
      return;
    }
  };

  const updateServiceValue = async (id, newValue) => {
    const num = Number(newValue);
    setPopularServices((prev) => prev.map((s) => (s.id === id ? { ...s, value: num } : s)));
    setSavingIds((p) => ({ ...p, [id]: true }));
    setErrorMsg("");

    try {
      const res = await fetch(`${API_URL}/servicios/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: num }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error("Error guardando servicio", err);
      setErrorMsg("No se pudo guardar el cambio.");
      try {
        const r = await fetch(`${API_URL}/servicios/`);
        const data = await r.json();
        setPopularServices(data);
      } catch (_) {}
    } finally {
      setSavingIds((p) => ({ ...p, [id]: false }));
    }
  };

  // ✅ Funciones auxiliares para formatear
  const formatearHora = (hora) => {
    if (!hora) return "-";
    const [h, m] = hora.substring(0, 5).split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "-";
    const [year, month, day] = fecha.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    if (isNaN(d.getTime())) return fecha;
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const Header = () => (
    <header className="header">
      <h1>{activeSection}</h1>
      <div className="topbar-actions">
        <div className="notif-wrapper" ref={notifRef}>
          <button className="icon-button" aria-label="Notificaciones" onClick={() => setShowNotif((v) => !v)}>
            <BellIcon className="icon" />
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>

          {showNotif && (
            <div className="dropdown notif-dropdown">
              <div className="dropdown-header">
                <span>Notificaciones</span>
                <button className="link-btn" onClick={markAllAsRead}>Marcar todo leído</button>
              </div>

              {notifications.length === 0 ? (
                <div className="empty">Sin notificaciones</div>
              ) : (
                <ul className="notif-list">
                  {notifications.map((n) => (
                    <li key={n.id} className={`notif-item ${n.read ? "" : "unread"}`}>
                      <div className="notif-text">
                        <p>{n.text}</p>
                        <small>{n.time}</small>
                      </div>
                      <button className="clear-btn" onClick={() => removeNotification(n.id)}>×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );

  return (
    <div className="home-container">
      <aside className="sidebar">
        <h2 className="brand">Barbería Clase V</h2>
        <nav className="menu">
          {sections.map((sec) => (
            <button
              key={sec.name}
              className={`menu-item ${activeSection === sec.name ? "active" : ""}`}
              onClick={() => handleSectionClick(sec)}
            >
              <span className="icon">{sec.icon}</span>
              {sec.name}
            </button>
          ))}
        </nav>
        <button className="logout" onClick={handleLogout}>Cerrar sesión</button>
      </aside>

      <main className="dashboard">
        <Header />

        {activeSection === "Reservas" ? (
          <ReservasPendientes />
        ) : activeSection === "Pagos" ? (
          <Pagos />
        ) : activeSection === "Caja" ? (
          <MovimientosCaja />
        ) : activeSection === "Agenda" ? (
          <Agenda />
        ) : activeSection === "Perfil" ? (
          <div className="stats-grid">
            <Perfil
              admin={{ name: "Administrador", email: "admin@barberia.com" }}
              onLogout={handleLogout}
              asCard
            />
          </div>
        ) : (
          <>
            <section className="appointments-section">
              <h2>Próximas citas</h2>
              
              {loadingCitas ? (
                <div style={{padding: '20px', textAlign: 'center', color: '#aaa'}}>
                  Cargando citas...
                </div>
              ) : citas.length === 0 ? (
                <div style={{padding: '20px', textAlign: 'center', color: '#aaa'}}>
                  No hay citas próximas
                </div>
              ) : (
                <div className="appointments-list">
                  {citas.map((cita) => (
                    <div key={cita.id} className="appointment-card">
                      <div className="appointment-time">
                        {formatearHora(cita.horario)}
                        <small style={{display: 'block', fontSize: '0.7em', color: '#888', marginTop: '2px'}}>
                          {formatearFecha(cita.fecha)}
                        </small>
                      </div>
                      <div className="appointment-details">
                        <strong>{cita.nombre_cliente} {cita.apellido_cliente}</strong>
                        {" - "}
                        {cita.servicios && cita.servicios.length > 0 
                          ? cita.servicios.map(s => s.nombre).join(", ")
                          : "Sin servicio"
                        }
                        <div style={{fontSize: '0.85em', color: '#ffc107', marginTop: '4px'}}>
                          👤 {cita.barbero_nombre || "Sin asignar"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="stats-grid">
              <div className="stat-card">
                <h3>Ingresos de hoy</h3>
                <p className="highlight">$35.000</p>
              </div>

              <div className="stat-card">
                <h3>Citas completadas</h3>
                <p className="highlight">7</p>
              </div>

              <div className="stat-card">
                <h3>Servicios más populares</h3>

                {loadingServices ? (
                  <p>Cargando…</p>
                ) : errorMsg ? (
                  <p className="api-error">{errorMsg}</p>
                ) : (
                  <ul className="services-list">
                    {popularServices.slice(0, 5).map((s) => (
                      <li key={s.id} className={`service-item ${savingIds[s.id] ? "saving" : ""}`}>
                        <div className="service-header">
                          <span className="service-name">{s.nombre}</span>
                          <span className="service-value">
                            ${s.precio}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Home;