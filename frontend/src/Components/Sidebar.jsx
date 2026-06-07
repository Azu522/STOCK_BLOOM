import React from 'react';
import logo from '../assets/logo2.jpeg';
import './Sidebar.css';

export const Sidebar = ({ usuario, rol, privilegios, moduloActivo, setModulo }) => {
    const esAdmin = rol?.toLowerCase() === 'administrador';

    const tieneAcceso = (privilegio) => {
        if (esAdmin) return true;
        return !!privilegios?.[privilegio];
    };

    const menus = [
        { id: 'catalogo', privilegio: 'ver_inventario', icono: '🌱', texto: 'Plantas' },
        { id: 'produccion', privilegio: 'control_produccion', icono: '🚜', texto: 'Produccion' },
        { id: 'usuarios', privilegio: 'administrar_usuarios', icono: '👥', texto: 'Usuarios' },
        { id: 'ventas', privilegio: 'punto_venta', icono: '🛒', texto: 'Venta' },
        { id: 'inventario', privilegio: 'historial_contable', icono: '📦', texto: 'Inventario y Reportes' }
    ];

    return (
        <aside className="sidebar-container">
            <div className="sidebar-header">
                <div className="sidebar-logo-marco">
                    <img src={logo} alt="Logo Invernadero" className="sidebar-logo" />
                </div>
                <span className="sidebar-eyebrow">Invernadero</span>
                <h2 className="sidebar-titulo">🌿 Stock Bloom</h2>
            </div>

            <div className="sidebar-usuario-card">
                <span className="usuario-icono">👤</span>
                <div className="usuario-detalles">
                    <span className="usuario-nombre">{usuario}</span>
                    <span className="usuario-rol">{rol}</span>
                </div>
            </div>

            <nav className="sidebar-menus">
                <span className="sidebar-section-label">Menu principal</span>

                {menus.filter(menu => tieneAcceso(menu.privilegio)).map((menu) => (
                    <button
                        key={menu.id}
                        onClick={() => setModulo(menu.id)}
                        className={`btn-menu ${moduloActivo === menu.id ? 'activo' : ''}`}
                    >
                        <span className="menu-icono">{menu.icono}</span>
                        <span>{menu.texto}</span>
                    </button>
                ))}
            </nav>

            <button onClick={() => window.location.reload()} className="btn-menu btn-salir">
                <span className="menu-icono">X</span>
                <span>Salir del Sistema</span>
            </button>
        </aside>
    );
};
