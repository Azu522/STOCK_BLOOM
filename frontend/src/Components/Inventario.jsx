import React, { useEffect, useMemo, useState } from 'react';
import './Inventario.css';
import { ApiStockBloom } from '../Service/ApiStockBloom';

const LIMITE_STOCK_BAJO = 30;

const obtenerFechaLocal = () => {
    const fecha = new Date();
    const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
};

export const Inventario = () => {
    const [plantas, setPlantas] = useState([]);
    const [ventasDia, setVentasDia] = useState({ resumen: { totalVentas: 0, totalImporte: 0, totalUnidades: 0 }, ventas: [] });
    const [fechaVentas, setFechaVentas] = useState(obtenerFechaLocal());
    const [busqueda, setBusqueda] = useState('');
    const [filtroStock, setFiltroStock] = useState('todos');
    const [cargando, setCargando] = useState(true);
    const [cargandoVentas, setCargandoVentas] = useState(false);
    const [error, setError] = useState('');
    const [descargando, setDescargando] = useState('');
    const [tipoReporte, setTipoReporte] = useState('');
    const [formatoReporte, setFormatoReporte] = useState('pdf');
    const [fechaReporte, setFechaReporte] = useState(obtenerFechaLocal());
    const [mesReporte, setMesReporte] = useState(String(new Date().getMonth() + 1));
    const [anioReporte, setAnioReporte] = useState(String(new Date().getFullYear()));

    useEffect(() => {
        cargarInventario();

        const sincronizar = () => cargarInventario(false);
        const intervalo = setInterval(sincronizar, 8000);
        window.addEventListener('stockbloom:data-changed', sincronizar);

        return () => {
            clearInterval(intervalo);
            window.removeEventListener('stockbloom:data-changed', sincronizar);
        };
    }, []);

    useEffect(() => {
        cargarVentasDia(fechaVentas);

        const sincronizar = () => cargarVentasDia(fechaVentas, false);
        const intervalo = setInterval(sincronizar, 8000);
        window.addEventListener('stockbloom:data-changed', sincronizar);

        return () => {
            clearInterval(intervalo);
            window.removeEventListener('stockbloom:data-changed', sincronizar);
        };
    }, [fechaVentas]);

    const cargarInventario = async (mostrarCarga = true) => {
        if (mostrarCarga) setCargando(true);
        setError('');

        try {
            const data = await ApiStockBloom.obtenerPlantas();
            setPlantas(Array.isArray(data) ? data : []);
        } catch (err) {
            setError('No se pudo cargar el inventario.');
        } finally {
            if (mostrarCarga) setCargando(false);
        }
    };

    const cargarVentasDia = async (fecha, mostrarCarga = true) => {
        if (mostrarCarga) setCargandoVentas(true);
        setError('');

        try {
            const data = await ApiStockBloom.obtenerVentasPorDia(fecha);
            setVentasDia({
                resumen: data?.resumen || { totalVentas: 0, totalImporte: 0, totalUnidades: 0 },
                ventas: Array.isArray(data?.ventas) ? data.ventas : []
            });
        } catch (err) {
            setError('No se pudieron cargar las ventas del dia.');
        } finally {
            if (mostrarCarga) setCargandoVentas(false);
        }
    };

    const resumen = useMemo(() => {
        const totalPlantas = plantas.length;
        const unidades = plantas.reduce((sum, p) => sum + (parseInt(p.stock) || 0), 0);
        const bajoStock = plantas.filter(p => (parseInt(p.stock) || 0) <= LIMITE_STOCK_BAJO).length;
        const valorInventario = plantas.reduce((sum, p) => {
            const stock = parseInt(p.stock) || 0;
            const precio = parseFloat(p.precio_menudeo) || 0;
            return sum + (stock * precio);
        }, 0);

        return { totalPlantas, unidades, bajoStock, valorInventario };
    }, [plantas]);

    const plantasFiltradas = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        return plantas.filter((planta) => {
            const stock = parseInt(planta.stock) || 0;
            const coincideTexto = !texto ||
                planta.nombre_comun?.toLowerCase().includes(texto) ||
                planta.nombre_cientifico?.toLowerCase().includes(texto) ||
                planta.categoria?.toLowerCase().includes(texto);

            const coincideStock =
                filtroStock === 'todos' ||
                (filtroStock === 'bajo' && stock <= LIMITE_STOCK_BAJO) ||
                (filtroStock === 'suficiente' && stock > LIMITE_STOCK_BAJO);

            return coincideTexto && coincideStock;
        });
    }, [plantas, busqueda, filtroStock]);

    const plantasCriticas = useMemo(() => {
        return plantas
            .filter(p => (parseInt(p.stock) || 0) <= LIMITE_STOCK_BAJO)
            .sort((a, b) => (parseInt(a.stock) || 0) - (parseInt(b.stock) || 0))
            .slice(0, 5);
    }, [plantas]);

    const descargarReporte = async (tipo = tipoReporte) => {
        if (!tipo) {
            setError('Selecciona el periodo del reporte.');
            return;
        }

        if (formatoReporte !== 'pdf') {
            setError('Por ahora el formato disponible es PDF.');
            return;
        }

        setDescargando(tipo);

        try {
            const filtros = {
                anio: anioReporte,
                mes: tipo === 'mensual' ? mesReporte : undefined,
                fecha: tipo === 'diario' ? fechaReporte : undefined
            };
            const blob = await ApiStockBloom.obtenerReporte(tipo, filtros);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Reporte_${tipo}_${tipo === 'diario' ? fechaReporte : anioReporte}${tipo === 'mensual' ? `_${mesReporte}` : ''}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError('No se pudo generar el reporte.');
        } finally {
            setDescargando('');
        }
    };

    const mesesReporte = [
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

    const aniosReporte = Array.from({ length: 6 }, (_, index) => String(new Date().getFullYear() - index));

    const formatoMoneda = (valor) => {
        return valor.toLocaleString('es-MX', {
            style: 'currency',
            currency: 'MXN'
        });
    };

    return (
        <div className="inventario-container">
            <header className="inventario-hero">
                <div>
                    <span className="inventario-eyebrow">Inventario y reportes</span>
                    <h2>📦 Panel de Existencias</h2>
                    <p>Consulta el estado actual del catalogo, detecta stock bajo y descarga reportes de ventas.</p>
                </div>
                <button className="btn-actualizar" onClick={cargarInventario} disabled={cargando}>
                    {cargando ? 'Actualizando...' : 'Actualizar'}
                </button>
            </header>

            {error && <div className="inventario-alerta error">{error}</div>}

            <section className="metricas-grid">
                <div className="metrica-card verde">
                    <span>Plantas registradas</span>
                    <strong>{resumen.totalPlantas}</strong>
                </div>
                <div className="metrica-card hoja">
                    <span>Unidades disponibles</span>
                    <strong>{resumen.unidades}</strong>
                </div>
                <div className="metrica-card alerta">
                    <span>Stock bajo</span>
                    <strong>{resumen.bajoStock}</strong>
                </div>
                <div className="metrica-card cielo">
                    <span>Valor estimado</span>
                    <strong>{formatoMoneda(resumen.valorInventario)}</strong>
                </div>
            </section>

            {plantasCriticas.length > 0 && (
                <section className="inventario-alerta">
                    <div>
                        <strong>Atencion: plantas con stock bajo</strong>
                        <p>Estas existencias estan en {LIMITE_STOCK_BAJO} piezas o menos.</p>
                    </div>
                    <div className="chips-stock">
                        {plantasCriticas.map((planta) => (
                            <span key={planta.id_planta}>
                                {planta.nombre_comun} <b>{planta.stock || 0}</b>
                            </span>
                        ))}
                    </div>
                </section>
            )}

            <section className="inventario-panel">
                <div className="panel-header">
                    <div>
                        <h3>🧾 Existencias actuales</h3>
                        <p>{plantasFiltradas.length} resultado(s) encontrados</p>
                    </div>
                    <div className="inventario-filtros">
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar planta, categoria o nombre cientifico..."
                        />
                        <select value={filtroStock} onChange={(e) => setFiltroStock(e.target.value)}>
                            <option value="todos">📦 Todo el stock</option>
                            <option value="bajo">⚠️ Stock bajo</option>
                            <option value="suficiente">✅ Stock suficiente</option>
                        </select>
                    </div>
                </div>

                <div className="tabla-inventario-wrap">
                    <table className="tabla-inventario">
                        <thead>
                            <tr>
                                <th>Planta</th>
                                <th>Categoria</th>
                                <th>Ambiente</th>
                                <th>Stock</th>
                                <th>Menudeo</th>
                                <th>Mayoreo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cargando ? (
                                <tr>
                                    <td colSpan="6" className="estado-tabla">Cargando inventario...</td>
                                </tr>
                            ) : plantasFiltradas.length > 0 ? (
                                plantasFiltradas.map((planta) => {
                                    const stock = parseInt(planta.stock) || 0;
                                    const stockBajo = stock <= LIMITE_STOCK_BAJO;

                                    return (
                                        <tr key={planta.id_planta}>
                                            <td>
                                                <strong>{planta.nombre_comun}</strong>
                                                <small>{planta.nombre_cientifico || 'Sin nombre cientifico'}</small>
                                            </td>
                                            <td>{planta.categoria || 'Sin categoria'}</td>
                                            <td>{planta.ambiente || 'No definido'}</td>
                                            <td>
                                                <span className={`stock-pill ${stockBajo ? 'bajo' : 'ok'}`}>
                                                    {stock} pzas
                                                </span>
                                            </td>
                                            <td>{formatoMoneda(parseFloat(planta.precio_menudeo) || 0)}</td>
                                            <td>{formatoMoneda(parseFloat(planta.precio_mayoreo) || 0)}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" className="estado-tabla">No hay plantas que coincidan con la busqueda.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="inventario-panel ventas-dia-panel">
                <div className="panel-header">
                    <div>
                        <h3>Ventas realizadas por dia</h3>
                        <p>Consulta el corte diario con folios, productos vendidos e importe total.</p>
                    </div>
                    <div className="inventario-filtros">
                        <input
                            type="date"
                            value={fechaVentas}
                            onChange={(e) => setFechaVentas(e.target.value)}
                        />
                        <button className="btn-actualizar" onClick={() => cargarVentasDia(fechaVentas)} disabled={cargandoVentas}>
                            {cargandoVentas ? 'Cargando...' : 'Consultar'}
                        </button>
                    </div>
                </div>

                <div className="ventas-dia-resumen">
                    <div>
                        <span>Ventas</span>
                        <strong>{ventasDia.resumen.totalVentas}</strong>
                    </div>
                    <div>
                        <span>Unidades</span>
                        <strong>{ventasDia.resumen.totalUnidades}</strong>
                    </div>
                    <div>
                        <span>Total del dia</span>
                        <strong>{formatoMoneda(Number(ventasDia.resumen.totalImporte || 0))}</strong>
                    </div>
                </div>

                <div className="tabla-inventario-wrap">
                    <table className="tabla-inventario tabla-ventas-dia">
                        <thead>
                            <tr>
                                <th>Folio</th>
                                <th>Hora</th>
                                <th>Cajero</th>
                                <th>Detalle</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cargandoVentas ? (
                                <tr>
                                    <td colSpan="5" className="estado-tabla">Cargando ventas...</td>
                                </tr>
                            ) : ventasDia.ventas.length > 0 ? (
                                ventasDia.ventas.map((venta) => (
                                    <tr key={venta.id_venta}>
                                        <td><strong>#{venta.id_venta}</strong></td>
                                        <td>{venta.fecha ? new Date(venta.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                                        <td>{venta.cajero || 'Sin cajero'}</td>
                                        <td>
                                            <div className="detalle-venta-dia">
                                                {(venta.detalles || []).map((detalle) => (
                                                    <span key={`${venta.id_venta}-${detalle.id_planta}`}>
                                                        {detalle.nombre_comun} x{detalle.cantidad}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>{formatoMoneda(Number(venta.total || 0))}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="estado-tabla">No hay ventas registradas en esta fecha.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="reportes-seccion">
                <div className="panel-header simple">
                    <div>
                        <h3>📄 Reportes PDF</h3>
                        <p>Descarga cortes listos para imprimir o archivar.</p>
                    </div>
                </div>

                <div className="descarga-recibo-card">
                    <div className="recibo-header">
                        <span className="recibo-icono">📄 PDF</span>
                        <strong>📥 DESCARGAR REPORTE</strong>
                    </div>

                    <p>Selecciona el periodo y el formato</p>

                    <div className="recibo-controles">
                        <select value={formatoReporte} onChange={(e) => setFormatoReporte(e.target.value)}>
                            <option value="pdf">📄 PDF</option>
                        </select>

                        <select value={tipoReporte} onChange={(e) => setTipoReporte(e.target.value)}>
                            <option value="" disabled>🌿 Seleccione...</option>
                            <option value="diario">📅 Por dia</option>
                            <option value="semanal">🗓️ Semanal</option>
                            <option value="mensual">📆 Por mes</option>
                            <option value="anual">📊 Por año</option>
                        </select>

                        {tipoReporte === 'diario' && (
                            <input
                                type="date"
                                value={fechaReporte}
                                onChange={(e) => setFechaReporte(e.target.value)}
                            />
                        )}

                        {tipoReporte === 'mensual' && (
                            <select value={mesReporte} onChange={(e) => setMesReporte(e.target.value)}>
                                {mesesReporte.map((mes) => (
                                    <option key={mes.value} value={mes.value}>{mes.label}</option>
                                ))}
                            </select>
                        )}

                        {tipoReporte !== 'semanal' && tipoReporte !== 'diario' && (
                            <select value={anioReporte} onChange={(e) => setAnioReporte(e.target.value)}>
                                {aniosReporte.map((anio) => (
                                    <option key={anio} value={anio}>📅 {anio}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <button
                        className="btn-descargar-recibo"
                        onClick={() => descargarReporte(tipoReporte)}
                        disabled={!tipoReporte || descargando === tipoReporte}
                    >
                        {descargando === tipoReporte ? '⏳ Generando...' : '⬇️ Descargar'}
                    </button>
                </div>
            </section>
        </div>
    );
};
