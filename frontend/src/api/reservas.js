// frontend/src/api/reservas.js
import api from "./axios";

/**
 * Devuelve el perfil del usuario autenticado (email, role, etc.)
 * GET /api/usuarios/auth/me
 */
export async function getMe() {
  const { data } = await api.get("/api/usuarios/auth/me");
  return data; // { id, email, role, ... }
}

/**
 * Contadores para el panel del cliente.
 * GET /api/reservas/cliente/contadores/?email=...
 */
export async function getContadoresReservasCliente(email) {
  const params = email ? { email } : {};
  const { data } = await api.get("/api/reservas/cliente/contadores/", { params });
  return data; // { proximas, pendientes, confirmadas, rechazadas, canceladas }
}

/**
 * Lista de reservas del cliente por estado.
 * GET /api/reservas/cliente/?estado=...&email=...
 * estados: proximas | pendiente | confirmada | rechazada | cancelada
 */
export async function getReservasCliente({ estado, email }) {
  const params = {};
  if (estado) params.estado = estado;
  if (email) params.email = email;
  const { data } = await api.get("/api/reservas/cliente/", { params });
  return data; // { count, results: [...] }
}
