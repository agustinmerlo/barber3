import React, { useEffect, useState } from "react";

const API_URL = "http://localhost:8000/api/caja";

const MovimientosCaja = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroMetodo, setFiltroMetodo] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [movimientoEditar, setMovimientoEditar] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Estados para gestión de turnos
  const [turnoActivo, setTurnoActivo] = useState(null);
  const [modalApertura, setModalApertura] = useState(false);
  const [modalCierre, setModalCierre] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(false);
  const [montoApertura, setMontoApertura] = useState("");
  const [montoCierre, setMontoCierre] = useState("");
  const [observacionesCierre, setObservacionesCierre] = useState("");
  const [historialTurnos, setHistorialTurnos] = useState([]);

  // Formulario
  const [formData, setFormData] = useState({
    tipo: "ingreso",
    monto: "",
    descripcion: "",
    metodo_pago: "efectivo",
    categoria: "servicios",
    fecha: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    verificarTurnoActivo();
    cargarMovimientos();
  }, []);

  const verificarTurnoActivo = async () => {
    try {
      const res = await fetch(`${API_URL}/turnos/turno_activo/`);
      const data = await res.json();
      
      if (data.existe) {
        setTurnoActivo(data.turno);
      }
    } catch (err) {
      console.error("Error verificando turno:", err);
    }
  };

  const cargarMovimientos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/movimientos/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      const todosMovimientos = Array.isArray(data) ? data : data?.results ?? [];
      
      const movimientosOrdenados = todosMovimientos.sort((a, b) => {
        const fechaA = new Date(a.fecha + 'T' + (a.hora || '00:00:00'));
        const fechaB = new Date(b.fecha + 'T' + (b.hora || '00:00:00'));
        return fechaB - fechaA;
      });

      setMovimientos(movimientosOrdenados);
    } catch (err) {
      console.error("Error cargando movimientos:", err);
    } finally {
      setLoading(false);
    }
  };

  const abrirCaja = async () => {
    if (!montoApertura || parseFloat(montoApertura) < 0) {
      alert("Ingresa un monto de apertura válido");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/turnos/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto_apertura: parseFloat(montoApertura)
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setTurnoActivo(data);
      setModalApertura(false);
      setMontoApertura("");
      
      alert("✅ Caja abierta exitosamente");
      cargarMovimientos();
    } catch (err) {
      console.error("Error abriendo caja:", err);
      alert("❌ Error al abrir la caja");
    }
  };

  const prepararCierreCaja = () => {
    if (!turnoActivo) return;
    
    // Pre-cargar el efectivo esperado
    setMontoCierre(turnoActivo.efectivo_esperado?.toString() || "0");
    setModalCierre(true);
  };

  const cerrarCaja = async () => {
    if (!montoCierre || parseFloat(montoCierre) < 0) {
      alert("❌ Ingresa un monto de cierre válido");
      return;
    }

    if (!turnoActivo) {
      alert("❌ No hay turno activo para cerrar");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/turnos/${turnoActivo.id}/cerrar/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto_cierre: parseFloat(montoCierre),
          observaciones: observacionesCierre
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const turnoCerrado = data.turno;

      setTurnoActivo(null);
      setModalCierre(false);
      setMontoCierre("");
      setObservacionesCierre("");

      // Mostrar resumen
      const diferencia = turnoCerrado.diferencia;
      const mensaje = `✅ Caja cerrada exitosamente

💰 Efectivo esperado: $${parseFloat(turnoCerrado.efectivo_esperado).toLocaleString('es-AR', {minimumFractionDigits: 2})}
💵 Efectivo contado: $${parseFloat(turnoCerrado.monto_cierre).toLocaleString('es-AR', {minimumFractionDigits: 2})}
${diferencia >= 0 ? '✅' : '⚠️'} Diferencia: $${Math.abs(diferencia).toLocaleString('es-AR', {minimumFractionDigits: 2})} ${diferencia >= 0 ? '(Sobrante)' : '(Faltante)'}`;
      
      alert(mensaje);
      cargarMovimientos();
    } catch (err) {
      console.error("Error cerrando caja:", err);
      alert("❌ Error al cerrar la caja");
    }
  };

  const cargarHistorial = async () => {
    try {
      const res = await fetch(`${API_URL}/turnos/historial/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      setHistorialTurnos(data.turnos || []);
      setModalHistorial(true);
    } catch (err) {
      console.error("Error cargando historial:", err);
      alert("❌ Error al cargar el historial");
    }
  };

  const abrirModalNuevo = () => {
    if (!turnoActivo) {
      alert("❌ Debes abrir la caja antes de registrar movimientos");
      return;
    }
    setModoEdicion(false);
    setMovimientoEditar(null);
    setFormData({
      tipo: "ingreso",
      monto: "",
      descripcion: "",
      metodo_pago: "efectivo",
      categoria: "servicios",
      fecha: new Date().toISOString().split('T')[0]
    });
    setModalAbierto(true);
  };

  const abrirModalEditar = (movimiento) => {
    if (!movimiento.es_editable) {
      alert("⚠️ Este movimiento no puede ser editado porque pertenece a un turno cerrado");
      return;
    }

    setModoEdicion(true);
    setMovimientoEditar(movimiento);
    setFormData({
      tipo: movimiento.tipo,
      monto: movimiento.monto.toString(),
      descripcion: movimiento.descripcion || "",
      metodo_pago: movimiento.metodo_pago || "efectivo",
      categoria: movimiento.categoria || "servicios",
      fecha: movimiento.fecha
    });
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setModoEdicion(false);
    setMovimientoEditar(null);
    setFormData({
      tipo: "ingreso",
      monto: "",
      descripcion: "",
      metodo_pago: "efectivo",
      categoria: "servicios",
      fecha: new Date().toISOString().split('T')[0]
    });
  };

  const guardarMovimiento = async () => {
    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      alert("❌ Ingresa un monto válido");
      return;
    }

    if (!formData.descripcion.trim()) {
      alert("❌ Ingresa una descripción");
      return;
    }

    setGuardando(true);
    try {
      const body = {
        ...formData,
        monto: parseFloat(formData.monto)
      };

      const url = modoEdicion 
        ? `${API_URL}/movimientos/${movimientoEditar.id}/`
        : `${API_URL}/movimientos/`;
      
      const method = modoEdicion ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      alert(`✅ Movimiento ${modoEdicion ? "actualizado" : "registrado"} exitosamente`);
      cerrarModal();
      cargarMovimientos();
      verificarTurnoActivo(); // Actualizar turno
    } catch (err) {
      console.error("Error guardando movimiento:", err);
      alert(err.message || "❌ Error al guardar el movimiento");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarMovimiento = async (id, esEditable) => {
    if (!esEditable) {
      alert("⚠️ Este movimiento no puede ser eliminado porque pertenece a un turno cerrado");
      return;
    }

    if (!window.confirm("⚠️ ¿Estás seguro de eliminar este movimiento?")) return;

    try {
      const res = await fetch(`${API_URL}/movimientos/${id}/`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      alert("✅ Movimiento eliminado exitosamente");
      cargarMovimientos();
      verificarTurnoActivo();
    } catch (err) {
      console.error("Error eliminando movimiento:", err);
      alert(err.message || "❌ Error al eliminar el movimiento");
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "-";
    const [year, month, day] = fecha.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    if (isNaN(d.getTime())) return fecha;
    return d.toLocaleDateString("es-ES", { 
      day: "2-digit", 
      month: "short",
      year: "numeric"
    });
  };

  const formatearHora = (hora) => {
    if (!hora) return "";
    const [h, m] = hora.substring(0, 5).split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  const formatearFechaHora = (fechaISO) => {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Filtros
  const movimientosFiltrados = movimientos.filter(m => {
    if (filtroTipo !== "todos" && m.tipo !== filtroTipo) return false;
    if (filtroMetodo !== "todos" && m.metodo_pago !== filtroMetodo) return false;
    if (filtroCategoria !== "todos" && m.categoria !== filtroCategoria) return false;
    if (fechaDesde && m.fecha < fechaDesde) return false;
    if (fechaHasta && m.fecha > fechaHasta) return false;
    return true;
  });

  // Estadísticas
  const totalIngresos = movimientos
    .filter(m => m.tipo === "ingreso")
    .reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);

  const totalEgresos = movimientos
    .filter(m => m.tipo === "egreso")
    .reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);

  const saldoCaja = totalIngresos - totalEgresos;

  const totalIngresosFiltrados = movimientosFiltrados
    .filter(m => m.tipo === "ingreso")
    .reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);

  const totalEgresosFiltrados = movimientosFiltrados
    .filter(m => m.tipo === "egreso")
    .reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);

  const getTipoIcon = (tipo) => {
    return tipo === "ingreso" ? "📈" : "📉";
  };

  const getTipoColor = (tipo) => {
    return tipo === "ingreso" ? "#4caf50" : "#f44336";
  };

  const getMetodoIcon = (metodo) => {
    const iconos = {
      efectivo: "💵",
      tarjeta: "💳",
      transferencia: "🏦",
      mercadopago: "📱"
    };
    return iconos[metodo] || "💰";
  };

  const getCategoriaIcon = (categoria) => {
    const iconos = {
      servicios: "✂️",
      productos: "🛍️",
      gastos: "📊",
      sueldos: "👨‍💼",
      alquiler: "🏢",
      servicios_publicos: "💡",
      otros: "📌"
    };
    return iconos[categoria] || "📌";
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#121212', minHeight: '100vh', color: '#fff' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
        <h2 style={{ margin: 0 }}>💰 Movimientos de Caja</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {!turnoActivo ? (
            <button 
              style={{ padding: '12px 24px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              onClick={() => setModalApertura(true)}
            >
              🔓 Abrir Caja
            </button>
          ) : (
            <>
              <button 
                style={{ padding: '12px 24px', background: '#f44336', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                onClick={prepararCierreCaja}
              >
                🔒 Cerrar Caja
              </button>
              <button 
                style={{ padding: '12px 24px', background: '#ffc107', color: '#000', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                onClick={abrirModalNuevo}
              >
                ➕ Nuevo Movimiento
              </button>
            </>
          )}
          <button 
            style={{ padding: '12px 24px', background: '#2196f3', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
            onClick={cargarHistorial}
          >
            📋 Historial
          </button>
        </div>
      </div>

      {/* Estado de Caja */}
      {turnoActivo ? (
        <div style={{ background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)', padding: '20px', borderRadius: '12px', border: '2px solid #4caf50', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ background: 'rgba(76, 175, 80, 0.2)', color: '#4caf50', padding: '8px 16px', borderRadius: '20px', fontWeight: '700', fontSize: '14px', display: 'inline-block', marginBottom: '8px' }}>
                🟢 Caja Abierta
              </div>
              <div style={{ color: '#aaa', fontSize: '14px' }}>Abierta el: {formatearFechaHora(turnoActivo.fecha_apertura)}</div>
              <div style={{ color: '#aaa', fontSize: '14px' }}>Monto inicial: ${parseFloat(turnoActivo.monto_apertura).toLocaleString('es-AR', {minimumFractionDigits: 2})}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#aaa', fontSize: '14px', marginBottom: '4px' }}>Efectivo en Caja</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#4caf50' }}>
                ${parseFloat(turnoActivo.efectivo_esperado || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)', padding: '20px', borderRadius: '12px', border: '2px solid #f44336', marginBottom: '20px' }}>
          <div style={{ background: 'rgba(244, 67, 54, 0.2)', color: '#f44336', padding: '8px 16px', borderRadius: '20px', fontWeight: '700', fontSize: '14px', display: 'inline-block', marginBottom: '8px' }}>
            🔴 Caja Cerrada
          </div>
          <div style={{ color: '#aaa', fontSize: '14px' }}>Debes abrir la caja para comenzar a operar</div>
        </div>
      )}

      {/* Estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)', padding: '24px', borderRadius: '12px', borderLeft: '4px solid #4caf50' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📈</div>
          <div style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px' }}>Total Ingresos</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#4caf50' }}>
            ${totalIngresos.toLocaleString('es-AR', {minimumFractionDigits: 2})}
          </div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)', padding: '24px', borderRadius: '12px', borderLeft: '4px solid #f44336' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📉</div>
          <div style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px' }}>Total Egresos</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#f44336' }}>
            ${totalEgresos.toLocaleString('es-AR', {minimumFractionDigits: 2})}
          </div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)', padding: '24px', borderRadius: '12px', borderLeft: '4px solid #ffc107' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>💰</div>
          <div style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px' }}>Saldo en Caja</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: saldoCaja >= 0 ? '#ffc107' : '#f44336' }}>
            ${saldoCaja.toLocaleString('es-AR', {minimumFractionDigits: 2})}
          </div>
        </div>
      </div>

      {/* Lista de Movimientos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>Cargando movimientos...</div>
      ) : movimientos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
          <p>No hay movimientos registrados</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {movimientos.map(mov => (
            <div key={mov.id} style={{ background: '#2a2a2a', borderRadius: '12px', overflow: 'hidden', border: `2px solid ${mov.es_editable ? '#333' : '#666'}`, opacity: mov.es_editable ? 1 : 0.7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'rgba(255, 193, 7, 0.05)', position: 'relative' }}>
                {!mov.es_editable && (
                  <div style={{ position: 'absolute', top: '8px', right: '8px', background: '#666', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                    🔒 CERRADO
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', fontWeight: '600', fontSize: '14px', color: 'white', background: getTipoColor(mov.tipo) }}>
                  <span>{getTipoIcon(mov.tipo)}</span>
                  <span>{mov.tipo === "ingreso" ? "INGRESO" : "EGRESO"}</span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: getTipoColor(mov.tipo) }}>
                  {mov.tipo === "ingreso" ? "+" : "-"}${parseFloat(mov.monto).toLocaleString('es-AR', {minimumFractionDigits: 2})}
                </div>
              </div>
              
              <div style={{ padding: '20px', display: 'grid', gap: '12px' }}>
                {mov.descripcion && (
                  <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '8px', color: '#ccc', fontSize: '14px', borderLeft: '3px solid #ffc107' }}>
                    {mov.descripcion}
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                  <span style={{ color: '#aaa', fontSize: '14px' }}>{getCategoriaIcon(mov.categoria)} Categoría</span>
                  <span style={{ color: '#fff', fontWeight: '600' }}>{mov.categoria || "Sin categoría"}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                  <span style={{ color: '#aaa', fontSize: '14px' }}>{getMetodoIcon(mov.metodo_pago)} Método</span>
                  <span style={{ color: '#fff', fontWeight: '600' }}>{mov.metodo_pago || "No especificado"}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                  <span style={{ color: '#aaa', fontSize: '14px' }}>📅 Fecha</span>
                  <span style={{ color: '#fff', fontWeight: '600' }}>
                    {formatearFecha(mov.fecha)} {mov.hora && formatearHora(mov.hora)}
                  </span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', padding: '16px 20px', background: '#1a1a1a', borderTop: '1px solid #333' }}>
                <button 
                  style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: mov.es_editable ? 'pointer' : 'not-allowed', background: '#2196f3', color: 'white', opacity: mov.es_editable ? 1 : 0.5 }}
                  onClick={() => abrirModalEditar(mov)}
                  disabled={!mov.es_editable}
                >
                  ✏️ Editar
                </button>
                <button 
                  style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: mov.es_editable ? 'pointer' : 'not-allowed', background: '#f44336', color: 'white', opacity: mov.es_editable ? 1 : 0.5 }}
                  onClick={() => eliminarMovimiento(mov.id, mov.es_editable)}
                  disabled={!mov.es_editable}
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Apertura */}
      {modalApertura && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setModalApertura(false)}>
          <div style={{ background: '#2a2a2a', borderRadius: '16px', maxWidth: '600px', width: '100%', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '24px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#ffc107' }}>🔓 Apertura de Caja</div>
              <button style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '28px', cursor: 'pointer' }} onClick={() => setModalApertura(false)}>×</button>
            </div>
            
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#ffc107', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>Monto Inicial en Efectivo</label>
                <input
                  type="number"
                  style={{ width: '100%', padding: '12px 16px', border: '2px solid #444', borderRadius: '8px', background: '#1a1a1a', color: '#fff', fontSize: '16px' }}
                  value={montoApertura}
                  onChange={(e) => setMontoApertura(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  autoFocus
                />
                <small style={{ color: '#aaa', fontSize: '12px', marginTop: '8px', display: 'block' }}>
                  Ingresa el monto en efectivo con el que inicias el turno
                </small>
              </div>
            </div>
            
            <div style={{ padding: '24px', borderTop: '1px solid #333', display: 'flex', gap: '12px' }}>
              <button style={{ flex: 1, padding: '14px', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '16px', cursor: 'pointer', background: '#444', color: '#fff' }} onClick={() => setModalApertura(false)}>
                Cancelar
              </button>
              <button style={{ flex: 1, padding: '14px', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '16px', cursor: 'pointer', background: '#ffc107', color: '#000' }} onClick={abrirCaja}>
                Abrir Caja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cierre */}
      {modalCierre && turnoActivo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setModalCierre(false)}>
          <div style={{ background: '#2a2a2a', borderRadius: '16px', maxWidth: '600px', width: '100%', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '24px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#ffc107' }}>🔒 Cierre de Caja</div>
              <button style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '28px', cursor: 'pointer' }} onClick={() => setModalCierre(false)}>×</button>
            </div>
            
            <div style={{ padding: '24px' }}>
              <div style={{ background: 'rgba(244, 67, 54, 0.1)', border: '1px solid #f44336', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: '#fff' }}>
                  <span>Monto inicial:</span>
                  <strong>${parseFloat(turnoActivo.monto_apertura).toLocaleString('es-AR', {minimumFractionDigits: 2})}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: '#fff' }}>
                  <span>Efectivo esperado:</span>
                  <strong>${parseFloat(turnoActivo.efectivo_esperado).toLocaleString('es-AR', {minimumFractionDigits: 2})}</strong>
                </div>
                {montoCierre && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: '#fff' }}>
                      <span>Efectivo real:</span>
                      <strong>${parseFloat(montoCierre).toLocaleString('es-AR', {minimumFractionDigits: 2})}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: '#fff' }}>
                      <span>Diferencia:</span>
                      <strong style={{ color: parseFloat(montoCierre) - parseFloat(turnoActivo.efectivo_esperado) >= 0 ? '#4caf50' : '#f44336' }}>
                        ${Math.abs(parseFloat(montoCierre) - parseFloat(turnoActivo.efectivo_esperado)).toLocaleString('es-AR', {minimumFractionDigits: 2})}
                        {parseFloat(montoCierre) - parseFloat(turnoActivo.efectivo_esperado) >= 0 ? ' (Sobrante)' : ' (Faltante)'}
                      </strong>
                    </div>
                  </>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#ffc107', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>Efectivo Real en Caja</label>
                <input
                  type="number"
                  style={{ width: '100%', padding: '12px 16px', border: '2px solid #444', borderRadius: '8px', background: '#1a1a1a', color: '#fff', fontSize: '16px' }}
                  value={montoCierre}
                  onChange={(e) => setMontoCierre(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  autoFocus
                />
                <small style={{ color: '#aaa', fontSize: '12px', marginTop: '8px', display: 'block' }}>
                  Cuenta el efectivo físico y registra el monto exacto
                </small>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#ffc107', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>Observaciones (opcional)</label>
                <textarea
                  style={{ width: '100%', padding: '12px 16px', border: '2px solid #444', borderRadius: '8px', background: '#1a1a1a', color: '#fff', fontSize: '16px', resize: 'vertical', minHeight: '80px' }}
                  value={observacionesCierre}
                  onChange={(e) => setObservacionesCierre(e.target.value)}
                  placeholder="Notas sobre el cierre de caja..."
                />
              </div>
            </div>
            
            <div style={{ padding: '24px', borderTop: '1px solid #333', display: 'flex', gap: '12px' }}>
              <button style={{ flex: 1, padding: '14px', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '16px', cursor: 'pointer', background: '#444', color: '#fff' }} onClick={() => setModalCierre(false)}>
                Cancelar
              </button>
              <button style={{ flex: 1, padding: '14px', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '16px', cursor: 'pointer', background: '#ffc107', color: '#000' }} onClick={cerrarCaja}>
                Cerrar Caja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo/Editar Movimiento */}
      {modalAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={cerrarModal}>
          <div style={{ background: '#2a2a2a', borderRadius: '16px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '24px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#ffc107' }}>
                {modoEdicion ? "✏️ Editar Movimiento" : "➕ Nuevo Movimiento"}
              </div>
              <button style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '28px', cursor: 'pointer' }} onClick={cerrarModal}>×</button>
            </div>
            
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', color: '#ffc107', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>Tipo de Movimiento</label>
                  <select
                    style={{ width: '100%', padding: '12px 16px', border: '2px solid #444', borderRadius: '8px', background: '#1a1a1a', color: '#fff', fontSize: '16px' }}
                    value={formData.tipo}
                    onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  >
                    <option value="ingreso">📈 Ingreso</option>
                    <option value="egreso">📉 Egreso</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', color: '#ffc107', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>Monto</label>
                  <input
                    type="number"
                    style={{ width: '100%', padding: '12px 16px', border: '2px solid #444', borderRadius: '8px', background: '#1a1a1a', color: '#fff', fontSize: '16px' }}
                    value={formData.monto}
                    onChange={(e) => setFormData({...formData, monto: e.target.value})}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#ffc107', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>Descripción</label>
                <textarea
                  style={{ width: '100%', padding: '12px 16px', border: '2px solid #444', borderRadius: '8px', background: '#1a1a1a', color: '#fff', fontSize: '16px', resize: 'vertical', minHeight: '80px' }}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  placeholder="Describe el motivo del movimiento..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', color: '#ffc107', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>Categoría</label>
                  <select
                    style={{ width: '100%', padding: '12px 16px', border: '2px solid #444', borderRadius: '8px', background: '#1a1a1a', color: '#fff', fontSize: '16px' }}
                    value={formData.categoria}
                    onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                  >
                    <option value="servicios">✂️ Servicios</option>
                    <option value="productos">🛍️ Productos</option>
                    <option value="gastos">📊 Gastos</option>
                    <option value="sueldos">👨‍💼 Sueldos</option>
                    <option value="alquiler">🏢 Alquiler</option>
                    <option value="servicios_publicos">💡 Servicios Públicos</option>
                    <option value="otros">📌 Otros</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', color: '#ffc107', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>Método de Pago</label>
                  <select
                    style={{ width: '100%', padding: '12px 16px', border: '2px solid #444', borderRadius: '8px', background: '#1a1a1a', color: '#fff', fontSize: '16px' }}
                    value={formData.metodo_pago}
                    onChange={(e) => setFormData({...formData, metodo_pago: e.target.value})}
                  >
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="tarjeta">💳 Tarjeta</option>
                    <option value="transferencia">🏦 Transferencia</option>
                    <option value="mercadopago">📱 Mercado Pago</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#ffc107', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>Fecha</label>
                <input
                  type="date"
                  style={{ width: '100%', padding: '12px 16px', border: '2px solid #444', borderRadius: '8px', background: '#1a1a1a', color: '#fff', fontSize: '16px' }}
                  value={formData.fecha}
                  onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                />
              </div>
            </div>
            
            <div style={{ padding: '24px', borderTop: '1px solid #333', display: 'flex', gap: '12px' }}>
              <button style={{ flex: 1, padding: '14px', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '16px', cursor: 'pointer', background: '#444', color: '#fff' }} onClick={cerrarModal}>
                Cancelar
              </button>
              <button 
                style={{ flex: 1, padding: '14px', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '16px', cursor: guardando ? 'not-allowed' : 'pointer', background: '#ffc107', color: '#000', opacity: guardando ? 0.5 : 1 }} 
                onClick={guardarMovimiento}
                disabled={guardando}
              >
                {guardando ? "Guardando..." : modoEdicion ? "Actualizar" : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historial */}
      {modalHistorial && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setModalHistorial(false)}>
          <div style={{ background: '#2a2a2a', borderRadius: '16px', maxWidth: '900px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '24px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#ffc107' }}>📋 Historial de Turnos</div>
              <button style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '28px', cursor: 'pointer' }} onClick={() => setModalHistorial(false)}>×</button>
            </div>
            
            <div style={{ padding: '24px' }}>
              {historialTurnos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                  <p>No hay turnos cerrados en el historial</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {historialTurnos.map(turno => (
                    <div key={turno.id} style={{ background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '2px solid #333' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: '#ffc107', marginBottom: '8px' }}>
                            Turno #{turno.id}
                          </div>
                          <div style={{ color: '#aaa', fontSize: '14px' }}>
                            {formatearFechaHora(turno.fecha_apertura)} - {formatearFechaHora(turno.fecha_cierre)}
                          </div>
                        </div>
                        <div style={{ background: turno.diferencia >= 0 ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)', color: turno.diferencia >= 0 ? '#4caf50' : '#f44336', padding: '8px 16px', borderRadius: '20px', fontWeight: '700', fontSize: '14px' }}>
                          {turno.diferencia >= 0 ? '✅' : '⚠️'} ${Math.abs(parseFloat(turno.diferencia)).toLocaleString('es-AR', {minimumFractionDigits: 2})}
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        <div>
                          <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px' }}>Monto Inicial</div>
                          <div style={{ color: '#fff', fontWeight: '600' }}>${parseFloat(turno.monto_apertura).toLocaleString('es-AR', {minimumFractionDigits: 2})}</div>
                        </div>
                        <div>
                          <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px' }}>Efectivo Esperado</div>
                          <div style={{ color: '#fff', fontWeight: '600' }}>${parseFloat(turno.efectivo_esperado).toLocaleString('es-AR', {minimumFractionDigits: 2})}</div>
                        </div>
                        <div>
                          <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px' }}>Efectivo Contado</div>
                          <div style={{ color: '#fff', fontWeight: '600' }}>${parseFloat(turno.monto_cierre).toLocaleString('es-AR', {minimumFractionDigits: 2})}</div>
                        </div>
                        <div>
                          <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px' }}>Movimientos</div>
                          <div style={{ color: '#fff', fontWeight: '600' }}>{turno.cantidad_movimientos || 0}</div>
                        </div>
                      </div>
                      
                      {turno.observaciones_cierre && (
                        <div style={{ marginTop: '12px', padding: '12px', background: '#2a2a2a', borderRadius: '8px', borderLeft: '3px solid #ffc107' }}>
                          <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px' }}>Observaciones:</div>
                          <div style={{ color: '#ccc', fontSize: '14px' }}>{turno.observaciones_cierre}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovimientosCaja;