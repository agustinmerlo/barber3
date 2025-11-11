// src/pages/Proveedores.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Proveedores.css";

// API base (Django/DRF)
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";
const API = `${API_BASE}/api/proveedores`;

// ---- Auth helpers ----
function getAuthHeaders(extra = {}) {
  const token = localStorage.getItem("authToken");
  const headers = { ...extra };
  if (token) headers["Authorization"] = `Token ${token}`;
  return headers;
}

async function safeJson(res) {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(`Respuesta no JSON (${res.status}). ${text.slice(0, 120)}`);
  }
  return res.json();
}

// ---- API helpers ----
async function listSuppliers({ search = "" } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const url = `${API}/?${params.toString()}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (res.status === 401) throw new Error("AUTH");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return safeJson(res);
}

async function createSupplier(payload) {
  const res = await fetch(`${API}/`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (res.status === 401) throw new Error("AUTH");
  if (res.status === 403) throw new Error("FORBIDDEN");
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP ${res.status}`);
  }
  return safeJson(res);
}

async function updateSupplier(id, payload) {
  const res = await fetch(`${API}/${id}/`, {
    method: "PATCH",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (res.status === 401) throw new Error("AUTH");
  if (res.status === 403) throw new Error("FORBIDDEN");
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP ${res.status}`);
  }
  return safeJson(res);
}

async function removeSupplier(id) {
  const res = await fetch(`${API}/${id}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (res.status === 401) throw new Error("AUTH");
  if (res.status === 403) throw new Error("FORBIDDEN");
  if (!(res.status === 204 || res.ok)) throw new Error(`HTTP ${res.status}`);
}

// ---- SVG Icons ----
const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const ToggleIcon = ({ on = true }) => (
  <svg width="24" height="18" viewBox="0 0 48 28" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="1" rx="14" ry="14" width="46" height="26" stroke="currentColor" />
    <circle cx={on ? "34" : "14"} cy="14" r="10" fill="currentColor" />
  </svg>
);

export default function Proveedores() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  const emptyForm = useMemo(
    () => ({
      id: null,
      name: "",
      company: "",
      email: "",
      phone: "",
      direccion: "",
      tipo: "productos_cabello",
      active: true,
      notes: "",
    }),
    []
  );
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState(null);

  const reload = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listSuppliers({ search: q });
      setRows(data?.results ?? data ?? []);
    } catch (e) {
      if (e.message === "AUTH") {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        navigate("/");
        return;
      }
      setError(e.message || "Error cargando proveedores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        company: form.company.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        direccion: form.direccion.trim(),
        tipo: form.tipo,
        active: !!form.active,
        notes: form.notes.trim(),
      };
      if (form.id) {
        await updateSupplier(form.id, payload);
      } else {
        await createSupplier(payload);
      }
      setOpen(false);
      setForm(emptyForm);
      reload();
    } catch (e) {
      if (e.message === "AUTH") {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        navigate("/");
        return;
      }
      if (e.message === "FORBIDDEN") {
        setError("No tienes permisos para realizar esta acción. Necesitas ser administrador.");
        return;
      }
      setError(e.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (row) => {
    setForm({
      id: row.id,
      name: row.name || "",
      company: row.company || "",
      email: row.email || "",
      phone: row.phone || "",
      direccion: row.direccion || "",
      tipo: row.tipo || "productos_cabello",
      active: !!row.active,
      notes: row.notes || "",
    });
    setOpen(true);
  };

  const onToggle = async (row) => {
    setWorkingId(row.id);
    setError("");
    try {
      await updateSupplier(row.id, { active: !row.active });
      reload();
    } catch (e) {
      if (e.message === "AUTH") {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        navigate("/");
        return;
      }
      if (e.message === "FORBIDDEN") {
        setError("No tienes permisos para modificar proveedores.");
        return;
      }
      setError(e.message || "No se pudo actualizar el estado");
    } finally {
      setWorkingId(null);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("¿Eliminar este proveedor?")) return;
    setWorkingId(id);
    setError("");
    try {
      await removeSupplier(id);
      reload();
    } catch (e) {
      if (e.message === "AUTH") {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        navigate("/");
        return;
      }
      if (e.message === "FORBIDDEN") {
        setError("No tienes permisos para eliminar proveedores.");
        return;
      }
      setError(e.message || "No se pudo eliminar");
    } finally {
      setWorkingId(null);
    }
  };

  const getTipoLabel = (tipo) => {
    const tipos = {
      'productos_cabello': 'Productos para el cabello'
    };
    return tipos[tipo] || tipo;
  };

  return (
    <div className="providers-page">
      <div className="providers-header">
        <div className="left">
          <Link to="/home" className="back-btn">← Inicio</Link>
          <h1>Proveedores</h1>
        </div>

        <div className="providers-actions">
          <input
            className="input search"
            placeholder="Buscar por nombre o empresa…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            className="btn primary"
            onClick={() => { setForm(emptyForm); setOpen(true); }}
          >
            + Agregar Proveedor
          </button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      {loading ? (
        <div className="providers-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-line w60" />
              <div className="skeleton-line w80" />
              <div className="skeleton-line w40" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏭</div>
          <h3>No hay proveedores</h3>
          <p>Comienza agregando tu primer proveedor</p>
          <button
            className="btn primary"
            onClick={() => { setForm(emptyForm); setOpen(true); }}
          >
            + Agregar proveedor
          </button>
        </div>
      ) : (
        <div className="providers-grid">
          {rows.map((p) => (
            <div key={p.id} className="provider-card">
              <div className="provider-card-header">
                <span className={`status-badge ${p.active ? "active" : "inactive"}`}>
                  {p.active ? "Activo" : "Inactivo"}
                </span>
                <div className="provider-title">
                  <h3 className="provider-name">{p.name}</h3>
                  {p.company ? <p className="provider-company">{p.company}</p> : null}
                </div>
                <div className="provider-card-actions">
                  <button
                    className="icon-btn"
                    title={p.active ? "Desactivar" : "Activar"}
                    onClick={() => onToggle(p)}
                    disabled={workingId === p.id}
                  >
                    <ToggleIcon on={!!p.active} />
                  </button>
                  <button className="icon-btn edit" title="Editar" onClick={() => onEdit(p)}>
                    <EditIcon />
                  </button>
                  <button
                    className="icon-btn delete"
                    title="Eliminar"
                    onClick={() => onDelete(p.id)}
                    disabled={workingId === p.id}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>

              <div className="provider-card-body">
                <div className="row">
                  <span className="label">Tipo:</span>
                  <span className="value">{getTipoLabel(p.tipo)}</span>
                </div>
                {p.direccion && (
                  <div className="row">
                    <span className="label">Dirección:</span>
                    <span className="value">{p.direccion}</span>
                  </div>
                )}
                <div className="row">
                  <span className="label">Email:</span>
                  <span className="value">{p.email || "—"}</span>
                </div>
                <div className="row">
                  <span className="label">Teléfono:</span>
                  <span className="value">{p.phone || "—"}</span>
                </div>
                {p.notes && (
                  <div className="row">
                    <span className="label">Notas:</span>
                    <span className="value">{p.notes}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{form.id ? "Editar proveedor" : "Agregar proveedor"}</h2>
            <form className="form-grid" onSubmit={onSubmit}>
              <label>
                <span>Nombre *</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Martín Gómez"
                  required
                />
              </label>

              <label>
                <span>Empresa</span>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Ej: Productos Barber SRL"
                />
              </label>

              <label>
                <span>Tipo *</span>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  required
                >
                  <option value="productos_cabello">Productos para el cabello</option>
                </select>
              </label>

              <label>
                <span>Dirección</span>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  placeholder="Ej: Av. Corrientes 1234, CABA"
                />
              </label>

              <div className="grid-2">
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="proveedor@mail.com"
                  />
                </label>

                <label>
                  <span>Teléfono</span>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+54 9 11 1234 5678"
                  />
                </label>
              </div>

              <label>
                <span>Notas</span>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Observaciones, entregas, etc."
                />
              </label>

              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Activo
              </label>

              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? "Guardando…" : form.id ? "Guardar cambios" : "Crear proveedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}