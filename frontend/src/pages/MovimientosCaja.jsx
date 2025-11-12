import React, { useEffect, useState } from "react";
import { Lock, Unlock, TrendingUp, TrendingDown, DollarSign, Calendar, Filter, Edit2, Trash2, Plus, X, FileText, Clock } from "lucide-react";

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
  const [efectivoReal, setEfectivoReal] = useState("");
  const [observacionesCierre, setObservacionesCierre] = useState("");
  const [turnoActual, setTurnoActual] = useState(null);
  
  // Estados para historial de cierres
  const [historialCierres, setHistorialCierres] = useState([]);
  const [modalHistorial, setModalHistorial] = useState(false);
  const [cierreSeleccionado, setCierreSeleccionado] = useState(null);
  const [modalDetalleCierre, setModalDetalleCierre] = useState(false);

  // Formulario
  const [formData, setFormData] = useState({
    tipo: "ingreso",
    monto: "",
    descripcion: "",
    metodo_pago: "efectivo",
    categoria: "servicios",
  }); 

  useEffect(() => {
    verificarEstadoCaja();
    cargarMovimientos();
    cargarHistorialCierres();
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
      const res = await fetch(`${API_URL}/caja/movimientos-sin-cierre/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const todosMovimientos = Array.isArray(data) ? data : data?.results ?? [];
      
      const movimientosOrdenados = todosMovimientos.sort((a, b) => {
        const fechaA = new Date(a.fecha_creacion);
        const fechaB = new Date(b.fecha_creacion);
        return fechaB - fechaA;
      });

      setMovimientos(movimientosOrdenados);
    } catch (err) {
      console.error("Error cargando movimientos:", err);
    } finally {
      setLoading(false);
    }
  };

  const cargarHistorialCierres = async () => {
    try {
      const res = await fetch(`${API_URL}/caja/cierres/historial/`);
      if (res.ok) {
        const data = await res.json();
        setHistorialCierres(data);
      }
    } catch (err) {
      console.error("Error cargando historial:", err);
    }
  };

  const abrirCaja = async () => {
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
    
    alert("✅ Caja abierta exitosamente");
  };

  const prepararCierreCaja = () => {
    const efectivoEnCaja = calcularEfectivoEnCaja();
    setEfectivoReal(efectivoEnCaja.toString());
    setModalCierre(true);
  };

  const cerrarCaja = async () => {
    if (!efectivoReal || parseFloat(efectivoReal) < 0) {
      alert("❌ Ingresa un monto de efectivo real válido");
      return;
    }

    try {
      // Preparar datos para el backend
      const cierreData = {
        fecha_apertura: turnoActual.fechaApertura,
        monto_inicial: turnoActual.montoApertura,
        efectivo_real: parseFloat(efectivoReal),
        observaciones: observacionesCierre,
        usuario_apertura_id: 1 // Cambiar por el ID del usuario real
      };

      // Enviar cierre al backend
      const res = await fetch(`${API_URL}/caja/cierres/cerrar_caja/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cierreData)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al cerrar caja');
      }

      const resultado = await res.json();
      
      // Cerrar caja localmente
      localStorage.removeItem('cajaAbierta');
      localStorage.removeItem('turnoActual');
      
      setCajaAbierta(false);
      setTurnoActual(null);
      setModalCierre(false);
      setEfectivoReal("");
      setObservacionesCierre("");

      // Recargar datos
      await cargarMovimientos();
      await cargarHistorialCierres();

      // Mostrar resumen
      const cierre = resultado.cierre;
      const diferencia = cierre.diferencia;
      const mensaje = `✅ Caja cerrada exitosamente

💰 Efectivo esperado: $${cierre.efectivo_esperado.toFixed(2)}
💵 Efectivo real: $${cierre.efectivo_real.toFixed(2)}
${diferencia >= 0 ? '✅' : '⚠️'} Diferencia: $${Math.abs(diferencia).toFixed(2)} ${diferencia >= 0 ? '(Sobrante)' : '(Faltante)'}

📊 Total movimientos: ${cierre.cantidad_movimientos}
📈 Ingresos: ${cierre.cantidad_ingresos}
📉 Egresos: ${cierre.cantidad_egresos}`;
      
      alert(mensaje);
    } catch (err) {
      console.error("Error cerrando caja:", err);
      alert(`❌ Error al cerrar caja: ${err.message}`);
    }
  };

  const calcularEfectivoEnCaja = () => {
    if (!turnoActual) return 0;

    const fechaApertura = new Date(turnoActual.fechaApertura);
    
    const movimientosDelTurno = movimientos.filter(m => {
      const fechaMov = new Date(m.fecha_creacion);
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
        ? `${API_URL}/caja/${movimientoEditar.id}/`
        : `${API_URL}/caja/`;
      
      const method = modoEdicion ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      alert(`✅ Movimiento ${modoEdicion ? "actualizado" : "registrado"} exitosamente`);
      cerrarModal();
      cargarMovimientos();
    } catch (err) {
      console.error("Error guardando movimiento:", err);
      alert("❌ Error al guardar el movimiento. Intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarMovimiento = async (id) => {
    if (!window.confirm("⚠️ ¿Estás seguro de eliminar este movimiento?")) return;

    try {
      const res = await fetch(`${API_URL}/caja/${id}/`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      alert("✅ Movimiento eliminado exitosamente");
      cargarMovimientos();
    } catch (err) {
      console.error("Error eliminando movimiento:", err);
      alert("❌ Error al eliminar el movimiento.");
    }
  };

  const verDetalleCierre = async (cierre) => {
    try {
      const res = await fetch(`${API_URL}/caja/cierres/${cierre.id}/detalle_completo/`);
      if (res.ok) {
        const detalle = await res.json();
        setCierreSeleccionado(detalle);
        setModalDetalleCierre(true);
      }
    } catch (err) {
      console.error("Error cargando detalle:", err);
      alert("❌ Error al cargar detalle del cierre");
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "-";
    return new Date(fecha).toLocaleDateString("es-AR", { 
      day: "2-digit", 
      month: "short",
      year: "numeric"
    });
  };

  const formatearHora = (fecha) => {
    if (!fecha) return "";
    return new Date(fecha).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatearFechaHora = (fechaISO) => {
    if (!fechaISO) return "-";
    const fecha = new Date(fechaISO);
    return fecha.toLocaleString("es-AR", {
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
 
  return ( 
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <DollarSign className="w-10 h-10 text-yellow-400" />
              Sistema de Caja
            </h1>
            <p className="text-gray-400">Gestión profesional de movimientos</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setModalHistorial(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg hover:shadow-purple-500/50 flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Historial de Cierres
            </button>
            
            {!cajaAbierta ? (
              <button
                onClick={() => setModalApertura(true)}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-green-500/50 flex items-center gap-2"
              >
                <Unlock className="w-5 h-5" />
                Abrir Caja
              </button>
            ) : (
              <>
                <button
                  onClick={prepararCierreCaja}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-red-500/50 flex items-center gap-2"
                >
                  <Lock className="w-5 h-5" />
                  Cerrar Caja
                </button>
                <button
                  onClick={abrirModalNuevo}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black rounded-lg font-semibold hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-lg hover:shadow-yellow-500/50 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Nuevo Movimiento
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Estado de Caja */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className={`rounded-xl p-6 border-2 ${cajaAbierta ? 'bg-gradient-to-r from-green-900/20 to-green-800/20 border-green-500' : 'bg-gradient-to-r from-red-900/20 to-red-800/20 border-red-500'}`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold mb-3 ${cajaAbierta ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {cajaAbierta ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                {cajaAbierta ? 'Caja Abierta' : 'Caja Cerrada'}
              </div>
              
              {cajaAbierta && turnoActual && (
                <div className="space-y-1 text-gray-300">
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Abierta: {formatearFechaHora(turnoActual.fechaApertura)}
                  </p>
                  <p>Usuario: {turnoActual.usuario}</p>
                  <p>Monto inicial: ${turnoActual.montoApertura.toLocaleString('es-AR', {minimumFractionDigits: 2})}</p>
                </div>
              )}
              
              {!cajaAbierta && (
                <p className="text-gray-400">Debes abrir la caja para comenzar a operar</p>
              )}
            </div>
            
            {cajaAbierta && (
              <div className="text-right">
                <p className="text-gray-400 text-sm mb-1">Efectivo en Caja</p>
                <p className="text-4xl font-bold text-green-400">
                  ${calcularEfectivoEnCaja().toLocaleString('es-AR', {minimumFractionDigits: 2})}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="max-w-7xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-900/20 to-green-800/20 border-2 border-green-500 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-green-400" />
            <div className="text-right">
              <p className="text-gray-400 text-sm">Total Ingresos</p>
              <p className="text-3xl font-bold text-green-400">
                ${totalIngresos.toLocaleString('es-AR', {minimumFractionDigits: 2})}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-900/20 to-red-800/20 border-2 border-red-500 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingDown className="w-8 h-8 text-red-400" />
            <div className="text-right">
              <p className="text-gray-400 text-sm">Total Egresos</p>
              <p className="text-3xl font-bold text-red-400">
                ${totalEgresos.toLocaleString('es-AR', {minimumFractionDigits: 2})}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/20 border-2 border-yellow-500 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 text-yellow-400" />
            <div className="text-right">
              <p className="text-gray-400 text-sm">Saldo</p>
              <p className={`text-3xl font-bold ${saldoCaja >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                ${saldoCaja.toLocaleString('es-AR', {minimumFractionDigits: 2})}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">Filtros</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Tipo</label>
              <select 
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="ingreso">Ingresos</option>
                <option value="egreso">Egresos</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Método</label>
              <select 
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none"
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

            <div>
              <label className="block text-gray-400 text-sm mb-2">Categoría</label>
              <select 
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none"
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

            <div>
              <label className="block text-gray-400 text-sm mb-2">Desde</label>
              <input 
                type="date"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Hasta</label>
              <input 
                type="date"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Resumen de filtros */}
      {movimientosFiltrados.length > 0 && (
        <div className="max-w-7xl mx-auto mb-8">
          <div className="bg-yellow-500/10 border border-yellow-500 rounded-xl p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-gray-400 text-sm">Movimientos</p>
                <p className="text-2xl font-bold text-yellow-400">{movimientosFiltrados.length}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Ingresos</p>
                <p className="text-2xl font-bold text-green-400">${totalIngresosFiltrados.toLocaleString('es-AR', {minimumFractionDigits: 2})}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Egresos</p>
                <p className="text-2xl font-bold text-red-400">${totalEgresosFiltrados.toLocaleString('es-AR', {minimumFractionDigits: 2})}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Movimientos */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center text-gray-400 py-12">
            Cargando movimientos...
          </div>
        ) : movimientosFiltrados.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No hay movimientos registrados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {movimientosFiltrados.map(mov => (
              <div 
                key={mov.id} 
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 hover:border-yellow-400 transition-all overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${mov.tipo === 'ingreso' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        {mov.tipo === 'ingreso' ? (
                          <TrendingUp className="w-6 h-6 text-green-400" />
                        ) : (
                          <TrendingDown className="w-6 h-6 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className={`text-2xl font-bold ${mov.tipo === 'ingreso' ? 'text-green-400' : 'text-red-400'}`}>
                          {mov.tipo === 'ingreso' ? '+' : '-'}${parseFloat(mov.monto).toLocaleString('es-AR', {minimumFractionDigits: 2})}
                        </p>
                        <p className="text-sm text-gray-400 uppercase">{mov.tipo}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm flex items-center gap-2 justify-end">
                        <Calendar className="w-4 h-4" />
                        {formatearFechaHora(mov.fecha_creacion)}
                      </p>
                    </div>
                  </div>

                  {mov.descripcion && (
                    <div className="bg-gray-900/50 rounded-lg p-4 mb-4 border-l-4 border-yellow-400">
                      <p className="text-gray-300">{mov.descripcion}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-gray-400 text-sm">Categoría</p>
                      <p className="text-white font-semibold">{mov.categoria || "Sin categoría"}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Método</p>
                      <p className="text-white font-semibold">{mov.metodo_pago || "No especificado"}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Fecha</p>
                      <p className="text-white font-semibold">{formatearFecha(mov.fecha)}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => abrirModalEditar(mov)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </button>
                    <button 
                      onClick={() => eliminarMovimiento(mov.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Apertura */}
      {modalApertura && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full border-2 border-green-500 shadow-2xl shadow-green-500/20">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Unlock className="w-6 h-6 text-green-400" />
                Apertura de Caja
              </h3>
              <button onClick={() => setModalApertura(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-yellow-400 font-semibold mb-2">
                Monto Inicial en Efectivo
              </label>
              <input
                type="number"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border-2 border-gray-600 focus:border-green-400 focus:outline-none text-lg"
                value={montoApertura}
                onChange={(e) => setMontoApertura(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                autoFocus
              />
              <p className="text-gray-400 text-sm mt-2">
                Ingresa el monto en efectivo con el que inicias el turno
              </p>
            </div>

            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setModalApertura(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={abrirCaja}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-lg font-semibold transition-all"
              >
                Abrir Caja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cierre */}
      {modalCierre && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full border-2 border-red-500 shadow-2xl shadow-red-500/20">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Lock className="w-6 h-6 text-red-400" />
                Cierre de Caja
              </h3>
              <button onClick={() => setModalCierre(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Monto inicial:</span>
                    <strong className="text-white">${turnoActual?.montoApertura.toLocaleString('es-AR', {minimumFractionDigits: 2})}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Efectivo esperado:</span>
                    <strong className="text-white">${calcularEfectivoEnCaja().toLocaleString('es-AR', {minimumFractionDigits: 2})}</strong>
                  </div>
                  {efectivoReal && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Efectivo real:</span>
                        <strong className="text-white">${parseFloat(efectivoReal).toLocaleString('es-AR', {minimumFractionDigits: 2})}</strong>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-red-500/30">
                        <span className="text-gray-400">Diferencia:</span>
                        <strong className={parseFloat(efectivoReal) - calcularEfectivoEnCaja() >= 0 ? 'text-green-400' : 'text-red-400'}>
                          ${(parseFloat(efectivoReal) - calcularEfectivoEnCaja()).toLocaleString('es-AR', {minimumFractionDigits: 2})}
                          {parseFloat(efectivoReal) - calcularEfectivoEnCaja() >= 0 ? ' ✅' : ' ⚠️'}
                        </strong>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <label className="block text-yellow-400 font-semibold mb-2">
                Efectivo Real en Caja
              </label>
              <input
                type="number"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border-2 border-gray-600 focus:border-red-400 focus:outline-none text-lg mb-4"
                value={efectivoReal}
                onChange={(e) => setEfectivoReal(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                autoFocus
              />

              <label className="block text-yellow-400 font-semibold mb-2">
                Observaciones (opcional)
              </label>
              <textarea
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border-2 border-gray-600 focus:border-red-400 focus:outline-none resize-none"
                value={observacionesCierre}
                onChange={(e) => setObservacionesCierre(e.target.value)}
                placeholder="Notas sobre el cierre..."
                rows="3"
              />
            </div>

            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setModalCierre(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={cerrarCaja}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-lg font-semibold transition-all"
              >
                Cerrar Caja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovimientosCaja;
