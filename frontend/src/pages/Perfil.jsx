// src/pages/Perfil.jsx
import React from 'react';
import './Home.css';

function initials(name = 'Admin') {
  return name
    .split(' ')
    .map((n) => n[0]?.toUpperCase())
    .join('')
    .slice(0, 2);
}

function Perfil({
  admin = { name: 'Administrador', email: 'admin@barberia.com' },
  onLogout = () => {},
  onEdit = () => alert('Editar perfil (placeholder)'),
  onSettings = () => alert('Configuración (placeholder)'),
  asCard = true,
}) {
  if (asCard) {
    return (
      <div className="stat-card profile-panel">
        <div className="profile-panel-header">
          <div className="avatar large">{initials(admin.name)}</div>
          <div className="profile-panel-meta">
            <strong className="profile-panel-name">{admin.name}</strong>
            <span className="profile-panel-role">Administrador</span>
            <small className="profile-panel-email">{admin.email}</small>
          </div>
        </div>

        <div className="profile-panel-actions">
          <button className="btn-secondary" onClick={onEdit}>
            Editar perfil
          </button>
          <button className="btn-secondary" onClick={onSettings}>
            Configuración
          </button>
          <button className="btn-danger" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-panel">
      <div className="profile-panel-header">
        <div className="avatar large">{initials(admin.name)}</div>
        <div className="profile-panel-meta">
          <strong className="profile-panel-name">{admin.name}</strong>
          <span className="profile-panel-role">Administrador</span>
          <small className="profile-panel-email">{admin.email}</small>
        </div>
      </div>

      <div className="profile-panel-actions">
        <button className="btn-secondary" onClick={onEdit}>
          Editar perfil
        </button>
        <button className="btn-secondary" onClick={onSettings}>
          Configuración
        </button>
        <button className="btn-danger" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export default Perfil;