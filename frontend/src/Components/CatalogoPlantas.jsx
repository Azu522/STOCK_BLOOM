import React, { useState, useEffect, useMemo, useRef } from 'react';
import './CatalogoPlantas.css';
import { ApiStockBloom } from '../Service/ApiStockBloom';

export const CatalogoPlantas = () => {
    const [plantas, setPlants] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [indiceSugerencia, setIndiceSugerencia] = useState(-1);
    const [plantaAEliminar, setPlantaAEliminar] = useState(null);
    const formularioRef = useRef(null);
    const nombreComunInputRef = useRef(null);

    const [form, setForm] = useState({
        id_planta: null,
        nombre_comun: '',
        nombre_cientifico: '',
        stock: '',
        ambiente: '',
        temporada: '',
        categoria: '',
        precio_mayoreo: '',
        precio_menudeo: '',
        descripcion: ''
    });

    const [modalConfig, setModalConfig] = useState({
        mostrar: false,
        tipo: 'exito',
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

    const obtenerDatos = async () => {
        try {
            const data = await ApiStockBloom.obtenerPlantas();
            setPlants(data || []);
        } catch (error) {
            console.error('Error al recuperar catalogo de la tabla planta:', error);
        }
    };

    useEffect(() => {
        obtenerDatos();

        const sincronizar = () => obtenerDatos();
        const intervalo = setInterval(sincronizar, 8000);
        window.addEventListener('stockbloom:data-changed', sincronizar);

        return () => {
            clearInterval(intervalo);
            window.removeEventListener('stockbloom:data-changed', sincronizar);
        };
    }, []);

    const sugerencias = useMemo(() => {
        if (!busqueda.trim()) return [];
        return plantas.filter(p =>
            p.nombre_comun?.toLowerCase().includes(busqueda.toLowerCase()) ||
            p.nombre_cientifico?.toLowerCase().includes(busqueda.toLowerCase())
        );
    }, [busqueda, plantas]);

    useEffect(() => {
        setIndiceSugerencia(sugerencias.length > 0 ? 0 : -1);
    }, [sugerencias.length, busqueda]);

    useEffect(() => {
        document
            .querySelector('.catalogo-main .dropdown-lista .dropdown-item-activo')
            ?.scrollIntoView({ block: 'nearest' });
    }, [indiceSugerencia]);

    const plantasBajoStock = useMemo(() => {
        return plantas.filter(p => (parseInt(p.stock) || 0) <= 30);
    }, [plantas]);

    const seleccionarPlantaParaEditar = (planta) => {
        setForm({
            id_planta: planta.id_planta || null,
            nombre_comun: planta.nombre_comun || '',
            nombre_cientifico: planta.nombre_cientifico || '',
            stock: planta.stock || '',
            ambiente: planta.ambiente || '',
            temporada: planta.temporada || '',
            categoria: planta.categoria || '',
            precio_mayoreo: planta.precio_mayoreo || '',
            precio_menudeo: planta.precio_menudeo || '',
            descripcion: planta.descripcion || ''
        });
        setBusqueda('');
        setIndiceSugerencia(-1);

        requestAnimationFrame(() => {
            formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            nombreComunInputRef.current?.focus({ preventScroll: true });
        });
    };

    const manejarTeclaBusqueda = (event) => {
        if (!busqueda.trim() || sugerencias.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setIndiceSugerencia(prev => (prev + 1) % sugerencias.length);
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setIndiceSugerencia(prev => (prev <= 0 ? sugerencias.length - 1 : prev - 1));
        }

        if (event.key === 'Enter' && indiceSugerencia >= 0) {
            event.preventDefault();
            seleccionarPlantaParaEditar(sugerencias[indiceSugerencia]);
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            setBusqueda('');
            setIndiceSugerencia(-1);
        }
    };

    const solicitarEliminarPlanta = (planta) => {
        setPlantaAEliminar(planta);
    };

    const confirmarEliminacionPlanta = async () => {
        if (!plantaAEliminar) return;

        const planta = plantaAEliminar;
        setPlantaAEliminar(null);

        try {
            if (typeof ApiStockBloom.eliminarPlanta !== 'function') {
                throw new TypeError("La funcion 'eliminarPlanta' no esta definida en ApiStockBloom.js");
            }

            const res = await ApiStockBloom.eliminarPlanta(planta.id_planta);

            if (res && res.success) {
                setModalConfig({
                    mostrar: true,
                    tipo: 'exito',
                    titulo: 'Planta eliminada',
                    mensaje: `La planta ${planta.nombre_comun} fue eliminada correctamente del catalogo.`
                });

                if (form.id_planta === planta.id_planta) {
                    limpiarFormulario();
                }

                obtenerDatos();
            } else {
                setModalConfig({
                    mostrar: true,
                    tipo: 'error',
                    titulo: 'No se pudo eliminar',
                    mensaje: res.error || 'La planta no pudo eliminarse. Intenta nuevamente.'
                });
            }
        } catch (error) {
            console.error('Error al eliminar planta:', error);
            setModalConfig({
                mostrar: true,
                tipo: 'error',
                titulo: 'Error de conexion',
                mensaje: error.message || 'Sin respuesta por parte del servicio ApiStockBloom.'
            });
        }
    };

    useEffect(() => {
        if (!plantaAEliminar) return;

        const manejarTeclasEliminacion = (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                confirmarEliminacionPlanta();
            }

            if (event.key === 'Escape') {
                event.preventDefault();
                setPlantaAEliminar(null);
            }
        };

        document.addEventListener('keydown', manejarTeclasEliminacion);
        return () => document.removeEventListener('keydown', manejarTeclasEliminacion);
    }, [plantaAEliminar]);

    const manejarEnvio = async (e) => {
        e.preventDefault();

        try {
            const payload = {
                ...form,
                stock: Number(form.stock),
                precio_mayoreo: Number(form.precio_mayoreo),
                precio_menudeo: Number(form.precio_menudeo)
            };

            if (form.id_planta) {
                if (typeof ApiStockBloom.actualizarPlanta !== 'function') {
                    throw new TypeError("La funcion 'actualizarPlanta' no esta definida en ApiStockBloom.js");
                }

                const res = await ApiStockBloom.actualizarPlanta(form.id_planta, payload);

                if (res && res.success) {
                    setModalConfig({
                        mostrar: true,
                        tipo: 'edicion',
                        titulo: 'Registro actualizado',
                        mensaje: `Los datos de la planta ${form.nombre_comun} se actualizaron correctamente.`
                    });
                    limpiarFormulario();
                    obtenerDatos();
                } else {
                    setModalConfig({
                        mostrar: true,
                        tipo: 'error',
                        titulo: 'Error de actualizacion',
                        mensaje: res.error || 'Hubo un problema al actualizar la planta.'
                    });
                }
            } else {
                if (typeof ApiStockBloom.registrarPlanta !== 'function') {
                    throw new TypeError("La funcion 'registrarPlanta' no esta definida en ApiStockBloom.js");
                }

                const res = await ApiStockBloom.registrarPlanta(payload);

                if (res && res.success) {
                    setModalConfig({
                        mostrar: true,
                        tipo: 'exito',
                        titulo: 'Planta registrada',
                        mensaje: `La planta ${form.nombre_comun} fue añadida exitosamente al catalogo.`
                    });
                    limpiarFormulario();
                    obtenerDatos();
                } else {
                    setModalConfig({
                        mostrar: true,
                        tipo: 'error',
                        titulo: 'Error de registro',
                        mensaje: res.error || 'Esta planta ya se encuentra registrada en la base de datos.'
                    });
                }
            }
        } catch (error) {
            console.error('Error en la operacion del catalogo:', error);
            setModalConfig({
                mostrar: true,
                tipo: 'error',
                titulo: 'Error de conexion',
                mensaje: error.message || 'Sin respuesta por parte del servicio ApiStockBloom.'
            });
        }
    };

    const limpiarFormulario = () => {
        setForm({
            id_planta: null,
            nombre_comun: '',
            nombre_cientifico: '',
            stock: '',
            ambiente: '',
            temporada: '',
            categoria: '',
            precio_mayoreo: '',
            precio_menudeo: '',
            descripcion: ''
        });
        setBusqueda('');
    };

    const obtenerEstilosModal = () => {
        const estilos = {
            exito: { bgIcono: '#e8f5e9', borderIcono: '#a5d6a7', colorIcono: '#2e7d32', bgBoton: '#2e7d32', icono: 'OK' },
            edicion: { bgIcono: '#e3f2fd', borderIcono: '#90caf9', colorIcono: '#1e88e5', bgBoton: '#1e88e5', icono: 'OK' },
            error: { bgIcono: '#ffebee', borderIcono: '#ef9a9a', colorIcono: '#c62828', bgBoton: '#c62828', icono: '!' }
        };
        return estilos[modalConfig.tipo] || estilos.exito;
    };

    return (
        <div className="catalogo-main">
            <h2 className="titulo-seccion">🌱 Inventario de Plantas (Catalogo)</h2>

            {plantasBajoStock.length > 0 && (
                <div className="alerta-stock-global">
                    <span className="icono-alerta">!</span>
                    <div className="mensaje-alerta">
                        <strong>Alerta de inventario bajo!</strong> Hay {plantasBajoStock.length} planta(s) con stock critico (30 piezas o menos):
                        <div className="lista-plantas-alerta">
                            {plantasBajoStock.map((p, idx) => (
                                <span key={p.id_planta} className="item-alerta-tag">
                                    {p.nombre_comun} (<strong>{p.stock || 0}</strong> pzas)
                                    {idx < plantasBajoStock.length - 1 ? ', ' : ''}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="buscador-seccion">
                <div className="buscador-contenedor">
                    <span className="buscador-label">Buscar para editar:</span>
                    <div className="input-buscador-wrapper">
                        <input
                            type="text"
                            className="input-busqueda"
                            placeholder="Escribe el nombre de la planta a buscar..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            onKeyDown={manejarTeclaBusqueda}
                        />
                        {busqueda && (
                            <ul className="dropdown-lista">
                                {sugerencias.length > 0 ? (
                                    sugerencias.map((p, index) => (
                                        <li
                                            key={p.id_planta}
                                            className={index === indiceSugerencia ? 'dropdown-item-activo' : ''}
                                            onMouseEnter={() => setIndiceSugerencia(index)}
                                            onClick={() => seleccionarPlantaParaEditar(p)}
                                        >
                                            <span className="sug-nombre">{p.nombre_comun}</span>
                                            {p.nombre_cientifico && <span className="sug-cientifico">({p.nombre_cientifico})</span>}
                                            <span className="sug-stock">Stock: {p.stock || 0} pzas</span>
                                        </li>
                                    ))
                                ) : (
                                    <li className="no-sugerencias">No se encontraron plantas.</li>
                                )}
                            </ul>
                        )}
                    </div>
                </div>

                {form.id_planta && (
                    <button type="button" onClick={limpiarFormulario} className="btn-cancelar-edicion">
                        Cancelar edicion
                    </button>
                )}
            </div>

            <div className="formulario-tarjeta" ref={formularioRef}>
                <div className="formulario-header">
                    <h3>{form.id_planta ? `📝 Editando planta: ${form.nombre_comun} (ID #${form.id_planta})` : '🌿 Registrar nueva planta'}</h3>
                </div>

                <form onSubmit={manejarEnvio} className="form-catalogo">
                    <div className="grid-formulario">
                        <div className="campo-form">
                            <label>Nombre comun</label>
                            <input
                                ref={nombreComunInputRef}
                                type="text"
                                placeholder="Ej. Nochebuena"
                                value={form.nombre_comun}
                                onChange={e => setForm({ ...form, nombre_comun: e.target.value })}
                                required
                            />
                        </div>

                        <div className="campo-form">
                            <label>Nombre cientifico</label>
                            <input
                                type="text"
                                placeholder="Ej. Euphorbia pulcherrima"
                                value={form.nombre_cientifico}
                                onChange={e => setForm({ ...form, nombre_cientifico: e.target.value })}
                            />
                        </div>

                        <div className="campo-form">
                            <label>Stock inicial / actual</label>
                            <input
                                type="number"
                                placeholder="Cantidad disponible"
                                value={form.stock}
                                onChange={e => setForm({ ...form, stock: e.target.value })}
                                required
                                min="0"
                            />
                        </div>

                        <div className="campo-form">
                            <label>Ambiente</label>
                            <select value={form.ambiente} onChange={e => setForm({ ...form, ambiente: e.target.value })} required>
                                <option value="">🌿 Seleccione...</option>
                                <option value="Sombra">🌥️ Sombra</option>
                                <option value="Sol directo">☀️ Sol directo</option>
                                <option value="Mixta">🌤️ Mixta</option>
                            </select>
                        </div>

                        <div className="campo-form">
                            <label>Temporada</label>
                            <select value={form.temporada} onChange={e => setForm({ ...form, temporada: e.target.value })} required>
                                <option value="">📅 Seleccione...</option>
                                <option value="Primavera">🌸 Primavera</option>
                                <option value="Verano">☀️ Verano</option>
                                <option value="Otono">🍂 Otono</option>
                                <option value="Invierno">❄️ Invierno</option>
                                <option value="Todo el año">🌱 Todo el año</option>
                            </select>
                        </div>

                        <div className="campo-form">
                            <label>Categoria</label>
                            <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} required>
                                <option value="">🏷️ Seleccione...</option>
                                <option value="Hortalizas y frutos">🥬 Hortalizas y frutos</option>
                                <option value="Interior y ornamentales">🪴 Interior y ornamentales</option>
                                <option value="Hierbas aromaticas y medicinales">🌿 Hierbas aromaticas y medicinales</option>
                                <option value="Flores de ornato y temporada">🌼 Flores de ornato y temporada</option>
                            </select>
                        </div>

                        <div className="campo-form">
                            <label>Precio mayoreo ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={form.precio_mayoreo}
                                onChange={e => setForm({ ...form, precio_mayoreo: e.target.value })}
                                required
                                min="0"
                            />
                        </div>

                        <div className="campo-form">
                            <label>Precio menudeo ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={form.precio_menudeo}
                                onChange={e => setForm({ ...form, precio_menudeo: e.target.value })}
                                required
                                min="0"
                            />
                        </div>

                        <div className="campo-form campo-completo">
                            <label>Descripcion / cuidados especiales</label>
                            <textarea
                                placeholder="Describe el riego, la luz o notas especiales de cuidado..."
                                rows="3"
                                value={form.descripcion}
                                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-acciones">
                        <button type="submit" className={`btn-submit ${form.id_planta ? 'btn-editando' : 'btn-guardando'}`}>
                            {form.id_planta ? 'Guardar cambios' : 'Agregar al catalogo'}
                        </button>
                        {form.id_planta && (
                            <button type="button" className="btn-cancelar-secundario" onClick={limpiarFormulario}>
                                Descartar cambios
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="tabla-seccion">
                <div className="tabla-header">
                    <h3>📋 Listado de existencias</h3>
                </div>

                <div className="tabla-responsive">
                    <table className="tabla-inventario">
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>ID</th>
                                <th>Nombre comun</th>
                                <th>Cientifico</th>
                                <th>Stock</th>
                                <th>Ambiente</th>
                                <th>Temporada</th>
                                <th>Categoria</th>
                                <th>Mayoreo</th>
                                <th>Menudeo</th>
                                <th style={{ width: '170px' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {plantas.length > 0 ? (
                                plantas.map((p) => (
                                    <tr key={p.id_planta}>
                                        <td><strong>#{p.id_planta}</strong></td>
                                        <td className="txt-nombre-comun">{p.nombre_comun}</td>
                                        <td><em className="txt-secundario">{p.nombre_cientifico || '-'}</em></td>
                                        <td>
                                            <span className={`badge-stock ${(parseInt(p.stock) || 0) <= 30 ? 'stock-bajo' : 'stock-suficiente'}`}>
                                                {p.stock || 0} pzas
                                            </span>
                                        </td>
                                        <td>{p.ambiente}</td>
                                        <td>{p.temporada}</td>
                                        <td>{p.categoria}</td>
                                        <td className="txt-precio">${parseFloat(p.precio_mayoreo || 0).toFixed(2)}</td>
                                        <td className="txt-precio">${parseFloat(p.precio_menudeo || 0).toFixed(2)}</td>
                                        <td>
                                            <div className="acciones-planta">
                                                <button
                                                    type="button"
                                                    className="btn-editar-fila"
                                                    onClick={() => seleccionarPlantaParaEditar(p)}
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-eliminar-planta"
                                                    onClick={() => solicitarEliminarPlanta(p)}
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="10" className="tabla-vacia">
                                        No hay registros cargados en la base de datos de Stock Bloom.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {plantaAEliminar && (
                <div className="modal-overlay">
                    <div className="modal-contenido modal-eliminar-planta">
                        <div className="modal-icono-contenedor eliminar-icono">X</div>
                        <h3>🗑️ Eliminar planta</h3>
                        <p>
                            ¿Deseas eliminar la planta <strong>{plantaAEliminar.nombre_comun}</strong> del catalogo?
                        </p>
                        <div className="modal-acciones-eliminar">
                            <button
                                type="button"
                                className="modal-boton-cancelar"
                                onClick={() => setPlantaAEliminar(null)}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className="modal-boton-eliminar"
                                onClick={confirmarEliminacionPlanta}
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modalConfig.mostrar && (
                <div className="modal-overlay">
                    <div className="modal-contenido" style={{ borderTopColor: obtenerEstilosModal().borderIcono }}>
                        <div
                            className="modal-icono-contenedor"
                            style={{
                                backgroundColor: obtenerEstilosModal().bgIcono,
                                color: obtenerEstilosModal().colorIcono
                            }}
                        >
                            {obtenerEstilosModal().icono}
                        </div>
                        <h3>{modalConfig.titulo}</h3>
                        <p>{modalConfig.mensaje}</p>
                        <button
                            className="modal-boton-aceptar"
                            style={{ backgroundColor: obtenerEstilosModal().bgBoton }}
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
