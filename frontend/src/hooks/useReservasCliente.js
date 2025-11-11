// frontend/src/hooks/useReservasCliente.js
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  getMe,
  getContadoresReservasCliente,
  getReservasCliente,
} from "../api/reservas";

/**
 * Hook para manejar contadores + listas por pestaña en el Panel del Cliente
 */
export default function useReservasCliente() {
  const [me, setMe] = useState(null);
  const [email, setEmail] = useState("");
  const [loadingMe, setLoadingMe] = useState(true);

  const [contadores, setContadores] = useState({
    proximas: 0,
    pendientes: 0,
    confirmadas: 0,
    rechazadas: 0,
    canceladas: 0,
  });
  const [cargandoContadores, setCargandoContadores] = useState(false);

  const [tab, setTab] = useState("proximas"); // proximas | pendiente | confirmada | rechazada | cancelada
  const [lista, setLista] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(false);

  const cargarMe = useCallback(async () => {
    setLoadingMe(true);
    try {
      const data = await getMe();
      setMe(data);
      setEmail(data?.email || "");
    } catch (e) {
      console.error("getMe error", e);
    } finally {
      setLoadingMe(false);
    }
  }, []);

  const cargarContadores = useCallback(async (emailParam) => {
    setCargandoContadores(true);
    try {
      const data = await getContadoresReservasCliente(emailParam);
      setContadores((prev) => ({ ...prev, ...data }));
    } catch (e) {
      console.error("contadores error", e);
    } finally {
      setCargandoContadores(false);
    }
  }, []);

  const cargarLista = useCallback(
    async (estado, emailParam) => {
      setCargandoLista(true);
      try {
        const data = await getReservasCliente({ estado, email: emailParam });
        setLista(Array.isArray(data?.results) ? data.results : []);
      } catch (e) {
        console.error("lista reservas error", e);
        setLista([]);
      } finally {
        setCargandoLista(false);
      }
    },
    []
  );

  // Inicial: perfil
  useEffect(() => {
    cargarMe();
  }, [cargarMe]);

  // Cuando ya tengo email → contadores + lista de la tab actual
  useEffect(() => {
    if (!loadingMe && email) {
      cargarContadores(email);
      cargarLista(tab, email);
    }
  }, [loadingMe, email, tab, cargarContadores, cargarLista]);

  // Helpers visuales
  const tabs = useMemo(
    () => [
      { key: "proximas", label: `Próximas (${contadores.proximas})` },
      { key: "pendiente", label: `Pendientes (${contadores.pendientes})` },
      { key: "confirmada", label: `Confirmadas (${contadores.confirmadas})` },
      { key: "rechazada", label: `Rechazadas (${contadores.rechazadas})` },
      // Si no querés mostrar canceladas, borra esta línea y listo.
      { key: "cancelada", label: `Canceladas (${contadores.canceladas})` },
    ],
    [contadores]
  );

  return {
    me,
    email,
    loadingMe,
    contadores,
    cargandoContadores,
    tab,
    setTab,
    tabs,
    lista,
    cargandoLista,
    recargar: () => {
      if (email) {
        cargarContadores(email);
        cargarLista(tab, email);
      }
    },
  };
}
