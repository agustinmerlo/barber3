import React, { useEffect, useState } from "react";

const API_URL = "http://localhost:8000/api";

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

  // Estados para apertura/cierre de caja
  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [modalApertura, setModalApertura] = useState(false);
  const [modalCierre, setModalCierre] = useState(false);
  const [montoApertura, setMontoApertura] = useState("");
  const [montoCierre, setMontoCierre] = useState("");
  const [observacionesCierre, setObservacionesCierre] = useState("");
  const [turnoActual, setTurnoActual] = useState(null);

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
    verificarEstadoCaja();
    cargarMovimientos();
  }, []);

  const verificarEstadoCaja = () => {
    const estado = localStorage.getItem('cajaAbierta');
    const turno = localStorage.getItem('turnoActual');
    if (estado === 'true' && turno) {
      setCajaAbierta(true);
      setTurnoActual(JSON.parse(turno));
    }
  };

  const cargarMovimientos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/caja/`);
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

  const abrirCaja = () => {
    if (!montoApertura || parseFloat(montoApertura) < 0) {
      alert("Ingresa un monto de apertura válido");
      return;
    }

    const turno = {
      fechaApertura: new Date().toISOString(),
      montoApertura: parseFloat(montoApertura),
      usuario: localStorage.getItem('userName') || 'Usuario'
    };

    localStorage.setItem('cajaAbierta', 'true');
    localStorage.setItem('turnoActual', JSON.stringify(turno));
    
    setCajaAbierta(true);
    setTurnoActual(turno);
    setModalApertura(false);
    setMontoApertura("");
    
    alert("Caja abierta exitosamente");
  };

  const prepararCierreCaja = () => {
    const efectivoEnCaja = calcularEfectivoEnCaja();
    setMontoCierre(efectivoEnCaja.toString());
    setModalCierre(true);
  };

  const cerrarCaja = () => {
    if (!montoCierre || parseFloat(montoCierre) < 0) {
      alert("Ingresa un monto de cierre válido");
      return;
    }

    const efectivoEsperado = calcularEfectivoEnCaja();
    const montoReal = parseFloat(montoCierre);
    const diferencia = montoReal - efectivoEsperado;

    const resumen = {
      ...turnoActual,
      fechaCierre: new Date().toISOString(),
      montoCierre: montoReal,
      efectivoEsperado,
      diferencia,
      observaciones: observacionesCierre
    };

    // Guardar resumen del turno
    const historialTurnos = JSON.parse(localStorage.getItem('historialTurnos') || '[]');
    historialTurnos.push(resumen);
    localStorage.setItem('historialTurnos', JSON.stringify(historialTurnos));

    // Cerrar caja
    localStorage.removeItem('cajaAbierta');
    localStorage.removeItem('turnoActual');
    
    setCajaAbierta(false);
    setTurnoActual(null);
    setModalCierre(false);
    setMontoCierre("");
    setObservacionesCierre("");

    // Mostrar resumen
    const mensaje = `
Caja cerrada exitosamente

