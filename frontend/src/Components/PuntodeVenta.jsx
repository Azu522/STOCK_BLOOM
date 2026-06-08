import React, { useState, useEffect, useMemo } from 'react';
import './Venta.css';
import logoInvernadero from '../assets/logo.jpeg';
import { ApiStockBloom } from '../Service/ApiStockBloom';

const formatearFechaLocal = (fecha = new Date()) => {
    const pad = (valor) => String(valor).padStart(2, '0');
    return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())} ${pad(fecha.getHours())}:${pad(fecha.getMinutes())}:${pad(fecha.getSeconds())}`;
};

export const PuntodeVenta = ({ user }) => {
    const [busqueda, setBusqueda] = useState('');
    const [plantas, setPlantas] = useState([]);
    const [carrito, setCarrito] = useState([]);
    const [modoVenta, setModoVenta] = useState('menudeo');
    const metodoPago = 'efectivo';
    const [efectivoRecibido, setEfectivoRecibido] = useState('');
    const [mostrarTicket, setMostrarTicket] = useState(false);
    const [modalConfig, setModalConfig] = useState({ mostrar: false, tipo: '', titulo: '', mensaje: '' });
    const [ventaRegistrada, setVentaRegistrada] = useState(null); // Almacena los datos finales para el ticket

    const cargarPlantas = async () => {
        try {
            const data = await ApiStockBloom.obtenerPlantas();
            setPlantas(data || []);
        } catch (error) {
            console.error("Error al obtener plantas:", error);
        }
    };

    useEffect(() => {
        cargarPlantas();

        const sincronizar = () => cargarPlantas();
        const intervalo = setInterval(sincronizar, 8000);
        window.addEventListener('stockbloom:data-changed', sincronizar);

        return () => {
            clearInterval(intervalo);
            window.removeEventListener('stockbloom:data-changed', sincronizar);
        };
    }, []);

    useEffect(() => {
        if (!modalConfig.mostrar && !mostrarTicket) return;

        const cerrarConEnter = (event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();

            if (modalConfig.mostrar) {
                setModalConfig(prev => ({ ...prev, mostrar: false }));
                return;
            }

            if (mostrarTicket) {
                setMostrarTicket(false);
                setVentaRegistrada(null);
                limpiarCarrito();
            }
        };

        document.addEventListener('keydown', cerrarConEnter);
        return () => document.removeEventListener('keydown', cerrarConEnter);
    }, [modalConfig.mostrar, mostrarTicket]);

    // Filtrar sugerencias de plantas
    const sugerencias = useMemo(() => {
        if (!busqueda.trim()) return [];
        return plantas.filter(p => 
            p.nombre_comun?.toLowerCase().includes(busqueda.toLowerCase()) ||
            p.nombre_cientifico?.toLowerCase().includes(busqueda.toLowerCase())
        );
    }, [busqueda, plantas]);

    // Calcular el total general de la compra
    const totalGeneral = useMemo(() => 
        carrito.reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0),
    [carrito]);

    // Calcular el cambio a entregar al cliente
    const cambio = useMemo(() => {
        const pago = parseFloat(efectivoRecibido) || 0;
        return pago >= totalGeneral ? pago - totalGeneral : 0;
    }, [efectivoRecibido, totalGeneral]);

    // Validar si el pago ingresado cubre el total
    const pagoSuficiente = useMemo(() => {
        const pago = parseFloat(efectivoRecibido) || 0;
        return pago >= totalGeneral;
    }, [efectivoRecibido, totalGeneral]);

    // Extraer el ID de planta de manera robusta
    const obtenerIdPlanta = (planta) => {
        return planta.id_planta !== undefined && planta.id_planta !== null 
            ? planta.id_planta 
            : planta.id;
    };

    const obtenerPrecioPorModo = (planta, modo) => {
        return modo === 'menudeo'
            ? parseFloat(planta.precio_menudeo) || 0
            : parseFloat(planta.precio_mayoreo) || 0;
    };

    // Agregar planta al carrito
    const agregarAlCarrito = (planta) => {
        const plantaId = obtenerIdPlanta(planta);
        if (!plantaId) {
            setModalConfig({ 
                mostrar: true, 
                tipo: 'error', 
                titulo: '¡Error!', 
                mensaje: "El producto seleccionado no tiene un ID válido." 
            });
            return;
        }

        const precioUnitario = obtenerPrecioPorModo(planta, modoVenta);

        const existenteIndex = carrito.findIndex(item =>
            String(obtenerIdPlanta(item)) === String(plantaId) && item.modo_venta === modoVenta
        );

        if (existenteIndex !== -1) {
            // Incrementar cantidad de manera inmutable (sin mutar el estado)
            const nuevoCarrito = carrito.map((item, idx) => {
                if (idx === existenteIndex) {
                    const nuevaCantidad = item.cantidad + 1;
                    return { 
                        ...item, 
                        ...planta,
                        id_planta: plantaId,
                        modo_venta: modoVenta,
                        precio_unitario: precioUnitario,
                        cantidad: nuevaCantidad, 
                        subtotal: nuevaCantidad * precioUnitario 
                    };
                }
                return item;
            });
            setCarrito(nuevoCarrito);
        } else {
            // Agregar nuevo producto al carrito
            setCarrito([
                ...carrito, 
                { 
                    ...planta, 
                    id_planta: plantaId, 
                    modo_venta: modoVenta,
                    cantidad: 1, 
                    precio_unitario: precioUnitario, 
                    subtotal: precioUnitario 
                }
            ]);
        }
        setBusqueda('');
    };

    // Cambiar la cantidad manualmente en la tabla
    const cambiarCantidad = (index, valor) => {
        const nuevaCantidad = Math.max(1, parseInt(valor) || 1);
        const nuevoCarrito = carrito.map((item, idx) => {
            if (idx === index) {
                return { 
                    ...item, 
                    cantidad: nuevaCantidad, 
                    subtotal: nuevaCantidad * item.precio_unitario 
                };
            }
            return item;
        });
        setCarrito(nuevoCarrito);
    };

    const cambiarModoItem = (index, nuevoModo) => {
        const nuevoCarrito = carrito.map((item, idx) => {
            if (idx !== index) return item;

            const precioUnitario = obtenerPrecioPorModo(item, nuevoModo);
            return {
                ...item,
                modo_venta: nuevoModo,
                precio_unitario: precioUnitario,
                subtotal: item.cantidad * precioUnitario
            };
        });
        setCarrito(nuevoCarrito);
    };

    // Eliminar producto individual del carrito
    const eliminarDelCarrito = (index) => {
        setCarrito(carrito.filter((_, i) => i !== index));
    };

    // Vaciar el carrito y reiniciar los montos
    const limpiarCarrito = () => { 
        setCarrito([]); 
        setBusqueda(''); 
        setEfectivoRecibido('');
    };

    // Enviar venta a la API
    const registrarVenta = async () => {
        const idUsuario = user?.usuario?.id_usuario;
        if (!idUsuario) {
            setModalConfig({ 
                mostrar: true, 
                tipo: 'error', 
                titulo: '¡Error!', 
                mensaje: "No se detectó la sesión del usuario (cajero)." 
            });
            return;
        }

        if (carrito.length === 0) {
            setModalConfig({ 
                mostrar: true, 
                tipo: 'error', 
                titulo: 'Carrito vacío', 
                mensaje: "Agregue al menos un producto para realizar la venta." 
            });
            return;
        }

        if (!pagoSuficiente) {
            setModalConfig({ 
                mostrar: true, 
                tipo: 'error', 
                titulo: 'Pago insuficiente', 
                mensaje: `El efectivo recibido ($${(parseFloat(efectivoRecibido) || 0).toFixed(2)}) es menor al total a pagar ($${totalGeneral.toFixed(2)}).` 
            });
            return;
        }

        const fechaFormateada = formatearFechaLocal();
        const pagoFormateado = parseFloat(efectivoRecibido);

        const ventaData = {
            id_usuario: idUsuario,
            total: totalGeneral,
            fecha: fechaFormateada,
            metodo_pago: metodoPago,
            pago_con: pagoFormateado,
            cambio: cambio,
            detalles: carrito.map(item => ({
                id_planta: obtenerIdPlanta(item),
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                subtotal: item.subtotal
            }))
        };

        try {
            const respuesta = await ApiStockBloom.guardarVenta(ventaData);
            if (respuesta && respuesta.success) {
                // Hacemos un snapshot de los datos de la venta para imprimirlos en el ticket
                setVentaRegistrada({
                    folio: respuesta.id_venta || 'N/A',
                    cajero: user?.usuario?.nombre || 'Administrador',
                    fecha: new Date().toLocaleString(),
                    metodoPago: metodoPago,
                    pagoCon: pagoFormateado,
                    cambio: cambio,
                    total: totalGeneral,
                    items: [...carrito]
                });

                setModalConfig({ 
                    mostrar: true, 
                    tipo: 'exito', 
                    titulo: '¡Venta Registrada!', 
                    mensaje: `Venta por $${totalGeneral.toFixed(2)} exitosa. Cambio a entregar: $${cambio.toFixed(2)}.` 
                });
                cargarPlantas();
                setMostrarTicket(true);
            } else {
                setModalConfig({ 
                    mostrar: true, 
                    tipo: 'error', 
                    titulo: '¡Error!', 
                    mensaje: respuesta?.message || "No se pudo completar la venta." 
                });
            }
        } catch (error) {
            console.error("Error al registrar venta:", error);
            setModalConfig({ 
                mostrar: true, 
                tipo: 'error', 
                titulo: 'Error', 
                mensaje: 'No se pudo comunicar con el servidor.' 
            });
        }
    };

    const obtenerEstilosModal = () => ({
        error: { bgIcono: '#fff3e0', borderIcono: '#ffb74d', colorIcono: '#f57c00', colorTitulo: '#e65100', bgBoton: '#f57c00', icono: '⚠️' },
        exito: { bgIcono: '#e8f5e9', borderIcono: '#a5d6a7', colorIcono: '#2e7d32', colorTitulo: '#2e7d32', bgBoton: '#2e7d32', icono: '🌿' }
    }[modalConfig.tipo] || { bgIcono: '#e8f5e9', borderIcono: '#a5d6a7', colorIcono: '#2e7d32', colorTitulo: '#2e7d32', bgBoton: '#2e7d32', icono: '🌿' });

    return (
        <div className="venta-main">
            {/* ESTILO INYECTADO DIRECTO CON ALTA ESPECIFICIDAD PARA REDUCIR EL LOGOTIPO */}
            <style>{`
                /* Esto obliga al logo a reducirse sin importar el CSS global */
                div.venta-main div.ticket-header img.logo-ticket-forced {
                    width: 60px !important;
                    height: 60px !important;
                    max-width: 60px !important;
                    max-height: 60px !important;
                    min-width: 60px !important;
                    min-height: 60px !important;
                    object-fit: contain !important;
                    border-radius: 50% !important;
                    display: block !important;
                    margin: 0 auto 10px auto !important;
                    border: 2px solid var(--verde-hoja, #A8C98A) !important;
                    background: white !important;
                }
            `}</style>

            <h2 className="titulo-seccion">🛒 Punto de Venta</h2>
            
            {/* Modal de Alerta (Éxito o Error) */}
            {modalConfig.mostrar && (
                <div className="modal-overlay">
                    <div className="modal-contenido" style={{borderTopColor: obtenerEstilosModal().borderIcono}}>
                        <div className="modal-icono-contenedor" style={{background: obtenerEstilosModal().bgIcono, color: obtenerEstilosModal().colorIcono}}>
                            {obtenerEstilosModal().icono}
                        </div>
                        <h3>{modalConfig.titulo}</h3>
                        <p>{modalConfig.mensaje}</p>
                        <button 
                            className="modal-boton-aceptar"
                            style={{background: obtenerEstilosModal().bgBoton}} 
                            onClick={() => setModalConfig({...modalConfig, mostrar: false})}
                        >
                            Aceptar
                        </button>
                    </div>
                </div>
            )}

            <div className="venta-grid">
                {/* Columna Izquierda: Búsqueda y Tabla */}
                <section className="col-productos">
                    <div className="encabezado-productos">
                        <div className="modo-venta">
                            <button 
                                className={`btn-modo ${modoVenta === 'menudeo' ? 'active' : ''}`} 
                                onClick={() => setModoVenta('menudeo')}
                            >
                                🪴 Menudeo
                            </button>
                            <button 
                                className={`btn-modo ${modoVenta === 'mayoreo' ? 'active' : ''}`} 
                                onClick={() => setModoVenta('mayoreo')}
                            >
                                📦 Mayoreo
                            </button>
                        </div>
                        <div className="indicador-modo">
                            Modo activo: <strong>{modoVenta.toUpperCase()}</strong>
                        </div>
                    </div>
                    
                    <div className="buscador-contenedor">
                        <input 
                            className="input-busqueda" 
                            value={busqueda} 
                            onChange={(e) => setBusqueda(e.target.value)} 
                            placeholder="🔍 Buscar planta por nombre..." 
                        />
                        {busqueda && (
                            <ul className="dropdown-lista">
                                {sugerencias.length > 0 ? (
                                    sugerencias.map(p => {
                                        const precio = modoVenta === 'menudeo' ? p.precio_menudeo : p.precio_mayoreo;
                                        return (
                                            <li key={obtenerIdPlanta(p)} onClick={() => agregarAlCarrito(p)}>
                                                <span className="sug-nombre">{p.nombre_comun}</span>
                                                {p.nombre_cientifico && <span className="sug-cientifico">({p.nombre_cientifico})</span>}
                                                <span className="sug-precio">${parseFloat(precio).toFixed(2)}</span>
                                            </li>
                                        );
                                    })
                                ) : (
                                    <li className="no-sugerencias">No se encontraron plantas.</li>
                                )}
                            </ul>
                        )}
                    </div>

                    <div className="tabla-responsive">
                        <table className="tabla-venta">
                            <thead>
                                <tr>
                                    <th>Planta</th>
                                    <th>Tipo</th>
                                    <th style={{ width: '90px' }}>Cant.</th>
                                    <th>Precio</th>
                                    <th>Subtotal</th>
                                    <th style={{ width: '60px' }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {carrito.length > 0 ? (
                                    carrito.map((item, index) => (
                                        <tr key={index}>
                                            <td className="item-nombre">
                                                {item.nombre_comun}
                                                {item.nombre_cientifico && <small className="txt-secundario">{item.nombre_cientifico}</small>}
                                            </td>
                                            <td>
                                                <select
                                                    className="select-modo-item"
                                                    value={item.modo_venta || 'menudeo'}
                                                    onChange={(e) => cambiarModoItem(index, e.target.value)}
                                                >
                                                    <option value="menudeo">🪴 Menudeo</option>
                                                    <option value="mayoreo">📦 Mayoreo</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input 
                                                    className="input-cantidad"
                                                    type="number" 
                                                    min="1"
                                                    value={item.cantidad} 
                                                    onChange={(e) => cambiarCantidad(index, e.target.value)} 
                                                />
                                            </td>
                                            <td>${item.precio_unitario.toFixed(2)}</td>
                                            <td className="item-subtotal">${item.subtotal.toFixed(2)}</td>
                                            <td>
                                                <button className="btn-eliminar" onClick={() => eliminarDelCarrito(index)} title="Quitar planta">
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="carrito-vacio-msg">
                                            🛒 El carrito está vacío. Agrega plantas para cobrar.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Columna Derecha: Resumen de cobro */}
                <aside className="col-resumen">
                    <div className="resumen-tarjeta">
                        <h3>💵 Resumen de Cobro</h3>
                        
                        <div className="total-contenedor">
                            <span className="total-label">TOTAL A PAGAR</span>
                            <div className="total-display">${totalGeneral.toFixed(2)}</div>
                        </div>

                        {/* Selección de Método de Pago */}
                        <div className="metodo-pago-seccion">
                            <h4>Método de Pago</h4>
                            <div className="metodo-pago-opciones">
                                <label className={`metodo-pago-opcion ${metodoPago === 'efectivo' ? 'seleccionado' : ''}`}>
                                    <input 
                                        type="radio" 
                                        name="metodoPago" 
                                        value="efectivo" 
                                        checked
                                        readOnly
                                    />
                                    💵 Efectivo
                                </label>
                                {false && (
                                <label className={`metodo-pago-opcion ${metodoPago === 'tarjeta' ? 'seleccionado' : ''}`}>
                                    <input 
                                        type="radio" 
                                        name="metodoPago" 
                                        value="tarjeta" 
                                        checked={metodoPago === 'tarjeta'}
                                        onChange={() => {
                                            setMetodoPago('tarjeta');
                                            setEfectivoRecibido('');
                                        }}
                                    />
                                    💳 Tarjeta
                                </label>
                                )}
                                {false && (
                                <label className={`metodo-pago-opcion ${metodoPago === 'transferencia' ? 'seleccionado' : ''}`}>
                                    <input 
                                        type="radio" 
                                        name="metodoPago" 
                                        value="transferencia" 
                                        checked={metodoPago === 'transferencia'}
                                        onChange={() => {
                                            setMetodoPago('transferencia');
                                            setEfectivoRecibido('');
                                        }}
                                    />
                                    📲 Transf.
                                </label>
                                )}
                            </div>
                        </div>

                        {/* Detalle para Efectivo: Pago y Cambio */}
                        {metodoPago === 'efectivo' && (
                            <div className="calculadora-cambio">
                                <div className="campo-pago">
                                    <label htmlFor="pago-input">Monto Recibido ($)</label>
                                    <div className="input-prefijo">
                                        <span>$</span>
                                        <input 
                                            id="pago-input"
                                            type="number" 
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                            value={efectivoRecibido} 
                                            onChange={(e) => setEfectivoRecibido(e.target.value)} 
                                        />
                                    </div>
                                </div>

                                <div className="cambio-pantalla">
                                    <span>CAMBIO A ENTREGAR</span>
                                    <div className={`cambio-valor ${pagoSuficiente ? 'valido' : 'insuficiente'}`}>
                                        ${cambio.toFixed(2)}
                                    </div>
                                    {!pagoSuficiente && efectivoRecibido !== '' && (
                                        <small className="error-pago">Monto insuficiente.</small>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="acciones-resumen">
                            <button 
                                className="btn-cobrar" 
                                onClick={registrarVenta}
                                disabled={carrito.length === 0 || !pagoSuficiente}
                            >
                                Registrar y Cobrar
                            </button>
                            {carrito.length > 0 && (
                                <button className="btn-limpiar" onClick={limpiarCarrito}>
                                    Vaciar Carrito
                                </button>
                            )}
                        </div>
                    </div>
                </aside>
            </div>

            {/* Modal de Ticket de Compra */}
            {mostrarTicket && ventaRegistrada && (
                <div className="modal-overlay ticket-modal-overlay">
                    <div className="ticket-modal">
                        {/* Area de Impresión */}
                        <div id="seccion-ticket-imprimible" className="ticket-imprimible">
                            <div className="ticket-header">
                                {logoInvernadero ? (
                                    <img 
                                        src={logoInvernadero} 
                                        alt="Logo" 
                                        className="logo-ticket-forced" 
                                        style={{ 
                                            width: '60px', 
                                            height: '60px', 
                                            maxWidth: '60px', 
                                            maxHeight: '60px', 
                                            minWidth: '60px',
                                            minHeight: '60px',
                                            objectFit: 'contain', 
                                            borderRadius: '50%', 
                                            display: 'block', 
                                            margin: '0 auto 10px auto' 
                                        }} 
                                    />
                                ) : (
                                    <div className="ticket-logo-fallback">🌿</div>
                                )}
                                <h3>🌿 INVERNADERO STOCK BLOOM</h3>
                                <p className="ticket-subtitle">¡Cultivando vida para tu hogar!</p>
                            </div>
                            
                            <div className="ticket-info">
                                <p><strong>Folio:</strong> #{ventaRegistrada.folio}</p>
                                <p><strong>Fecha:</strong> {ventaRegistrada.fecha}</p>
                                <p><strong>Cajero:</strong> {ventaRegistrada.cajero}</p>
                                <p><strong>Método:</strong> {ventaRegistrada.metodoPago.toUpperCase()}</p>
                            </div>
                            
                            <div className="ticket-divisor">================================</div>
                            
                            <div className="ticket-detalles">
                                <div className="ticket-detalle-header">
                                    <span className="col-cant">Cant</span>
                                    <span className="col-desc">Descripción</span>
                                    <span className="col-sub">Subtotal</span>
                                </div>
                                <div className="ticket-divisor-suave">--------------------------------</div>
                                {ventaRegistrada.items.map((item, idx) => (
                                    <div className="ticket-item" key={idx}>
                                        <div className="item-fila-principal">
                                            <span className="col-cant">{item.cantidad}</span>
                                            <span className="col-desc">{item.nombre_comun}</span>
                                            <span className="col-sub">${item.subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="item-fila-secundaria">
                                            <span className="col-cant"></span>
                                            <span className="col-desc-precio">
                                                P. Unit: ${item.precio_unitario.toFixed(2)} · {(item.modo_venta || 'menudeo').toUpperCase()}
                                            </span>
                                            <span className="col-sub"></span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="ticket-divisor">================================</div>
                            
                            <div className="ticket-totales">
                                <div className="total-fila">
                                    <span>TOTAL:</span>
                                    <span className="total-destaque">${ventaRegistrada.total.toFixed(2)}</span>
                                </div>
                                <div className="total-fila">
                                    <span>Recibido:</span>
                                    <span>${ventaRegistrada.pagoCon.toFixed(2)}</span>
                                </div>
                                <div className="total-fila">
                                    <span>Cambio:</span>
                                    <span>${ventaRegistrada.cambio.toFixed(2)}</span>
                                </div>
                            </div>
                            
                            <div className="ticket-footer">
                                <p>🌿 ¡Muchas gracias por su compra! 🌿</p>
                                <p>Conserve su ticket para cualquier duda.</p>
                            </div>
                        </div>

                        {/* Botones de acción (No imprimibles) */}
                        <div className="ticket-acciones no-print">
                            <button className="btn-print-ticket" onClick={() => window.print()}>
                                🖨️ Imprimir Ticket
                            </button>
                            <button className="btn-close-ticket" onClick={() => {
                                setMostrarTicket(false); 
                                setVentaRegistrada(null);
                                limpiarCarrito();
                            }}>
                                Cerrar y Nueva Venta
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        
    );
    
};
