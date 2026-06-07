const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const notificarCambioDatos = (tipo) => {
    window.dispatchEvent(new CustomEvent('stockbloom:data-changed', { detail: { tipo } }));
};

export const ApiStockBloom = {
    // --- AUTENTICACIÓN ---
    login: async (telefono, contrasena) => {
        const response = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telefono, contrasenia: contrasena })
        });
        return await response.json();
    },

    // --- MÓDULO: CONTROL DE USUARIOS ---
    obtenerUsuarios: async () => {
        const response = await fetch(`${BASE_URL}/usuarios`);
        if (!response.ok) throw new Error("Error al obtener la lista de usuarios");
        return await response.json();
    },

    buscarPorTelefono: async (telefono) => {
        const response = await fetch(`${BASE_URL}/usuarios/buscar?telefono=${telefono}`);
        if (!response.ok) throw new Error("No se encontró el empleado");
        return await response.json();
    },

    registrarUsuario: async (datosUsuario) => {
        const payload = {
            nombre: datosUsuario.nombre,
            apellidoP: datosUsuario.apellidoP,
            apellidoM: datosUsuario.apellidoM,
            telefono: datosUsuario.telefono,
            contrasenia: datosUsuario.contraseña,
            rol: datosUsuario.rol,
            privilegios: datosUsuario.privilegios
        };

        const response = await fetch(`${BASE_URL}/usuarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data?.success) notificarCambioDatos('usuario');
        return data;
    },

    actualizarUsuario: async (id_usuario, datosUsuario) => {
        const payload = {
            nombre: datosUsuario.nombre,
            apellidoP: datosUsuario.apellidoP,
            apellidoM: datosUsuario.apellidoM,
            telefono: datosUsuario.telefono,
            contrasenia: datosUsuario.contraseña,
            rol: datosUsuario.rol,
            privilegios: datosUsuario.privilegios
        };

        const response = await fetch(`${BASE_URL}/usuarios/${id_usuario}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data?.success) notificarCambioDatos('usuario');
        return data;
    },

    // --- 🌿 MÓDULO: CATÁLOGO DE EXISTENCIAS (Sincronizado a tabla "planta") ---
    eliminarUsuario: async (id_usuario) => {
        const response = await fetch(`${BASE_URL}/usuarios/${id_usuario}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (data?.success) notificarCambioDatos('usuario');
        return data;
    },

    obtenerVentasPorEmpleado: async (inicio, fin) => {
        const params = new URLSearchParams();
        if (inicio) params.append('inicio', inicio);
        if (fin) params.append('fin', fin);

        const query = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`${BASE_URL}/ventas/empleados/resumen${query}`);
        if (!response.ok) throw new Error('Error al obtener ventas por empleado');
        return await response.json();
    },

    obtenerPlantas: async () => {
        const response = await fetch(`${BASE_URL}/planta`);
        return await response.json();
    },

    registrarPlanta: async (datosPlanta) => {
        const response = await fetch(`${BASE_URL}/planta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosPlanta)
        });
        const data = await response.json();
        if (data?.success) notificarCambioDatos('planta');
        return data;
    },

    actualizarPlanta: async (id_planta, datosPlanta) => {
        const response = await fetch(`${BASE_URL}/planta/${id_planta}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosPlanta)
        });
        const data = await response.json();
        if (data?.success) notificarCambioDatos('planta');
        return data;
    },

    eliminarPlanta: async (id_planta) => {
        const response = await fetch(`${BASE_URL}/planta/${id_planta}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (data?.success) notificarCambioDatos('planta');
        return data;
    },
guardarVenta: async (ventaData) => {
        try {
            // Cambiamos 'URL_DE_TU_API' por '${BASE_URL}'
            const response = await fetch(`${BASE_URL}/ventas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(ventaData),
            });
            
            if (!response.ok) {
                throw new Error('Error en el servidor al guardar la venta');
            }
            
            const data = await response.json();
            if (data?.success) notificarCambioDatos('venta');
            return data;
        } catch (error) {
            console.error("Error en ApiStockBloom.guardarVenta:", error);
            throw error; // Lanzamos el error para que PuntodeVenta pueda mostrarlo
        }
    },

    obtenerVentasPorDia: async (fecha) => {
        const params = new URLSearchParams();
        if (fecha) params.append('fecha', fecha);

        const query = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`${BASE_URL}/ventas${query}`);
        if (!response.ok) throw new Error('Error al obtener las ventas del dia');
        return await response.json();
    },

    // --- MÓDULOS DE PRODUCCIÓN ---
    obtenerProduccion: async () => {
        const response = await fetch(`${BASE_URL}/produccion`);
        return await response.json();
    },

    registrarProduccion: async (data) => {
        const response = await fetch(`${BASE_URL}/produccion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result?.success) notificarCambioDatos('produccion');
        return result;
    },
    // AGREGADO: Módulo de Reportes
    obtenerReporte: async (tipo, filtros = {}) => {
        const params = new URLSearchParams();
        Object.entries(filtros).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, value);
            }
        });

        const query = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`${BASE_URL}/reportes/${tipo}${query}`, {
            method: 'GET'
        });
        if (!response.ok) throw new Error(`Error al generar reporte ${tipo}`);
        return await response.blob(); // Esto permite la descarga del archivo
    }
};
