// src/components/Sidebar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Users, FileText } from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();
  const isAdmin = (localStorage.getItem('userRole') || '').toLowerCase() === 'admin';

  const Item = ({ to, icon: Icon, label }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 px-4 py-2 rounded-md ${
          isActive ? 'bg-gray-200 font-semibold' : 'hover:bg-gray-100'
        }`
      }
      end
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <aside className="w-64 p-4 border-r border-gray-200">
      <div className="mb-4 text-xs uppercase text-gray-500">Menú</div>

      <div className="flex flex-col gap-2">
        <Item to="/home" icon={Home} label="Inicio" />
        <Item to="/cliente" icon={Users} label="Clientes" />
        <Item to="/servicios" icon={FileText} label="Servicios" />

        {/* Solo admin */}
        {isAdmin && (
          <>
            {/* ¡OJO! ruta correcta en español */}
            <Item to="/barberos" icon={Users} label="Barberos" />
            <Item to="/services-admin" icon={FileText} label="Servicios (Admin)" />
          </>
        )}
      </div>

      {/* Ejemplo de botón programático, por si lo usas */}
      {/* <button onClick={() => navigate('/barberos')} className="mt-4">Ir a Barberos</button> */}
    </aside>
  );
};

export default Sidebar;
