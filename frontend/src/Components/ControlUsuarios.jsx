import React, { useState, useEffect, useRef } from 'react';
import { ApiStockBloom } from '../Service/ApiStockBloom';
import './ControlUsuarios.css';

const obtenerFechaLocal = () => {
    const fecha = new Date();
    const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
};

const obtenerApellidoP = (usuario) => usuario?.apellidoP ?? usuario?.apellidop ?? usuario?.apellido_paterno ?? '';
const obtenerApellidoM = (usuario) => usuario?.apellidoM ?? usuario?.apellidom ?? usuario?.apellido_materno ?? '';

export const ControlUsuarios = () => {
    const formularioRef = useRef(null);
    // --- 1. ESTADOS DE BÚSQUEDA Y LISTADO ---
    const [telBusqueda, setTelBusqueda] = useState('');
    const [usuariosList, setUsuariosList] = useState([]); 
    const [ventasEmpleado, setVentasEmpleado] = useState({
        resumen: { totalVentas: 0, totalUnidades: 0, totalImporte: 0 },
        empleados: []
    });
    const [busquedaHistorialEmpleado, setBusquedaHistorialEmpleado] = useState('');
    const [historialEmpleado, setHistorialEmpleado] = useState([]);
    const [cargandoHistorialEmpleado, setCargandoHistorialEmpleado] = useState(false);
    const [historialConsultado, setHistorialConsultado] = useState(false);
    const [tipoPeriodoVentas, setTipoPeriodoVentas] = useState('dia');
    const [fechaInicioVentas, setFechaInicioVentas] = useState(obtenerFechaLocal());
    const [fechaFinVentas, setFechaFinVentas] = useState(obtenerFechaLocal());
    const [mesVentas, setMesVentas] = useState(String(new Date().getMonth() + 1));
    const [anioVentas, setAnioVentas] = useState(String(new Date().getFullYear()));
    const [cargandoVentasEmpleado, setCargandoVentasEmpleado] = useState(false);
    const [descargandoPdf, setDescargandoPdf] = useState(false);
    const [pdfEmpleadoId, setPdfEmpleadoId] = useState(null);
    const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);

    // --- 2. ESTADO DEL FORMULARIO PRINCIPAL ---
    const [form, setForm] = useState({
        id_usuario: null, 
        nombre: '',
        apellidoP: '',
        apellidoM: '',
        telefono: '',
        correo: '',
        contraseña: '', 
        rol: 'Empleado'
    });

    // --- 3. ESTADO DE LOS PRIVILEGIOS DE ACCESO ---
    const [privilegios, setPrivilegios] = useState({
        ver_inventario: false,
        registrar_modificar: false,
        control_produccion: false,
        punto_venta: false,
        historial_contable: false,
        administrar_usuarios: false
    });
    const tienePrivilegiosSeleccionados = Object.values(privilegios).some(Boolean);

    // --- 4. ESTADO DEL MODAL DINÁMICO ---
    const [modalConfig, setModalConfig] = useState({
        mostrar: false,
        tipo: 'exito', // 'exito', 'edicion', o 'error'
        titulo: '',
        mensaje: ''
    });

    useEffect(() => {
        if (!modalConfig.mostrar) return;

        const cerrarConEnter = (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                setModalConfig(prev => ({ ...prev, mostrar: false }));
            }
        };

        document.addEventListener('keydown', cerrarConEnter);
        return () => document.removeEventListener('keydown', cerrarConEnter);
    }, [modalConfig.mostrar]);

    // Sincronizar tabla al montar el componente
    useEffect(() => {
        obtenerTodosLosUsuarios();
        cargarVentasPorEmpleado(false);

        const sincronizar = () => {
            obtenerTodosLosUsuarios();
            cargarVentasPorEmpleado(false);
        };
        const intervalo = setInterval(sincronizar, 10000);
        window.addEventListener('stockbloom:data-changed', sincronizar);

        return () => {
            clearInterval(intervalo);
            window.removeEventListener('stockbloom:data-changed', sincronizar);
        };
    }, []);

    useEffect(() => {
        cargarVentasPorEmpleado();
        setHistorialEmpleado([]);
        setHistorialConsultado(false);
    }, [tipoPeriodoVentas, fechaInicioVentas, mesVentas, anioVentas]);

    const obtenerRangoVentasEmpleado = () => {
        if (tipoPeriodoVentas === 'anio') {
            return {
                inicio: `${anioVentas}-01-01`,
                fin: `${anioVentas}-12-31`,
                etiqueta: anioVentas
            };
        }

        if (tipoPeriodoVentas === 'mes') {
            const mes = String(mesVentas).padStart(2, '0');
            const ultimoDia = new Date(Number(anioVentas), Number(mesVentas), 0).getDate();
            return {
                inicio: `${anioVentas}-${mes}-01`,
                fin: `${anioVentas}-${mes}-${String(ultimoDia).padStart(2, '0')}`,
                etiqueta: `${anioVentas}-${mes}`
            };
        }

        return {
            inicio: fechaInicioVentas,
            fin: fechaInicioVentas,
            etiqueta: fechaInicioVentas
        };
    };

    const obtenerTodosLosUsuarios = async () => {
        try {
            const data = await ApiStockBloom.obtenerUsuarios();
            setUsuariosList(data || []);
        } catch (err) {
            console.error("Error al sincronizar la lista de personal operativo:", err);
        }
    };

    const cargarVentasPorEmpleado = async (mostrarCarga = true) => {
        if (mostrarCarga) setCargandoVentasEmpleado(true);

        try {
            const rango = obtenerRangoVentasEmpleado();
            const data = await ApiStockBloom.obtenerVentasPorEmpleado(rango.inicio, rango.fin);
            setVentasEmpleado({
                resumen: data?.resumen || { totalVentas: 0, totalUnidades: 0, totalImporte: 0 },
                empleados: Array.isArray(data?.empleados) ? data.empleados : []
            });
        } catch (err) {
            console.error('Error al cargar ventas por empleado:', err);
        } finally {
            if (mostrarCarga) setCargandoVentasEmpleado(false);
        }
    };

    const buscarHistorialEmpleadoEliminado = async () => {
        const termino = busquedaHistorialEmpleado.trim();

        if (termino.length < 2) {
            setModalConfig({
                mostrar: true,
                tipo: 'error',
                titulo: 'Busqueda historica',
                mensaje: 'Escribe al menos 2 caracteres del nombre o el ID del colaborador eliminado.'
            });
            return;
        }

        setCargandoHistorialEmpleado(true);
        setHistorialConsultado(true);

        try {
            const rango = obtenerRangoVentasEmpleado();
            const data = await ApiStockBloom.buscarVentasHistoricasEmpleado(rango.inicio, rango.fin, termino);
            setHistorialEmpleado(Array.isArray(data?.empleados) ? data.empleados : []);
        } catch (err) {
            console.error('Error al buscar historial de empleado eliminado:', err);
            setModalConfig({
                mostrar: true,
                tipo: 'error',
                titulo: 'Historial no disponible',
                mensaje: 'No se pudo consultar el historial de colaboradores eliminados.'
            });
        } finally {
            setCargandoHistorialEmpleado(false);
        }
    };

    const formatoMoneda = (valor) => {
        return Number(valor || 0).toLocaleString('es-MX', {
            style: 'currency',
            currency: 'MXN'
        });
    };

    // Lógica para cargar datos en el formulario para editar
    const cargarUsuarioEnFormulario = (empleado) => {
        if (!empleado) return;

        setForm({
            id_usuario: empleado.id_usuario || empleado.id || null,
            nombre: empleado.nombre || '',
            apellidoP: obtenerApellidoP(empleado),
            apellidoM: obtenerApellidoM(empleado),
            telefono: empleado.telefono || '',
            correo: empleado.correo || '',
            contraseña: '', 
            rol: empleado.rol === 'Administrador' ? 'Administrador' : 'Empleado'
        });

        if (empleado.privilegios && typeof empleado.privilegios === 'object') {
            setPrivilegios({
                ver_inventario: !!empleado.privilegios.ver_inventario,
                registrar_modificar: !!empleado.privilegios.registrar_modificar,
                control_produccion: !!empleado.privilegios.control_produccion,
                punto_venta: !!empleado.privilegios.punto_venta,
                historial_contable: !!empleado.privilegios.historial_contable,
                administrar_usuarios: !!empleado.privilegios.administrar_usuarios
            });
        } else {
            const esAdmin = empleado.rol === 'Administrador';
            setPrivilegios({
                ver_inventario: esAdmin,
                registrar_modificar: esAdmin,
                control_produccion: esAdmin,
                punto_venta: esAdmin,
                historial_contable: esAdmin,
                administrar_usuarios: esAdmin
            });
        }

        window.requestAnimationFrame(() => {
            formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    const manejarBusqueda = async () => {
        if (!telBusqueda.trim()) {
            setModalConfig({
                mostrar: true,
                tipo: 'error',
                titulo: 'Búsqueda Inválida',
                mensaje: 'Por favor introduce un número de teléfono válido para realizar la consulta.'
            });
            return;
        }
        try {
            const data = await ApiStockBloom.buscarPorTelefono(telBusqueda);
            if (data) {
                cargarUsuarioEnFormulario(data);
            } else {
                setModalConfig({
                    mostrar: true,
                    tipo: 'error',
                    titulo: 'Sin Resultados',
                    mensaje: 'No se encontró ningún empleado con ese número de teléfono registrado.'
                });
            }
        } catch (err) {
            setModalConfig({
                mostrar: true,
                tipo: 'error',
                titulo: 'Error de Consulta',
                mensaje: 'Ocurrió un error al realizar la consulta en la base de datos.'
            });
        }
    };

    const solicitarEliminarUsuario = (usuario) => {
        setUsuarioAEliminar(usuario);
    };

    const confirmarEliminarUsuario = async () => {
        if (!usuarioAEliminar) return;

        const usuario = usuarioAEliminar;
        const idUsuario = usuario.id_usuario || usuario.id;
        if (!idUsuario) return;

        const nombreCompleto = `${usuario.nombre || ''} ${obtenerApellidoP(usuario)}`.trim();
        setUsuarioAEliminar(null);

        try {
            const respuesta = await ApiStockBloom.eliminarUsuario(idUsuario);
            if (respuesta && respuesta.success) {
                setModalConfig({
                    mostrar: true,
                    tipo: 'exito',
                    titulo: 'Usuario eliminado',
                    mensaje: respuesta.mensaje || `El usuario ${nombreCompleto} fue eliminado correctamente.`
                });

                if (form.id_usuario === idUsuario) limpiarFormulario();
                obtenerTodosLosUsuarios();
                cargarVentasPorEmpleado(false);
            } else {
                setModalConfig({
                    mostrar: true,
                    tipo: 'error',
                    titulo: 'No se pudo eliminar',
                    mensaje: respuesta.error || 'El usuario no pudo eliminarse.'
                });
            }
        } catch (err) {
            setModalConfig({
                mostrar: true,
                tipo: 'error',
                titulo: 'Error de conexion',
                mensaje: 'No se pudo establecer comunicacion con el servidor.'
            });
        }
    };

    const descargarPdfVentasEmpleado = async (empleado = null) => {
        const rango = obtenerRangoVentasEmpleado();
        const idEmpleado = empleado?.id_usuario || null;

        if (idEmpleado) {
            setPdfEmpleadoId(idEmpleado);
        } else {
            setDescargandoPdf(true);
        }

        try {
            const blob = await ApiStockBloom.obtenerReporte('empleados', {
                inicio: rango.inicio,
                fin: rango.fin,
                id_usuario: idEmpleado
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = idEmpleado
                ? `Ventas_${empleado.empleado || 'empleado'}_${rango.etiqueta}.pdf`
                : `Ventas_empleados_${rango.etiqueta}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setModalConfig({
                mostrar: true,
                tipo: 'error',
                titulo: 'Error de PDF',
                mensaje: 'No se pudo generar el reporte de ventas por empleado.'
            });
        } finally {
            setDescargandoPdf(false);
            setPdfEmpleadoId(null);
        }
    };

    const mesesVentas = [
        { value: '1', label: '❄️ Enero' },
        { value: '2', label: '🌷 Febrero' },
        { value: '3', label: '🌱 Marzo' },
        { value: '4', label: '🌸 Abril' },
        { value: '5', label: '🌼 Mayo' },
        { value: '6', label: '☀️ Junio' },
        { value: '7', label: '🌻 Julio' },
        { value: '8', label: '🌾 Agosto' },
        { value: '9', label: '🍂 Septiembre' },
        { value: '10', label: '🎃 Octubre' },
        { value: '11', label: '🍁 Noviembre' },
        { value: '12', label: '🎄 Diciembre' }
    ];

    const aniosVentas = Array.from({ length: 6 }, (_, index) => String(new Date().getFullYear() - index));

    const manejarCambioInput = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    };

    const manejarCambioCheckbox = (e) => {
        const { name, checked } = e.target;
        setPrivilegios({ ...privilegios, [name]: checked });
    };

    const manejarEnvio = async (e) => {
        e.preventDefault();
        if (!tienePrivilegiosSeleccionados) {
            setModalConfig({
                mostrar: true,
                tipo: 'error',
                titulo: 'Privilegios requeridos',
                mensaje: 'Selecciona al menos un privilegio de acceso antes de guardar.'
            });
            return;
        }

        const datosUsuario = { ...form, contraseña: form.contraseña, privilegios };

        try {
            if (form.id_usuario) {
                const respuesta = await ApiStockBloom.actualizarUsuario(form.id_usuario, datosUsuario);
                if (respuesta && respuesta.success) {
                    setModalConfig({
                        mostrar: true,
                        tipo: 'edicion',
                        titulo: '¡Credenciales Actualizadas!',
                        mensaje: `Los datos y permisos del colaborador ${form.nombre} ${form.apellidoP} han sido modificados con éxito en el sistema.`
                    });
                    limpiarFormulario();
                    obtenerTodosLosUsuarios();
                } else {
                    setModalConfig({
                        mostrar: true,
                        tipo: 'error',
                        titulo: 'Error de Edición',
                        mensaje: respuesta.error || 'No se pudieron actualizar los datos del colaborador.'
                    });
                }
            } else {
                const respuesta = await ApiStockBloom.registrarUsuario(datosUsuario);
                if (respuesta && respuesta.success) {
                    setModalConfig({
                        mostrar: true,
                        tipo: 'exito',
                        titulo: '¡Usuario Registrado!',
                        mensaje: `El colaborador ${form.nombre} ${form.apellidoP} ha sido añadido correctamente al sistema operativo.`
                    });
                    limpiarFormulario();
                    obtenerTodosLosUsuarios(); 
                } else {
                    setModalConfig({
                        mostrar: true,
                        tipo: 'error',
                        titulo: '¡Registro Duplicado!',
                        mensaje: respuesta.error || 'Este número de teléfono ya se encuentra registrado con otro colaborador.'
                    });
                }
            }
        } catch (error) {
            console.error("Error al procesar la petición:", error);
            setModalConfig({
                mostrar: true,
                tipo: 'error',
                titulo: 'Error de Conexión',
                mensaje: 'No se pudo establecer comunicación con el servidor de Stock Bloom.'
            });
        }
    };

    const limpiarFormulario = () => {
        setForm({
            id_usuario: null,
            nombre: '',
            apellidoP: '',
            apellidoM: '',
            telefono: '',
            correo: '',
            contraseña: '',
            rol: 'Empleado'
        });
        setPrivilegios({
            ver_inventario: false,
            registrar_modificar: false,
            control_produccion: false,
            punto_venta: false,
            historial_contable: false,
            administrar_usuarios: false
        });
        setTelBusqueda('');
    };

    // Configuración dinámica de estilos para el Modal
    const obtenerEstilosModal = () => {
        const estilos = {
            edicion: { bgIcono: '#e3f2fd', borderIcono: '#90caf9', colorIcono: '#1e88e5', colorTitulo: '#1565c0', bgBoton: '#1e88e5', icono: '📝' },
            error: { bgIcono: '#ffebee', borderIcono: '#ef9a9a', colorIcono: '#c62828', colorTitulo: '#b71c1c', bgBoton: '#c62828', icono: '⚠️' },
            exito: { bgIcono: '#e8f5e9', borderIcono: '#a5d6a7', colorIcono: '#2e7d32', colorTitulo: '#2e7d32', bgBoton: '#2e7d32', icono: '👤' }
        };
        return estilos[modalConfig.tipo] || estilos.exito;
    };

    const estilosModal = obtenerEstilosModal();

    return (
        <div className="usuarios-main">
            {/* TÍTULO DEL MÓDULO */}
            <h2 className="titulo-seccion">👥 Control de Personal Operativo</h2>

            {/* 1. SECCIÓN: BARRA DE BÚSQUEDA INTERACTIVA */}
            <div className="buscador-seccion">
                <div className="buscador-contenedor">
                    <span className="buscador-label">🔍 Buscar colaborador:</span>
                    <div className="input-buscador-wrapper">
                        <input 
                            type="tel" 
                            className="input-busqueda"
                            placeholder="Buscar por teléfono (ej. 7120000000)..." 
                            value={telBusqueda}
                            onChange={(e) => setTelBusqueda(e.target.value)}
                        />
                        <button type="button" className="btn-buscar-usuario" onClick={manejarBusqueda}>
                            Buscar
                        </button>
                    </div>
                </div>
                {form.id_usuario && (
                    <button type="button" onClick={limpiarFormulario} className="btn-cancelar-edicion">
                        Cancelar Edición
                    </button>
                )}
            </div>

            {/* 2. SECCIÓN: FORMULARIO DE REGISTRO / EDICIÓN */}
            <div className="formulario-tarjeta" ref={formularioRef}>
                <div className="formulario-header">
                    <h3>{form.id_usuario ? `📝 Editando Colaborador: ${form.nombre} (ID #${form.id_usuario})` : '🌱 Registrar Nuevo Colaborador'}</h3>
                </div>

                <form onSubmit={manejarEnvio} className="form-usuarios">
                    <div className="grid-formulario">
                        <div className="campo-form">
                            <label>Nombre(s)</label>
                            <input 
                                type="text" 
                                name="nombre"
                                placeholder="Ej. Juan" 
                                value={form.nombre} 
                                onChange={manejarCambioInput}
                                required
                            />
                        </div>

                        <div className="campo-form">
                            <label>Apellido Paterno</label>
                            <input 
                                type="text" 
                                name="apellidoP"
                                placeholder="Ej. Pérez" 
                                value={form.apellidoP} 
                                onChange={manejarCambioInput}
                                required
                            />
                        </div>

                        <div className="campo-form">
                            <label>Apellido Materno</label>
                            <input 
                                type="text" 
                                name="apellidoM"
                                placeholder="Ej. Gómez" 
                                value={form.apellidoM} 
                                onChange={manejarCambioInput}
                            />
                        </div>

                        <div className="campo-form">
                            <label>Teléfono (Login)</label>
                            <input 
                                type="tel" 
                                name="telefono"
                                placeholder="Ej. 7120000000" 
                                value={form.telefono} 
                                onChange={manejarCambioInput}
                                required
                            />
                        </div>

                        <div className="campo-form">
                            <label>Correo de recuperacion</label>
                            <input
                                type="email"
                                name="correo"
                                placeholder="correo@ejemplo.com"
                                value={form.correo}
                                onChange={manejarCambioInput}
                            />
                        </div>

                        <div className="campo-form">
                            <label>{form.id_usuario ? 'Nueva contraseña de acceso' : 'Contraseña de acceso'}</label>
                            <input 
                                type="text" 
                                name="contraseña"
                                placeholder="Clave de ingreso" 
                                value={form.contraseña} 
                                onChange={manejarCambioInput}
                                required
                            />
                        </div>

                        <div className="campo-form">
                            <label>Rol Organizacional</label>
                            <select name="rol" value={form.rol} onChange={manejarCambioInput} required>
                                <option value="Empleado">👷 Empleado / Operador</option>
                                <option value="Administrador">🛡️ Administrador</option>
                            </select>
                        </div>
                    </div>

                    {/* SECCIÓN DE PRIVILEGIOS */}
                    <div className="privilegios-contenedor">
                        <h3 className="privilegios-titulo">🔐 Asignar Privilegios de Acceso al Menú</h3>
                        <div className="privilegios-grid">
                            <label className="checkbox-card">
                                <input 
                                    type="checkbox" 
                                    name="ver_inventario" 
                                    checked={privilegios.ver_inventario} 
                                    onChange={manejarCambioCheckbox} 
                                />
                                <div className="checkbox-custom-label">
                                    <span className="checkbox-icon">🔍</span>
                                    <span>Plantas</span>
                                </div>
                            </label>

                           

                            <label className="checkbox-card">
                                <input 
                                    type="checkbox" 
                                    name="control_produccion" 
                                    checked={privilegios.control_produccion} 
                                    onChange={manejarCambioCheckbox} 
                                />
                                <div className="checkbox-custom-label">
                                    <span className="checkbox-icon">🚜</span>
                                    <span>Producción</span>
                                </div>
                            </label>

                            <label className="checkbox-card">
                                <input 
                                    type="checkbox" 
                                    name="punto_venta" 
                                    checked={privilegios.punto_venta} 
                                    onChange={manejarCambioCheckbox} 
                                />
                                <div className="checkbox-custom-label">
                                    <span className="checkbox-icon">🛒</span>
                                    <span>Venta</span>
                                </div>
                            </label>

                            <label className="checkbox-card">
                                <input 
                                    type="checkbox" 
                                    name="historial_contable" 
                                    checked={privilegios.historial_contable} 
                                    onChange={manejarCambioCheckbox} 
                                />
                                <div className="checkbox-custom-label">
                                    <span className="checkbox-icon">📊</span>
                                    <span>Inventario y Reportes</span>
                                </div>
                            </label>

                            <label className="checkbox-card">
                                <input 
                                    type="checkbox" 
                                    name="administrar_usuarios" 
                                    checked={privilegios.administrar_usuarios} 
                                    onChange={manejarCambioCheckbox} 
                                />
                                <div className="checkbox-custom-label">
                                    <span className="checkbox-icon">👥</span>
                                    <span>Usuarios</span>
                                </div>
                            </label>
                        </div>
                        {!tienePrivilegiosSeleccionados && (
                            <p className="privilegios-aviso">Selecciona al menos un privilegio para poder guardar.</p>
                        )}
                    </div>

                    <div className="form-acciones">
                        <button
                            type="submit"
                            className={`btn-submit ${form.id_usuario ? 'btn-editando' : 'btn-guardando'}`}
                            disabled={!tienePrivilegiosSeleccionados}
                        >
                            {form.id_usuario ? '💾 Guardar Cambios de Personal' : '➕ Dar de Alta Colaborador'}
                        </button>
                        {form.id_usuario && (
                            <button type="button" className="btn-cancelar-secundario" onClick={limpiarFormulario}>
                                Descartar Cambios
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* 3. SECCIÓN: TABLA DE PERSONAL REGISTRADO */}
            <div className="tabla-seccion">
                <div className="tabla-header">
                    <h3>📋 Lista de Personal Registrado</h3>
                </div>
                
                <div className="tabla-responsive">
                    <table className="tabla-usuarios">
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>ID</th>
                                <th>Nombre Completo</th>
                                <th>Teléfono (Login)</th>
                                <th>Correo</th>
                                <th>Rol</th>
                                <th style={{ width: '160px' }}>Accion</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuariosList.length > 0 ? (
                                usuariosList.map((usr) => (
                                    <tr key={usr.id_usuario}>
                                        <td><strong>#{usr.id_usuario}</strong></td>
                                        <td className="txt-nombre-completo">
                                            {usr.nombre} {obtenerApellidoP(usr)} {obtenerApellidoM(usr)}
                                        </td>
                                        <td>{usr.telefono}</td>
                                        <td>{usr.correo || 'Sin correo'}</td>
                                        <td>
                                            <span className={`badge-rol ${usr.rol === 'Administrador' ? 'rol-admin' : 'rol-empleado'}`}>
                                                {usr.rol}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="acciones-usuario">
                                                <button 
                                                    type="button" 
                                                    className="btn-editar-fila"
                                                    onClick={() => cargarUsuarioEnFormulario(usr)}
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-eliminar-usuario"
                                                    onClick={() => solicitarEliminarUsuario(usr)}
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="tabla-vacia">
                                        No hay personal registrado en la base de datos de Stock Bloom.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="tabla-seccion ventas-empleados-seccion">
                <div className="tabla-header ventas-empleados-header">
                    <div>
                        <h3>📊 Ventas realizadas por empleados</h3>
                        <span>👥 Consulta y descarga el rendimiento de ventas por colaborador.</span>
                    </div>
                    <div className="ventas-empleados-filtros">
                        <select value={tipoPeriodoVentas} onChange={(e) => setTipoPeriodoVentas(e.target.value)}>
                            <option value="dia">📅 Por dia</option>
                            <option value="mes">📆 Por mes</option>
                            <option value="anio">📊 Por año</option>
                        </select>

                        {tipoPeriodoVentas === 'dia' && (
                            <input
                                type="date"
                                value={fechaInicioVentas}
                                onChange={(e) => setFechaInicioVentas(e.target.value)}
                            />
                        )}

                        {tipoPeriodoVentas === 'mes' && (
                            <select value={mesVentas} onChange={(e) => setMesVentas(e.target.value)}>
                                {mesesVentas.map((mes) => (
                                    <option key={mes.value} value={mes.value}>{mes.label}</option>
                                ))}
                            </select>
                        )}

                        {tipoPeriodoVentas !== 'dia' && (
                            <select value={anioVentas} onChange={(e) => setAnioVentas(e.target.value)}>
                                {aniosVentas.map((anio) => (
                                    <option key={anio} value={anio}>📅 {anio}</option>
                                ))}
                            </select>
                        )}
                        <button type="button" onClick={() => cargarVentasPorEmpleado()} disabled={cargandoVentasEmpleado}>
                            {cargandoVentasEmpleado ? '⏳ Consultando...' : '🔍 Consultar'}
                        </button>
                        <button type="button" onClick={() => descargarPdfVentasEmpleado()} disabled={descargandoPdf}>
                            {descargandoPdf ? '⏳ Generando...' : '📥 Descargar PDF'}
                        </button>
                    </div>
                </div>

                <div className="ventas-empleados-resumen">
                    <div>
                        <span>🧾 Ventas</span>
                        <strong>{ventasEmpleado.resumen.totalVentas}</strong>
                    </div>
                    <div>
                        <span>🌿 Unidades</span>
                        <strong>{ventasEmpleado.resumen.totalUnidades}</strong>
                    </div>
                    <div>
                        <span>💵 Total vendido</span>
                        <strong>{formatoMoneda(ventasEmpleado.resumen.totalImporte)}</strong>
                    </div>
                </div>

                <div className="tabla-responsive">
                    <table className="tabla-usuarios tabla-ventas-empleados">
                        <thead>
                            <tr>
                                <th>👤 Empleado</th>
                                <th>🧾 Ventas</th>
                                <th>🌿 Unidades</th>
                                <th>💵 Total vendido</th>
                                <th>📄 PDF</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ventasEmpleado.empleados.length > 0 ? (
                                ventasEmpleado.empleados.map((empleado) => (
                                    <tr key={empleado.id_usuario}>
                                        <td className="txt-nombre-completo">{empleado.empleado || 'Sin nombre'}</td>
                                        <td>{empleado.total_ventas}</td>
                                        <td>{empleado.total_unidades}</td>
                                        <td><strong>{formatoMoneda(empleado.total_importe)}</strong></td>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn-pdf-empleado"
                                                onClick={() => descargarPdfVentasEmpleado(empleado)}
                                                disabled={Number(empleado.total_ventas || 0) === 0 || pdfEmpleadoId === empleado.id_usuario}
                                            >
                                                {pdfEmpleadoId === empleado.id_usuario ? '⏳' : '📄 PDF'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="tabla-vacia">
                                        No hay ventas registradas por empleados en este periodo.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="historial-empleados-panel">
                    <div className="historial-empleados-header">
                        <div>
                            <h4>Historial de colaboradores eliminados</h4>
                            <span>Busca por nombre o ID para consultar ventas anteriores y descargar su PDF.</span>
                        </div>
                        <div className="historial-empleados-buscador">
                            <input
                                type="text"
                                value={busquedaHistorialEmpleado}
                                onChange={(e) => setBusquedaHistorialEmpleado(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') buscarHistorialEmpleadoEliminado();
                                }}
                                placeholder="Nombre o ID del colaborador..."
                            />
                            <button
                                type="button"
                                onClick={buscarHistorialEmpleadoEliminado}
                                disabled={cargandoHistorialEmpleado}
                            >
                                {cargandoHistorialEmpleado ? 'Consultando...' : 'Buscar historial'}
                            </button>
                        </div>
                    </div>

                    {historialConsultado && (
                        <div className="tabla-responsive historial-empleados-resultados">
                            <table className="tabla-usuarios tabla-ventas-empleados">
                                <thead>
                                    <tr>
                                        <th>Empleado eliminado</th>
                                        <th>Ventas</th>
                                        <th>Unidades</th>
                                        <th>Total vendido</th>
                                        <th>PDF</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historialEmpleado.length > 0 ? (
                                        historialEmpleado.map((empleado) => (
                                            <tr key={`historial-${empleado.id_usuario}`}>
                                                <td className="txt-nombre-completo">
                                                    {empleado.empleado || 'Sin nombre'} <span className="badge-inactivo">Inactivo</span>
                                                </td>
                                                <td>{empleado.total_ventas}</td>
                                                <td>{empleado.total_unidades}</td>
                                                <td><strong>{formatoMoneda(empleado.total_importe)}</strong></td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn-pdf-empleado"
                                                        onClick={() => descargarPdfVentasEmpleado(empleado)}
                                                        disabled={Number(empleado.total_ventas || 0) === 0 || pdfEmpleadoId === empleado.id_usuario}
                                                    >
                                                        {pdfEmpleadoId === empleado.id_usuario ? 'Generando...' : 'PDF'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="tabla-vacia">
                                                No se encontraron colaboradores eliminados con ventas en este periodo.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {usuarioAEliminar && (
                <div className="modal-overlay">
                    <div className="modal-contenido modal-confirmar-usuario">
                        <div className="modal-icono-contenedor modal-icono-alerta">!</div>
                        <h3>Eliminar usuario</h3>
                        <p>
                            ¿Deseas eliminar al usuario <strong>{usuarioAEliminar.nombre} {obtenerApellidoP(usuarioAEliminar)}</strong>? Se quitara su acceso, pero sus ventas historicas se conservaran para reportes.
                        </p>
                        <div className="modal-acciones-confirmacion">
                            <button type="button" className="modal-boton-cancelar" onClick={() => setUsuarioAEliminar(null)}>
                                Cancelar
                            </button>
                            <button type="button" className="modal-boton-eliminar" onClick={confirmarEliminarUsuario}>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. MODAL FLOTANTE INTERACTIVO */}
            {modalConfig.mostrar && (
                <div className="modal-overlay">
                    <div className="modal-contenido" style={{ borderTopColor: estilosModal.borderIcono }}>
                        <div 
                            className="modal-icono-contenedor" 
                            style={{
                                backgroundColor: estilosModal.bgIcono,
                                color: estilosModal.colorIcono
                            }}
                        >
                            {estilosModal.icono}
                        </div>
                        <h3>{modalConfig.titulo}</h3>
                        <p>{modalConfig.mensaje}</p>
                        <button 
                            className="modal-boton-aceptar" 
                            style={{ backgroundColor: estilosModal.bgBoton }} 
                            onClick={() => setModalConfig({ ...modalConfig, mostrar: false })}
                        >
                            Aceptar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
