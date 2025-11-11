// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext'; // ← IMPORTAR

// ===== COMPONENTES PÚBLICOS =====
import Login from './pages/Login';
import Register from './pages/Register';
import Cliente from './pages/cliente';
import Servicios from './pages/servicios';
import Reservar from './pages/Reservar';
import ReservarFecha from './pages/ReservarFecha';
import ReservarConfirmacion from './pages/ReservarConfirmacion';
import PagoTransferencia from './pages/PagoTransferencia';

// ===== PANEL CLIENTE REAL =====
import PanelCliente from './pages/PanelCliente';

// ===== COMPONENTES DE ADMIN =====
import Home from './pages/Home';
import Barbers from './pages/Barbers';
import ServiciosAdmin from './pages/Serviciosadmin';
import Proveedores from './pages/Proveedores';
import Empleados from './pages/Empleados';

// ===== COMPONENTE DE BARBERO =====
import HomeBarbero from './pages/HomeBarbero';

// Guardia privada estándar
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('authToken');
  return token ? children : <Navigate to="/login" replace />;
};

// Guardia solo-admin
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('authToken');
  const role = (localStorage.getItem('userRole') || '').toLowerCase();
  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/cliente" replace />;
  return children;
};

// Guardia solo-barbero
const BarberoRoute = ({ children }) => {
  const token = localStorage.getItem('authToken');
  const role = (localStorage.getItem('userRole') || '').toLowerCase();
  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'barbero') return <Navigate to="/cliente" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider> {/* ← ENVOLVER TODO */}
      <Router>
        <Routes>
          {/* ===== PÚBLICAS ===== */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cliente" element={<Cliente />} />
          <Route path="/servicios" element={<Servicios />} />
          <Route path="/reservar" element={<Reservar />} />
          <Route path="/reservar/fecha" element={<ReservarFecha />} />
          <Route path="/reservar/confirmacion" element={<ReservarConfirmacion />} />
          <Route path="/reservar/pago" element={<PagoTransferencia />} />
          
          {/* ===== PANEL CLIENTE (PROTEGIDO) ===== */}
          <Route
            path="/panel-cliente"
            element={
              <PrivateRoute>
                <PanelCliente />
              </PrivateRoute>
            }
          />

          {/* ===== PRIVADAS - ADMIN ===== */}
          <Route
            path="/home"
            element={
              <AdminRoute>
                <Home />
              </AdminRoute>
            }
          />

          <Route
            path="/barberos"
            element={
              <AdminRoute>
                <Barbers />
              </AdminRoute>
            }
          />

          <Route
            path="/services-admin"
            element={
              <AdminRoute>
                <ServiciosAdmin />
              </AdminRoute>
            }
          />

          <Route
            path="/proveedores"
            element={
              <AdminRoute>
                <Proveedores />
              </AdminRoute>
            }
          />

          <Route
            path="/empleados"
            element={
              <AdminRoute>
                <Empleados />
              </AdminRoute>
            }
          />

          {/* ===== PRIVADAS - BARBERO ===== */}
          <Route
            path="/barbero/home"
            element={
              <BarberoRoute>
                <HomeBarbero />
              </BarberoRoute>
            }
          />

          {/* ===== ALIAS ===== */}
          <Route path="/barbers" element={<Navigate to="/barberos" replace />} />

          {/* ===== FALLBACK ===== */}
          <Route path="*" element={<Navigate to="/cliente" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;