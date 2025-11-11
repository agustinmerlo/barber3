import React, { useEffect, useState } from "react";

const API_URL = "http://localhost:8000/api";

function Agenda() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [filtroBarbero, setFiltroBarbero] = useState("todos");
  const [barberos, setBarberos] = useState([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargar todas las reservas
      const resReservas = await fetch(`${API_URL}/reservas/`);
      if (!resReservas.ok) throw new Error(`HTTP ${resReservas.status}`);
      const dataReservas = await resReservas.json();
      const todasReservas = Array.isArray(dataReservas) ? dataReservas : dataReservas?.results ?? [];

      // Cargar barberos
      const resBarberos = await fetch(`${API_URL}/barberos/`);
      if (resBarberos.ok) {
        const dataBarberos = await resBarberos.json();
        setBarberos(Array.isArray(dataBarberos) ? dataBarberos : dataBarberos?.results ?? []);
      }

      // Ordenar por fecha/hora (más recientes primero)
      const reservasOrdenadas = todasReservas.sort((a, b) => {
        const [yearA, monthA, dayA] = a.fecha.split('-').map(Number);
        const [hoursA, minutesA] = a.horario.split(':').map(Number);
        const fechaA = new Date(yearA, monthA - 1, dayA, hoursA, minutesA);
        
        const [yearB, monthB, dayB] = b.fecha.split('-').map(Number);
        const [hoursB, minutesB] = b.horario.split(':').map(Number);
        const fechaB = new Date(yearB, monthB - 1, dayB, hoursB, minutesB);
        
        return fechaB - fechaA; // Más recientes primero
      });

      setReservas(reservasOrdenadas);
    } catch (err) {
      console.error("Error cargando datos:", err);
    } finally {
      setLoading(false);
    }
  };

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
    return d.toLocaleDateString("es-ES", { 
      weekday: 'short',
      day: "numeric", 
      month: "short",
      year: 'numeric'
    });
  };

  const esCitaPasada = (fecha, horario) => {
    const [year, month, day] = fecha.split('-').map(Number);
    const [hours, minutes] = horario.split(':').map(Number);
    const fechaReserva = new Date(year, month - 1, day, hours, minutes);
    return fechaReserva < new Date();
  };

  const calcularTotal = (servicios) => {
    if (!servicios || !Array.isArray(servicios)) return 0;
    const total = servicios.reduce((sum, s) => sum + (parseFloat(s.precio) || 0), 0);
    return parseFloat(total.toFixed(2));
  };

  const reservasFiltradas = reservas.filter(reserva => {
    // Filtro por estado
    if (filtroEstado === "pasadas" && !esCitaPasada(reserva.fecha, reserva.horario)) return false;
    if (filtroEstado === "proximas" && esCitaPasada(reserva.fecha, reserva.horario)) return false;
    if (filtroEstado === "confirmadas" && reserva.estado !== "confirmada") return false;
    if (filtroEstado === "canceladas" && reserva.estado !== "cancelada") return false;

    // Filtro por barbero
    if (filtroBarbero !== "todos" && reserva.barbero_nombre !== filtroBarbero) return false;

    return true;
  });

  const getEstadoColor = (estado) => {
    switch(estado) {
      case 'confirmada': return '#4caf50';
      case 'cancelada': return '#f44336';
      case 'pendiente': return '#ff9800';
      default: return '#9e9e9e';
    }
  };

  const getEstadoTexto = (estado) => {
    switch(estado) {
      case 'confirmada': return 'Confirmada';
      case 'cancelada': return 'Cancelada';
      case 'pendiente': return 'Pendiente';
      default: return estado;
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <style>{`
        .agenda-filters {
          display: flex;
          gap: 20px;
          align-items: flex-end;
          margin-bottom: 30px;
          padding: 20px;
          background: #2a2a2a;
          border-radius: 8px;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 200px;
        }

        .filter-group label {
          font-size: 14px;
          color: #ffc107;
          font-weight: 600;
        }

        .filter-group select {
          padding: 10px 15px;
          border: 1px solid #444;
          border-radius: 6px;
          background: #1a1a1a;
          color: #fff;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-group select:hover {
          border-color: #ffc107;
        }

        .filter-group select:focus {
          outline: none;
          border-color: #ffc107;
          box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.1);
        }

        .btn-refrescar {
          padding: 10px 20px;
          background: #ffc107;
          color: #000;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          align-self: flex-end;
        }

        .btn-refrescar:hover {
          background: #ffca28;
          transform: translateY(-1px);
        }

        .loading-agenda,
        .empty-agenda {
          text-align: center;
          padding: 60px 20px;
          color: #aaa;
          font-size: 16px;
        }

        .reservas-lista {
          display: grid;
          gap: 20px;
          margin-bottom: 30px;
        }

        .reserva-card {
          background: #2a2a2a;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s;
          border: 2px solid transparent;
          position: relative;
        }

        .reserva-card.futura {
          border-color: #4caf50;
        }

        .reserva-card.pasada {
          opacity: 0.7;
          border-color: #666;
        }

        .reserva-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
        }

        .reserva-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: rgba(255, 193, 7, 0.05);
          border-bottom: 1px solid #333;
        }

        .reserva-fecha-hora {
          display: flex;
          gap: 20px;
          align-items: center;
        }

        .reserva-fecha-hora .fecha {
          font-size: 16px;
          color: #fff;
          font-weight: 600;
        }

        .reserva-fecha-hora .hora {
          font-size: 20px;
          color: #ffc107;
          font-weight: 700;
        }

        .reserva-estado {
          padding: 6px 16px;
          border-radius: 20px;
          color: white;
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .reserva-body {
          padding: 20px;
        }

        .reserva-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .cliente-nombre {
          font-size: 18px;
          color: #fff;
          margin-bottom: 8px;
        }

        .reserva-detalle {
          font-size: 14px;
          color: #ccc;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .reserva-detalle strong {
          color: #ffc107;
          min-width: 80px;
        }

        .reserva-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background: #666;
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .agenda-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 30px;
        }

        .stat-item {
          background: #2a2a2a;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          border-left: 4px solid #ffc107;
        }

        .stat-item strong {
          display: block;
          font-size: 32px;
          color: #ffc107;
          margin-bottom: 8px;
        }

        .stat-item span {
          color: #aaa;
          font-size: 14px;
        }

        @media (max-width: 768px) {
          .agenda-filters {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-group {
            width: 100%;
          }

          .reserva-fecha-hora {
            flex-direction: column;
            gap: 8px;
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="agenda-filters">
        <div className="filter-group">
          <label>Estado:</label>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="todas">Todas las citas</option>
            <option value="proximas">Próximas</option>
            <option value="pasadas">Pasadas</option>
            <option value="confirmadas">Confirmadas</option>
            <option value="canceladas">Canceladas</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Barbero:</label>
          <select value={filtroBarbero} onChange={(e) => setFiltroBarbero(e.target.value)}>
            <option value="todos">Todos los barberos</option>
            {barberos.map(barbero => (
              <option key={barbero.id} value={barbero.nombre}>
                {barbero.nombre}
              </option>
            ))}
          </select>
        </div>

        <button className="btn-refrescar" onClick={cargarDatos}>
          🔄 Actualizar
        </button>
      </div>

      {loading ? (
        <div className="loading-agenda">Cargando agenda...</div>
      ) : reservasFiltradas.length === 0 ? (
        <div className="empty-agenda">No hay citas que coincidan con los filtros</div>
      ) : (
        <div className="reservas-lista">
          {reservasFiltradas.map((reserva) => {
            const esPasada = esCitaPasada(reserva.fecha, reserva.horario);
            const totalReserva = calcularTotal(reserva.servicios);
            
            return (
              <div key={reserva.id} className={`reserva-card ${esPasada ? 'pasada' : 'futura'}`}>
                <div className="reserva-header">
                  <div className="reserva-fecha-hora">
                    <div className="fecha">{formatearFecha(reserva.fecha)}</div>
                    <div className="hora">{formatearHora(reserva.horario)}</div>
                  </div>
                  <div 
                    className="reserva-estado"
                    style={{ backgroundColor: getEstadoColor(reserva.estado) }}
                  >
                    {getEstadoTexto(reserva.estado)}
                  </div>
                </div>

                <div className="reserva-body">
                  <div className="reserva-info">
                    <strong className="cliente-nombre">
                      {reserva.nombre_cliente} {reserva.apellido_cliente}
                    </strong>
                    <div className="reserva-detalle">
                      👤 <strong>Barbero:</strong> {reserva.barbero_nombre || "Sin asignar"}
                    </div>
                    <div className="reserva-detalle">
                      ✂️ <strong>Servicios:</strong>{" "}
                      {reserva.servicios && reserva.servicios.length > 0
                        ? reserva.servicios.map(s => s.nombre).join(", ")
                        : "Sin servicio"}
                    </div>
                    {totalReserva > 0 && (
                      <div className="reserva-detalle">
                        💰 <strong>Total:</strong> ${totalReserva.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                    )}
                  </div>
                </div>

                {esPasada && (
                  <div className="reserva-badge">Pasada</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="agenda-stats">
        <div className="stat-item">
          <strong>{reservasFiltradas.length}</strong>
          <span>Citas mostradas</span>
        </div>
        <div className="stat-item">
          <strong>{reservas.filter(r => r.estado === 'confirmada').length}</strong>
          <span>Confirmadas</span>
        </div>
        <div className="stat-item">
          <strong>{reservas.filter(r => esCitaPasada(r.fecha, r.horario)).length}</strong>
          <span>Pasadas</span>
        </div>
      </div>
    </div>
  );
}

export default Agenda;