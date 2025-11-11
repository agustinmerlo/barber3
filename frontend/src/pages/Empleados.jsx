// src/pages/Empleados.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Empleados.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

const getRoleColor = (role) => {
  const colors = {
    admin: '#FFD700',
    barbero: '#3498db',
    cliente: '#95a5a6'
  };
  return colors[role] || '#95a5a6';
};

const getRoleIcon = (role) => {
  const icons = {
    admin: '👑',
    barbero: '✂️',
    cliente: '👤'
  };
  return icons[role] || '👤';
};

export default function Empleados() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [procesando, setProcesando] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return {
      "Authorization": `Token ${token}`,
      "Content-Type": "application/json"
    };
  };

  // Cargar los usuarios solo con los roles de admin y barbero
  const cargarUsuarios = async () => {
    setCargando(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/usuarios/empleados/`, {
        headers: getAuthHeaders()
      });

      if (response.status === 401) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        navigate("/");
        return;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();

      // Verificar la respuesta y asegurarse de que los roles admin y barbero están presentes
      console.log("Datos recibidos:", data);
      console.log("Primer usuario completo:", data[0]); // Ver estructura completa

      // Manejar tanto arrays directos como respuestas paginadas
      const usuariosData = Array.isArray(data) ? data : (data?.results ?? []);
      
      // Filtrar solo usuarios con rol 'admin' o 'barbero'
      const usuariosFiltrados = usuariosData.filter(u => 
        u.role === 'admin' || u.role === 'barbero'
      );
      
      console.log("Usuarios filtrados (admin y barbero):", usuariosFiltrados);
      
      setUsuarios(usuariosFiltrados);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
      setError("Error al cargar los usuarios");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cambiarRol = async (userId, nuevoRol, rolActual) => {
    // ⛔ Bloquear: Cliente → Barbero
    if (rolActual === 'cliente' && nuevoRol === 'barbero') {
      alert(
        '❌ No puedes convertir clientes en barberos desde aquí.\n\n' +
        '✅ Para crear barberos:\n' +
        '   1. Ve a la sección "Gestión de Barberos"\n' +
        '   2. Usa el formulario de crear barbero\n\n' +
        '💡 Si este cliente fue contratado:\n' +
        '   - Crea su cuenta de barbero desde /barberos\n' +
        '   - El barbero usará esas nuevas credenciales'
      );
      return;
    }

    // ⚠️ Advertir: Barbero → Cliente (degradar)
    if (rolActual === 'barbero' && nuevoRol === 'cliente') {
      const confirmado = window.confirm(
        '⚠️ Vas a DEGRADAR un Barbero a Cliente\n\n' +
        '❗ Esto significa que:\n' +
        '  • Ya no podrá acceder a /barbero/home\n' +
        '  • Su perfil de barbero quedará inactivo\n' +
        '  • Sus reservas históricas se mantienen\n' +
        '  • Ya no aparecerá en la lista de barberos disponibles\n\n' +
        '💡 Caso de uso: Empleado que ya no trabaja\n\n' +
        '¿Estás seguro de continuar?'
      );
      if (!confirmado) return;
    }

    // ⚠️ Advertir: Cambios relacionados con Admin
    if (rolActual === 'admin' && nuevoRol !== 'admin') {
      const confirmado = window.confirm(
        '⚠️ Vas a QUITAR privilegios de Administrador\n\n' +
        '❗ Este usuario perderá acceso a:\n' +
        '  • Gestión de empleados\n' +
        '  • Gestión de barberos\n' +
        '  • Todas las reservas del sistema\n' +
        '  • Configuraciones administrativas\n\n' +
        '¿Continuar con la degradación?'
      );
      if (!confirmado) return;
    }

    if (rolActual !== 'admin' && nuevoRol === 'admin') {
      const confirmado = window.confirm(
        '⚠️ Vas a DAR privilegios de Administrador\n\n' +
        '✅ Este usuario podrá:\n' +
        '  • Gestionar todos los usuarios\n' +
        '  • Crear/eliminar barberos\n' +
        '  • Ver todas las reservas\n' +
        '  • Acceder a todas las secciones administrativas\n\n' +
        '¿Otorgar estos privilegios?'
      );
      if (!confirmado) return;
    }

    // ✅ Confirmar cambio normal (si no es ninguno de los casos anteriores)
    if (rolActual !== 'barbero' && rolActual !== 'admin' && nuevoRol !== 'admin') {
      if (!window.confirm(`¿Cambiar rol a ${nuevoRol}?`)) return;
    }

    setProcesando(userId);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/api/usuarios/empleados/${userId}/cambiar-rol/`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({ role: nuevoRol })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Error al cambiar rol");
      }

      await cargarUsuarios();
      
      // Mensaje de éxito contextual
      if (rolActual === 'barbero' && nuevoRol === 'cliente') {
        alert('✅ Barbero degradado a Cliente\n\n💡 Su perfil de barbero sigue existiendo pero inactivo.');
      } else if (nuevoRol === 'admin') {
        alert('✅ Privilegios de Administrador otorgados correctamente');
      } else {
        alert(`✅ Rol actualizado a ${nuevoRol} exitosamente`);
      }
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setProcesando(null);
    }
  };

  const toggleActivo = async (userId, activoActual) => {
    const accion = activoActual ? "desactivar" : "activar";
    if (!window.confirm(`¿Está seguro de ${accion} este usuario?`)) return;

    setProcesando(userId);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/api/usuarios/empleados/${userId}/toggle-activo/`,
        {
          method: "PATCH",
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) throw new Error("Error al cambiar estado");

      await cargarUsuarios();
      alert(`✅ Usuario ${accion === "desactivar" ? "desactivado" : "activado"}`);
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setProcesando(null);
    }
  };

  // CAMBIO AQUÍ: Removemos el filtro de rol porque ya viene filtrado del backend
  const usuariosFiltrados = usuarios.filter(u => 
    u.username?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const contarPorRol = (rol) => usuarios.filter(u => u.role === rol).length;

  return (
    <div className="empleados-page">
      {/* HEADER */}
      <div className="empleados-header">
        <Link to="/home" className="back-btn">← Inicio</Link>
        <h1>👥 Gestión de Empleados</h1>
        <input
          className="input search"
          placeholder="Buscar por nombre, email o usuario..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {error && <div className="alert">{error}</div>}

      {/* ESTADÍSTICAS */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">👑</div>
          <div className="stat-info">
            <h3>{contarPorRol('admin')}</h3>
            <p>Administradores</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✂️</div>
          <div className="stat-info">
            <h3>{contarPorRol('barbero')}</h3>
            <p>Barberos</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <h3>{usuarios.length}</h3>
            <p>Total Empleados</p>
          </div>
        </div>
      </div>

      {/* TABLA DE USUARIOS */}
      {cargando ? (
        <div className="loading">Cargando usuarios...</div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>No se encontraron usuarios</h3>
          <p>Intenta con otra búsqueda</p>
        </div>
      ) : (
        <div className="empleados-table-container">
          <table className="empleados-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol Actual</th>
                <th>Estado</th>
                <th>Fecha Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((usuario) => (
                <tr key={usuario.id} className={!usuario.is_active ? 'inactive-row' : ''}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar" style={{ background: getRoleColor(usuario.role) }}>
                        {getRoleIcon(usuario.role)}
                      </div>
                      <div className="user-info">
                        <strong>{usuario.username}</strong>
                        {(usuario.first_name || usuario.last_name) && (
                          <small>{usuario.first_name} {usuario.last_name}</small>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{usuario.email}</td>
                  <td>
                    <span 
                      className="role-badge" 
                      style={{ 
                        background: `${getRoleColor(usuario.role)}20`,
                        color: getRoleColor(usuario.role),
                        border: `1px solid ${getRoleColor(usuario.role)}`
                      }}
                    >
                      {getRoleIcon(usuario.role)} {usuario.role_display || usuario.role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${usuario.is_active ? 'active' : 'inactive'}`}>
                      {usuario.is_active ? '✓ Activo' : '✕ Inactivo'}
                    </span>
                  </td>
                  <td>
                    {new Date(usuario.date_joined).toLocaleDateString('es-ES')}
                  </td>
                  <td>
                    <div className="actions-cell">
                      {/* ✅ SELECTOR CON OPCIONES RESTRINGIDAS SEGÚN ROL */}
                      <select
                        className="role-select"
                        value={usuario.role}
                        onChange={(e) => cambiarRol(usuario.id, e.target.value, usuario.role)}
                        disabled={procesando === usuario.id}  
                      >
                        {/* CLIENTE: Solo puede ser Cliente o Admin (NO Barbero) */}
                        {usuario.role === 'cliente' && (
                          <>
                            <option value="cliente">👤 Cliente</option>
                            <option value="admin">👑 Administrador</option>
                          </>
                        )}
                        
                        {/* BARBERO: Puede degradarse a Cliente o ascender a Admin */}
                        {usuario.role === 'barbero' && (
                          <>
                            <option value="barbero">✂️ Barbero</option>
                            <option value="cliente">👤 Cliente (degradar)</option>
                            <option value="admin">👑 Administrador</option>
                          </>
                        )}
                        
                        {/* ADMIN: Puede cambiar a Barbero o Cliente */}
                        {usuario.role === 'admin' && (
                          <>
                            <option value="admin">👑 Administrador</option>
                            <option value="barbero">✂️ Barbero (degradar)</option>
                            <option value="cliente">👤 Cliente (degradar)</option>
                          </>
                        )}
                      </select>
                      
                      <button
                        className={`btn-toggle ${usuario.is_active ? 'active' : 'inactive'}`}
                        onClick={() => toggleActivo(usuario.id, usuario.is_active)}
                        disabled={procesando === usuario.id}
                        title={usuario.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {usuario.is_active ? '🔓' : '🔒'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