Efectivo esperado: $${efectivoEsperado.toFixed(2)}
Efectivo real: $${montoReal.toFixed(2)}
Diferencia: $${diferencia.toFixed(2)} ${diferencia >= 0 ? '(Sobrante)' : '(Faltante)'}
    `;
    
    alert(mensaje);
  };

  const calcularEfectivoEnCaja = () => {
    if (!turnoActual) return 0;

    const fechaApertura = new Date(turnoActual.fechaApertura);
    
    const movimientosDelTurno = movimientos.filter(m => {
      const fechaMov = new Date(m.fecha + 'T' + (m.hora || '00:00:00'));
      return fechaMov >= fechaApertura && m.metodo_pago === 'efectivo';
    });

    const ingresos = movimientosDelTurno
      .filter(m => m.tipo === 'ingreso')
      .reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);

    const egresos = movimientosDelTurno
      .filter(m => m.tipo === 'egreso')
      .reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);

    return turnoActual.montoApertura + ingresos - egresos;
  };

  const abrirModalNuevo = () => {
    if (!cajaAbierta) {
      alert("Debes abrir la caja antes de registrar movimientos");
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
      alert("Ingresa un monto válido");
      return;
    }

    if (!formData.descripcion.trim()) {
      alert("Ingresa una descripción");
      return;
    }

    setGuardando(true);
    try {
      const body = {
        ...formData,
        monto: parseFloat(formData.monto)
      };

      const url = modoEdicion 
        ? `${API_URL}/caja/${movimientoEditar.id}/`
        : `${API_URL}/caja/`;
      
      const method = modoEdicion ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      alert(`Movimiento ${modoEdicion ? "actualizado" : "registrado"} exitosamente`);
      cerrarModal();
      cargarMovimientos();
    } catch (err) {
      console.error("Error guardando movimiento:", err);
      alert("Error al guardar el movimiento. Intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarMovimiento = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este movimiento?")) return;

    try {
      const res = await fetch(`${API_URL}/caja/${id}/`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      alert("Movimiento eliminado exitosamente");
      cargarMovimientos();
    } catch (err) {
      console.error("Error eliminando movimiento:", err);
      alert("Error al eliminar el movimiento.");
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
    <div style={{ padding: '20px' }}>
      <style>{`
        .caja-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 20px;
        }

        .header-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .btn-apertura-caja {
          padding: 12px 24px;
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
        }

        .btn-apertura-caja:hover {
          background: #45a049;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
        }

        .btn-cierre-caja {
          padding: 12px 24px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
        }

        .btn-cierre-caja:hover {
          background: #d32f2f;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
        }

        .btn-nuevo-movimiento {
          padding: 12px 24px;
          background: #ffc107;
          color: #000;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
        }

        .btn-nuevo-movimiento:hover {
          background: #ffca28;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3);
        }

        .btn-nuevo-movimiento:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .estado-caja {
          background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
          padding: 20px;
          border-radius: 12px;
          border: 2px solid;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .estado-caja.abierta {
          border-color: #4caf50;
        }

        .estado-caja.cerrada {
          border-color: #f44336;
        }

        .estado-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .estado-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 14px;
          width: fit-content;
        }

        .estado-badge.abierta {
          background: rgba(76, 175, 80, 0.2);
          color: #4caf50;
        }

        .estado-badge.cerrada {
          background: rgba(244, 67, 54, 0.2);
          color: #f44336;
        }

        .turno-info {
          color: #aaa;
          font-size: 14px;
        }

        .efectivo-caja {
          text-align: right;
        }

        .efectivo-label {
          color: #aaa;
          font-size: 14px;
          margin-bottom: 4px;
        }

        .efectivo-monto {
          font-size: 32px;
          font-weight: 700;
          color: #4caf50;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card-caja {
          background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
          padding: 24px;
          border-radius: 12px;
          border-left: 4px solid;
        }

        .stat-card-caja.ingresos {
          border-color: #4caf50;
        }

        .stat-card-caja.egresos {
          border-color: #f44336;
        }

        .stat-card-caja.saldo {
          border-color: #ffc107;
        }

        .stat-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .stat-label-caja {
          color: #aaa;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .stat-value-caja {
          font-size: 32px;
          font-weight: 700;
        }

        .filtros-section {
          background: #2a2a2a;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 30px;
          border: 2px solid #333;
        }

        .filtros-title {
          color: #ffc107;
          font-weight: 600;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filtros-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .filtro-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filtro-label {
          color: #aaa;
          font-size: 13px;
          font-weight: 600;
        }

        .filtro-select {
          padding: 10px 12px;
          border: 2px solid #444;
          border-radius: 6px;
          background: #1a1a1a;
          color: #fff;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filtro-select:focus {
          outline: none;
          border-color: #ffc107;
        }

        .filtro-input {
          padding: 10px 12px;
          border: 2px solid #444;
          border-radius: 6px;
          background: #1a1a1a;
          color: #fff;
          font-size: 14px;
          transition: all 0.2s;
        }

        .filtro-input:focus {
          outline: none;
          border-color: #ffc107;
        }

        .resultados-info {
          background: rgba(255, 193, 7, 0.1);
          border: 1px solid #ffc107;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-around;
          flex-wrap: wrap;
          gap: 16px;
        }

        .resultado-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .resultado-label {
          color: #aaa;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .resultado-valor {
          font-size: 20px;
          font-weight: 700;
        }

        .movimientos-lista {
          display: grid;
          gap: 16px;
        }

        .movimiento-card {
          background: #2a2a2a;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid #333;
          transition: all 0.3s;
          display: flex;
          flex-direction: column;
        }

        .movimiento-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
          border-color: #ffc107;
        }

        .movimiento-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: rgba(255, 193, 7, 0.05);
        }

        .movimiento-tipo-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
          color: white;
        }

        .movimiento-monto {
          font-size: 24px;
          font-weight: 700;
        }

        .movimiento-body {
          padding: 20px;
          display: grid;
          gap: 12px;
        }

        .movimiento-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }

        .info-label {
          color: #aaa;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .info-value {
          color: #fff;
          font-weight: 600;
        }

        .movimiento-descripcion {
          background: #1a1a1a;
          padding: 12px;
          border-radius: 8px;
          color: #ccc;
          font-size: 14px;
          border-left: 3px solid #ffc107;
        }

        .movimiento-footer {
          display: flex;
          gap: 8px;
          padding: 16px 20px;
          background: #1a1a1a;
          border-top: 1px solid #333;
        }

        .btn-accion {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 14px;
        }

        .btn-editar {
          background: #2196f3;
          color: white;
        }

        .btn-editar:hover {
          background: #1976d2;
        }

        .btn-eliminar {
          background: #f44336;
          color: white;
        }

        .btn-eliminar:hover {
          background: #d32f2f;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: #2a2a2a;
          border-radius: 16px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .modal-header {
          padding: 24px;
          border-bottom: 1px solid #333;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 700;
          color: #ffc107;
        }

        .btn-cerrar {
          background: none;
          border: none;
          color: #aaa;
          font-size: 28px;
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }

        .btn-cerrar:hover {
          background: #333;
          color: #fff;
        }

        .modal-body {
          padding: 24px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          color: #ffc107;
          font-weight: 600;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #444;
          border-radius: 8px;
          background: #1a1a1a;
          color: #fff;
          font-size: 16px;
          transition: all 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: #ffc107;
          box-shadow: 0 0 0 3px rgba(255, 193, 7, 0.1);
        }

        .form-textarea {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #444;
          border-radius: 8px;
          background: #1a1a1a;
          color: #fff;
          font-size: 16px;
          transition: all 0.2s;
          resize: vertical;
          min-height: 80px;
        }

        .form-textarea:focus {
          outline: none;
          border-color: #ffc107;
          box-shadow: 0 0 0 3px rgba(255, 193, 7, 0.1);
        }

        .info-box-cierre {
          background: rgba(244, 67, 54, 0.1);
          border: 1px solid #f44336;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .info-box-cierre .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          color: #fff;
        }

        .diferencia-positiva {
          color: #4caf50 !important;
        }

        .diferencia-negativa {
          color: #f44336 !important;
        }

        .modal-footer {
          padding: 24px;
          border-top: 1px solid #333;
          display: flex;
          gap: 12px;
        }

        .btn-modal {
          flex: 1;
          padding: 14px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancelar {
          background: #444;
          color: #fff;
        }

        .btn-cancelar:hover {
          background: #555;
        }

        .btn-confirmar {
          background: #ffc107;
          color: #000;
        }

        .btn-confirmar:hover {
          background: #ffca28;
          transform: translateY(-2px);
        }

        .btn-confirmar:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #aaa;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        @media (max-width: 768px) {
          .caja-header {
            flex-direction: column;
            align-items: stretch;
          }

          .header-actions {
            flex-direction: column;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .modal-footer {
            flex-direction: column;
          }

          .movimiento-footer {
            flex-direction: column;
          }

          .estado-caja {
            flex-direction: column;
            text-align: center;
          }

          .efectivo-caja {
            text-align: center;
          }
        }
      `}</style>

      <div className="caja-header">
        <h2 style={{ margin: 0, color: '#fff' }}>💰 Movimientos de Caja</h2>
        <div className="header-actions">
          {!cajaAbierta ? (
            <button className="btn-apertura-caja" onClick={() => setModalApertura(true)}>
              🔓 Abrir Caja
            </button>
          ) : (
            <>
              <button className="btn-cierre-caja" onClick={prepararCierreCaja}>
                🔒 Cerrar Caja
              </button>
              <button className="btn-nuevo-movimiento" onClick={abrirModalNuevo}>
                ➕ Nuevo Movimiento
              </button>
            </>
          )}
        </div>
      </div>

      {cajaAbierta && turnoActual && (
        <div className="estado-caja abierta">
          <div className="estado-info">
            <div className="estado-badge abierta">
              🟢 Caja Abierta
            </div>
            <div className="turno-info">
              Abierta el: {formatearFechaHora(turnoActual.fechaApertura)}
            </div>
            <div className="turno-info">
              Usuario: {turnoActual.usuario}
            </div>
            <div className="turno-info">
              Monto inicial: ${turnoActual.montoApertura.toLocaleString('es-AR', {minimumFractionDigits: 2})}
            </div>
          </div>
          <div className="efectivo-caja">
            <div className="efectivo-label">Efectivo en Caja</div>
            <div className="efectivo-monto">
              ${calcularEfectivoEnCaja().toLocaleString('es-AR', {minimumFractionDigits: 2})}
            </div>
          </div>
        </div>
      )}

      {!cajaAbierta && (
        <div className="estado-caja cerrada">
          <div className="estado-info">
            <div className="estado-badge cerrada">
              🔴 Caja Cerrada
            </div>
            <div className="turno-info">
              Debes abrir la caja para comenzar a operar
            </div>
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card-caja ingresos">
          <div className="stat-icon">📈</div>
          <div className="stat-label-caja">Total Ingresos</div>
          <div className="stat-value-caja" style={{ color: '#4caf50' }}>
            ${totalIngresos.toLocaleString('es-AR', {minimumFractionDigits: 2})}
          </div>
        </div>
        <div className="stat-card-caja egresos">
          <div className="stat-icon">📉</div>
          <div className="stat-label-caja">Total Egresos</div>
          <div className="stat-value-caja" style={{ color: '#f44336' }}>
            ${totalEgresos.toLocaleString('es-AR', {minimumFractionDigits: 2})}
          </div>
        </div>
        <div className="stat-card-caja saldo">
          <div className="stat-icon">💰</div>
          <div className="stat-label-caja">Saldo en Caja</div>
          <div className="stat-value-caja" style={{ color: saldoCaja >= 0 ? '#ffc107' : '#f44336' }}>
            ${saldoCaja.toLocaleString('es-AR', {minimumFractionDigits: 2})}
          </div>
        </div>
      </div>

      <div className="filtros-section">
        <div className="filtros-title">🔍 Filtros</div>
        <div className="filtros-grid">
          <div className="filtro-group">
            <label className="filtro-label">Tipo</label>
            <select 
              className="filtro-select"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="ingreso">Ingresos</option>
              <option value="egreso">Egresos</option>
            </select>
          </div>

          <div className="filtro-group">
            <label className="filtro-label">Método de Pago</label>
            <select 
              className="filtro-select"
              value={filtroMetodo}
              onChange={(e) => setFiltroMetodo(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="mercadopago">Mercado Pago</option>
            </select>
          </div>

          <div className="filtro-group">
            <label className="filtro-label">Categoría</label>
            <select 
              className="filtro-select"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
            >
              <option value="todos">Todas</option>
              <option value="servicios">Servicios</option>
              <option value="productos">Productos</option>
              <option value="gastos">Gastos</option>
              <option value="sueldos">Sueldos</option>
              <option value="alquiler">Alquiler</option>
              <option value="servicios_publicos">Servicios Públicos</option>
              <option value="otros">Otros</option>
            </select>
          </div>

          <div className="filtro-group">
            <label className="filtro-label">Desde</label>
            <input 
              type="date"
              className="filtro-input"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>

          <div className="filtro-group">
            <label className="filtro-label">Hasta</label>
            <input 
              type="date"
              className="filtro-input"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
        </div>
      </div>

      {movimientosFiltrados.length > 0 && (
        <div className="resultados-info">
          <div className="resultado-item">
            <div className="resultado-label">Movimientos</div>
            <div className="resultado-valor" style={{ color: '#ffc107' }}>
              {movimientosFiltrados.length}
            </div>
          </div>
          <div className="resultado-item">
            <div className="resultado-label">Ingresos Filtrados</div>
            <div className="resultado-valor" style={{ color: '#4caf50' }}>
              ${totalIngresosFiltrados.toLocaleString('es-AR', {minimumFractionDigits: 2})}
            </div>
          </div>
          <div className="resultado-item">
            <div className="resultado-label">Egresos Filtrados</div>
            <div className="resultado-valor" style={{ color: '#f44336' }}>
              ${totalEgresosFiltrados.toLocaleString('es-AR', {minimumFractionDigits: 2})}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty-state">Cargando movimientos...</div>
      ) : movimientosFiltrados.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <p>No hay movimientos registrados</p>
        </div>
      ) : (
        <div className="movimientos-lista">
          {movimientosFiltrados.map(mov => (
            <div key={mov.id} className="movimiento-card">
              <div className="movimiento-header">
                <div 
                  className="movimiento-tipo-badge"
                  style={{ backgroundColor: getTipoColor(mov.tipo) }}
                >
                  <span>{getTipoIcon(mov.tipo)}</span>
                  <span>{mov.tipo === "ingreso" ? "INGRESO" : "EGRESO"}</span>
                </div>
                <div 
                  className="movimiento-monto"
                  style={{ color: getTipoColor(mov.tipo) }}
                >
                  {mov.tipo === "ingreso" ? "+" : "-"}${parseFloat(mov.monto).toLocaleString('es-AR', {minimumFractionDigits: 2})}
                </div>
              </div>

              <div className="movimiento-body">
                {mov.descripcion && (
                  <div className="movimiento-descripcion">
                    {mov.descripcion}
                  </div>
                )}

                <div className="movimiento-info-row">
                  <span className="info-label">
                    {getCategoriaIcon(mov.categoria)} Categoría
                  </span>
                  <span className="info-value">{mov.categoria || "Sin categoría"}</span>
                </div>

                <div className="movimiento-info-row">
                  <span className="info-label">
                    {getMetodoIcon(mov.metodo_pago)} Método
                  </span>
                  <span className="info-value">{mov.metodo_pago || "No especificado"}</span>
                </div>

                <div className="movimiento-info-row">
                  <span className="info-label">📅 Fecha</span>
                  <span className="info-value">
                    {formatearFecha(mov.fecha)} {mov.hora && formatearHora(mov.hora)}
                  </span>
                </div>
              </div>

              <div className="movimiento-footer">
                <button 
                  className="btn-accion btn-editar"
                  onClick={() => abrirModalEditar(mov)}
                >
                  ✏️ Editar
                </button>
                <button 
                  className="btn-accion btn-eliminar"
                  onClick={() => eliminarMovimiento(mov.id)}
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Apertura de Caja */}
      {modalApertura && (
        <div className="modal-overlay" onClick={() => setModalApertura(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🔓 Apertura de Caja</div>
              <button className="btn-cerrar" onClick={() => setModalApertura(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Monto Inicial en Efectivo</label>
                <input
                  type="number"
                  className="form-input"
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

            <div className="modal-footer">
              <button className="btn-modal btn-cancelar" onClick={() => setModalApertura(false)}>
                Cancelar
              </button>
              <button className="btn-modal btn-confirmar" onClick={abrirCaja}>
                Abrir Caja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cierre de Caja */}
      {modalCierre && (
        <div className="modal-overlay" onClick={() => setModalCierre(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🔒 Cierre de Caja</div>
              <button className="btn-cerrar" onClick={() => setModalCierre(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="info-box-cierre">
                <div className="info-row">
                  <span>Monto inicial:</span>
                  <strong>${turnoActual?.montoApertura.toLocaleString('es-AR', {minimumFractionDigits: 2})}</strong>
                </div>
                <div className="info-row">
                  <span>Efectivo esperado:</span>
                  <strong>${calcularEfectivoEnCaja().toLocaleString('es-AR', {minimumFractionDigits: 2})}</strong>
                </div>
                {montoCierre && (
                  <>
                    <div className="info-row">
                      <span>Efectivo real:</span>
                      <strong>${parseFloat(montoCierre).toLocaleString('es-AR', {minimumFractionDigits: 2})}</strong>
                    </div>
                    <div className="info-row">
                      <span>Diferencia:</span>
                      <strong className={parseFloat(montoCierre) - calcularEfectivoEnCaja() >= 0 ? 'diferencia-positiva' : 'diferencia-negativa'}>
                        ${(parseFloat(montoCierre) - calcularEfectivoEnCaja()).toLocaleString('es-AR', {minimumFractionDigits: 2})}
                        {parseFloat(montoCierre) - calcularEfectivoEnCaja() >= 0 ? ' (Sobrante)' : ' (Faltante)'}
                      </strong>
                    </div>
                  </>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Efectivo Real en Caja</label>
                <input
                  type="number"
                  className="form-input"
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

              <div className="form-group">
                <label className="form-label">Observaciones (opcional)</label>
                <textarea
                  className="form-textarea"
                  value={observacionesCierre}
                  onChange={(e) => setObservacionesCierre(e.target.value)}
                  placeholder="Notas sobre el cierre de caja..."
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-modal btn-cancelar" onClick={() => setModalCierre(false)}>
                Cancelar
              </button>
              <button className="btn-modal btn-confirmar" onClick={cerrarCaja}>
                Cerrar Caja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Movimiento */}
      {modalAbierto && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                {modoEdicion ? "✏️ Editar Movimiento" : "➕ Nuevo Movimiento"}
              </div>
              <button className="btn-cerrar" onClick={cerrarModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tipo de Movimiento</label>
                  <select
                    className="form-input"
                    value={formData.tipo}
                    onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  >
                    <option value="ingreso">📈 Ingreso</option>
                    <option value="egreso">📉 Egreso</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Monto</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.monto}
                    onChange={(e) => setFormData({...formData, monto: e.target.value})}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea
                  className="form-textarea"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  placeholder="Describe el motivo del movimiento..."
                />
              </div>

              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Categoría</label>
                  <select
                    className="form-input"
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

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Método de Pago</label>
                  <select
                    className="form-input"
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

              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.fecha}
                  onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-modal btn-cancelar" onClick={cerrarModal}>
                Cancelar
              </button>
              <button 
                className="btn-modal btn-confirmar" 
                onClick={guardarMovimiento}
                disabled={guardando}
              >
                {guardando ? "Guardando..." : modoEdicion ? "Actualizar" : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovimientosCaja;