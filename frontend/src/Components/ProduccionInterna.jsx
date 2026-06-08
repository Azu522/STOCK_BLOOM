import React, { useState, useEffect, useMemo } from 'react';
import { ApiStockBloom } from '../Service/ApiStockBloom';
import './ProduccionInterna.css';

const obtenerFechaInput = (fecha) => fecha ? String(fecha).split('T')[0] : '';

export const ProduccionInterna = () => {
    const [plantas, setPlantas] = useState([]);
    const [lotes, setLotes] = useState([]);
    
    // --- 🔍 ESTADOS PARA EL BUSCADOR DE PLANTAS INTERACTIVO ---
    const [busquedaPlanta, setBusquedaPlanta] = useState('');
    const [mostrarDropdown, setMostrarDropdown] = useState(false);

    // --- 🎯 ESTADO DEL MODAL CORPORATIVO DINÁMICO ---
    const [modalConfig, setModalConfig] = useState({
        mostrar: false,
        tipo: 'exito', // 'exito' o 'error'
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

    // --- ESTADO DEL FORMULARIO ---
    const [form, setForm] = useState({ 
        id_produccion: null,
        id_planta: '', 
        cantidad: '', 
        fecha_siembra: '', 
        fecha_cosecha: '' 
    });

    const cargarHistorial = async () => {
        try {
            const p = await ApiStockBloom.obtenerPlantas();
            const l = await ApiStockBloom.obtenerProduccion();
            setPlantas(p || []);
            setLotes(l || []);
        } catch (e) { 
            console.error("Error al sincronizar datos de producción:", e); 
        }
    };

    useEffect(() => { 
        cargarHistorial();

        const sincronizar = () => cargarHistorial();
        const intervalo = setInterval(sincronizar, 8000);
        window.addEventListener('stockbloom:data-changed', sincronizar);

        return () => {
            clearInterval(intervalo);
            window.removeEventListener('stockbloom:data-changed', sincronizar);
        };
    }, []);

    // Cierra el menú desplegable si el usuario hace clic fuera del buscador
    useEffect(() => {
        const clickFuera = (e) => {
            if (!e.target.closest('.buscador-combo-container')) {
                setMostrarDropdown(false);
                // Si sale sin seleccionar, rellenar el buscador con la planta seleccionada
                const plantaSeleccionada = plantas.find(p => String(p.id_planta) === String(form.id_planta));
                if (plantaSeleccionada) {
                    setBusquedaPlanta(plantaSeleccionada.nombre_comun);
                } else {
                    setBusquedaPlanta('');
                }
            }
        };
        document.addEventListener('mousedown', clickFuera);
        return () => document.removeEventListener('mousedown', clickFuera);
    }, [form.id_planta, plantas]);

    // --- 🔍 SUGERENCIAS EN TIEMPO REAL PARA EL AUTOCOMPLETADO ---
    const sugerenciasPlanta = useMemo(() => {
        const query = busquedaPlanta.toLowerCase().trim();
        if (!query) return plantas; // Si el input está vacío, muestra toda la lista
        return plantas.filter(p => 
            p.nombre_comun?.toLowerCase().includes(query) ||
            p.nombre_cientifico?.toLowerCase().includes(query)
        );
    }, [busquedaPlanta, plantas]);

    const resumenProduccion = useMemo(() => {
        const totalLotes = lotes.length;
        const totalPiezas = lotes.reduce((sum, lote) => sum + (parseInt(lote.cantidad) || 0), 0);
        const enCrecimiento = lotes.filter(lote => !lote.fecha_cosecha).length;
        const conCosecha = lotes.filter(lote => !!lote.fecha_cosecha).length;

        return { totalLotes, totalPiezas, enCrecimiento, conCosecha };
    }, [lotes]);

    const seleccionarPlanta = (planta) => {
        setForm(prev => ({ ...prev, id_planta: planta.id_planta }));
        setBusquedaPlanta(planta.nombre_comun);
        setMostrarDropdown(false);
    };

    const manejarCambioBusqueda = (e) => {
        const valor = e.target.value;
        setBusquedaPlanta(valor);
        setForm(prev => ({ ...prev, id_planta: '' })); // Resetea la planta si borra o cambia el texto
        setMostrarDropdown(true);
    };

    const guardarLote = async (e) => {
        e.preventDefault();
        
        if (!form.id_planta) {
            setModalConfig({
                mostrar: true,
                tipo: 'error',
                titulo: 'Selección Requerida',
                mensaje: 'Por favor, selecciona una planta válida de la lista sugerida.'
            });
            return;
        }

        try {
            const plantaSeleccionada = plantas.find(p => String(p.id_planta) === String(form.id_planta));
            const nombrePlanta = plantaSeleccionada ? plantaSeleccionada.nombre_comun : 'Planta';

            const payload = {
                id_planta: Number(form.id_planta),
                cantidad: Number(form.cantidad),
                fecha_siembra: form.fecha_siembra,
                ...(form.fecha_cosecha ? { fecha_cosecha: form.fecha_cosecha } : {})
            };

            const res = form.id_produccion
                ? await ApiStockBloom.actualizarProduccion(form.id_produccion, payload)
                : await ApiStockBloom.registrarProduccion(payload);
            
            if (res && res.success) {
                setModalConfig({
                    mostrar: true,
                    tipo: 'exito',
                    titulo: form.id_produccion ? 'Lote actualizado' : 'Lote registrado',
                    mensaje: form.id_produccion
                        ? `El lote #${form.id_produccion} fue actualizado correctamente.`
                        : `El lote de cultivo para la planta [${nombrePlanta}] con ${form.cantidad} piezas ha sido agregado con éxito al sistema.`
                });

                // Limpieza de campos
                limpiarFormulario();
                cargarHistorial();
            } else {
                setModalConfig({
                    mostrar: true,
                    tipo: 'error',
                    titulo: 'Inconveniente en Registro',
                    mensaje: res.error || 'No se pudieron almacenar los datos del lote en la base de datos.'
                });
            }
        } catch (error) {
            console.error("Error al registrar el lote de producción:", error);
            setModalConfig({
                mostrar: true,
                tipo: 'error',
                titulo: 'Error de Conexión',
                mensaje: 'No se pudo establecer comunicación con el servidor de Stock Bloom.'
            });
        }
    };

    // Estilos dinámicos para el Modal corporativo
    const limpiarFormulario = () => {
        setForm({ id_produccion: null, id_planta: '', cantidad: '', fecha_siembra: '', fecha_cosecha: '' });
        setBusquedaPlanta('');
        setMostrarDropdown(false);
    };

    const cargarLoteEnFormulario = (lote) => {
        setForm({
            id_produccion: lote.id_produccion,
            id_planta: lote.id_planta,
            cantidad: lote.cantidad,
            fecha_siembra: obtenerFechaInput(lote.fecha_siembra),
            fecha_cosecha: obtenerFechaInput(lote.fecha_cosecha)
        });
        setBusquedaPlanta(lote.nombre_comun || lote.planta || '');
        setMostrarDropdown(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const eliminarLote = async (lote) => {
        if (!window.confirm(`Deseas eliminar el lote #${lote.id_produccion}?`)) return;

        try {
            const res = await ApiStockBloom.eliminarProduccion(lote.id_produccion);
            if (res && res.success) {
                setModalConfig({
                    mostrar: true,
                    tipo: 'exito',
                    titulo: 'Lote eliminado',
                    mensaje: `El lote #${lote.id_produccion} fue eliminado correctamente.`
                });
                if (form.id_produccion === lote.id_produccion) limpiarFormulario();
                cargarHistorial();
            } else {
                setModalConfig({
                    mostrar: true,
                    tipo: 'error',
                    titulo: 'No se pudo eliminar',
                    mensaje: res.error || 'No se pudo eliminar el lote de produccion.'
                });
            }
        } catch (error) {
            console.error("Error al eliminar el lote de produccion:", error);
            setModalConfig({
                mostrar: true,
                tipo: 'error',
                titulo: 'Error de Conexion',
                mensaje: 'No se pudo establecer comunicacion con el servidor de Stock Bloom.'
            });
        }
    };

    const estilosModal = modalConfig.tipo === 'exito' 
        ? { bgIcono: '#D6E9CD', borderIcono: '#A8C98A', colorIcono: '#2E5E3E', colorTitulo: '#2E5E3E', bgBoton: '#D6E9CD', icono: '🚜' }
        : { bgIcono: '#FFF2CC', borderIcono: '#FFE79A', colorIcono: '#A65E2E', colorTitulo: '#7A3E1E', bgBoton: '#FFE79A', icono: '⚠️' };

    return (
        <div className="produccion-container">
            <header className="produccion-hero">
                <div>
                    <span className="produccion-eyebrow">Cultivos internos</span>
                    <h2>🚜 Control de Producción</h2>
                    <p>Registra nuevos lotes, da seguimiento a siembras y consulta el historial operativo.</p>
                </div>
                <button type="button" className="btn-refrescar-produccion" onClick={cargarHistorial}>
                    Actualizar historial
                </button>
            </header>

            <section className="produccion-metricas">
                <div className="produccion-metrica-card">
                    <span>Lotes registrados</span>
                    <strong>{resumenProduccion.totalLotes}</strong>
                </div>
                <div className="produccion-metrica-card">
                    <span>Piezas sembradas</span>
                    <strong>{resumenProduccion.totalPiezas}</strong>
                </div>
                <div className="produccion-metrica-card">
                    <span>En crecimiento</span>
                    <strong>{resumenProduccion.enCrecimiento}</strong>
                </div>
                <div className="produccion-metrica-card">
                    <span>Con cosecha</span>
                    <strong>{resumenProduccion.conCosecha}</strong>
                </div>
            </section>
            
            {/* FORMULARIO DE REGISTRO */}
            <div className="formulario-tarjeta">
                <div className="formulario-header">
                    <div>
                        <span>{form.id_produccion ? `Editando lote #${form.id_produccion}` : 'Nuevo lote'}</span>
                        <h3>{form.id_produccion ? 'Editar cultivo' : '🌱 Registrar cultivo'}</h3>
                    </div>
                </div>

                <form onSubmit={guardarLote} className="form-produccion">
                    <div className="grid-formulario">
                        {/* Selector Autocompletable */}
                        <div className="campo-form">
                            <label>Seleccionar Planta</label>
                            <div className="buscador-combo-container">
                                <input 
                                    type="text" 
                                    className="input-busqueda-planta"
                                    placeholder="Escribe el nombre de la planta..." 
                                    value={busquedaPlanta}
                                    onChange={manejarCambioBusqueda}
                                    onFocus={() => setMostrarDropdown(true)}
                                    required
                                />
                                <input type="hidden" value={form.id_planta} required name="id_planta" />
                                
                                {mostrarDropdown && (
                                    <ul className="sugerencias-planta-lista">
                                        {sugerenciasPlanta.length > 0 ? (
                                            sugerenciasPlanta.map(p => (
                                                <li key={p.id_planta} onClick={() => seleccionarPlanta(p)}>
                                                    <span className="sug-planta-nombre">{p.nombre_comun}</span>
                                                    {p.nombre_cientifico && (
                                                        <span className="sug-planta-cientifico">({p.nombre_cientifico})</span>
                                                    )}
                                                </li>
                                            ))
                                        ) : (
                                            <li className="no-sug-planta">No se encontraron plantas coincidentes.</li>
                                        )}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className="campo-form">
                            <label>Cantidad Sembrada</label>
                            <input 
                                type="number" 
                                placeholder="Cantidad de piezas"
                                value={form.cantidad} 
                                onChange={e => setForm({...form, cantidad: e.target.value})} 
                                required 
                                min="1"
                            />
                        </div>

                        <div className="campo-form">
                            <label>Fecha de Siembra</label>
                            <input 
                                type="date" 
                                value={form.fecha_siembra} 
                                onChange={e => setForm({...form, fecha_siembra: e.target.value})} 
                                required 
                            />
                        </div>

                        <div className="campo-form">
                            <label>Fecha de Cosecha Estimada</label>
                            <input 
                                type="date" 
                                value={form.fecha_cosecha} 
                                onChange={e => setForm({...form, fecha_cosecha: e.target.value})} 
                            />
                        </div>
                    </div>

                    <div className="form-acciones">
                        <button type="submit" className="btn-submit btn-guardando">
                            {form.id_produccion ? 'Guardar cambios del lote' : 'Registrar lote de cultivo'}
                        </button>
                        {form.id_produccion && (
                            <button type="button" className="btn-cancelar-produccion" onClick={limpiarFormulario}>
                                Cancelar edicion
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* TABLA DE EXISTENCIAS */}
            <div className="tabla-seccion">
                <div className="tabla-header">
                    <div>
                        <span>Historial</span>
                        <h3>📋 Lotes de producción registrados</h3>
                    </div>
                </div>
                
                <div className="tabla-responsive">
                    <table className="tabla-produccion">
                        <thead>
                            <tr>
                                <th style={{ width: '80px' }}>Lote</th>
                                <th>Planta</th>
                                <th>Cantidad</th>
                                <th>Siembra</th>
                                <th>Cosecha</th>
                                <th style={{ width: '160px' }}>Accion</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lotes.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="tabla-vacia">
                                        No hay lotes registrados actualmente en el sistema.
                                    </td>
                                </tr>
                            ) : (
                                lotes.map(l => (
                                    <tr key={l.id_produccion}>
                                        <td><strong>#{l.id_produccion}</strong></td>
                                        <td className="txt-nombre-planta">{l.nombre_comun || l.planta}</td>
                                        <td>
                                            <span className="badge-cantidad">
                                                {l.cantidad} pzas
                                            </span>
                                        </td>
                                        <td>{l.fecha_siembra ? l.fecha_siembra.split('T')[0] : '—'}</td>
                                        <td>
                                            <span className={`badge-cosecha ${l.fecha_cosecha ? 'lote-listo' : 'lote-crecimiento'}`}>
                                                {l.fecha_cosecha ? l.fecha_cosecha.split('T')[0] : '🌱 En crecimiento'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="acciones-produccion">
                                                <button type="button" className="btn-editar-produccion" onClick={() => cargarLoteEnFormulario(l)}>
                                                    Editar
                                                </button>
                                                <button type="button" className="btn-eliminar-produccion" onClick={() => eliminarLote(l)}>
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODAL EMERGENTE CORPORATIVO INTERACTIVO --- */}
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
