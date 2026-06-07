import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './Components/Sidebar';
import { Login } from './Components/Login';
import { ControlUsuarios } from './Components/ControlUsuarios';
import { ProduccionInterna } from './Components/ProduccionInterna';
import { CatalogoPlantas } from './Components/CatalogoPlantas';
import { PuntodeVenta } from './Components/PuntodeVenta'; 
import { Inventario } from './Components/Inventario'; 
import logoFondo from './assets/logo1.jpeg';
import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [modulo, setModulo] = useState('produccion');
    const [mostrarBienvenida, setMostrarBienvenida] = useState(false);
    const mainRef = useRef(null);
    const usuarioSesion = user?.usuario || user;
    const privilegiosSesion = usuarioSesion?.privilegios || user?.privilegios;

    // 1. REDIRECCIÓN AUTOMÁTICA SEGÚN PRIVILEGIOS
    useEffect(() => {
        if (usuarioSesion) {
            const rolActual = usuarioSesion.rol || usuarioSesion.userRol;
            const esAdmin = rolActual?.toLowerCase() === 'administrador';
            
            // 🚀 FRENO DE MANO: Si es administrador, tiene acceso total garantizado.
            // No evaluamos restricciones ni aplicamos redirecciones forzadas.
            if (esAdmin) return;

            // Función para verificar accesos de empleados en tiempo real
            const tieneAcceso = (privilegio) => {
                return !!privilegiosSesion?.[privilegio];
            };

            // Mapeo de módulos correspondientes a cada privilegio
            const permisosModulo = {
                catalogo: 'ver_inventario',
                produccion: 'control_produccion',
                usuarios: 'administrar_usuarios',
                ventas: 'punto_venta',
                inventario: 'historial_contable'
            };

            const privilegioRequerido = permisosModulo[modulo];

            // Si el usuario Empleado no tiene acceso a la pantalla actual, lo redirigimos
            if (privilegioRequerido && !tieneAcceso(privilegioRequerido)) {
                if (tieneAcceso('ver_inventario')) {
                    setModulo('catalogo');
                } else if (tieneAcceso('control_produccion')) {
                    setModulo('produccion');
                } else if (tieneAcceso('punto_venta')) {
                    setModulo('ventas');
                } else if (tieneAcceso('administrar_usuarios')) {
                    setModulo('usuarios');
                } else if (tieneAcceso('historial_contable')) {
                    setModulo('inventario');
                } else {
                    // Si no tiene ningún privilegio asignado
                    setModulo('');
                }
            }
        }
    }, [usuarioSesion, privilegiosSesion, modulo]);

    useEffect(() => {
        if (!mostrarBienvenida) return;

        const cerrarConEnter = (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                setMostrarBienvenida(false);
            }
        };

        document.addEventListener('keydown', cerrarConEnter);
        return () => document.removeEventListener('keydown', cerrarConEnter);
    }, [mostrarBienvenida]);

    useEffect(() => {
        requestAnimationFrame(() => {
            mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        });
    }, [modulo]);

    // 2. GESTIÓN DE SESIÓN
    // Si no hay usuario activo, renderiza el componente de Login
    if (!user) {
        return (
            <Login
                onLoginSuccess={(userData) => {
                    setUser(userData);
                    setMostrarBienvenida(true);
                }}
            />
        );
    }

    // Extraemos los datos del usuario con fallbacks de seguridad
    const nombreUsuario = usuarioSesion.nombre || usuarioSesion.userName || 'Colaborador';
    const rolUsuario = usuarioSesion.rol || usuarioSesion.userRol || 'Empleado';

    // 3. INTERFAZ PRINCIPAL (Solo visible con usuario autenticado)
    return (
        <div className="app-shell">
            <Sidebar 
                usuario={nombreUsuario} 
                rol={rolUsuario} 
                privilegios={privilegiosSesion}
                moduloActivo={modulo}
                setModulo={setModulo} 
            />
            
            <main className="app-main" ref={mainRef}>
                <Watermark />
                
                <div className="app-content-layer">
                    {modulo === 'catalogo' && <CatalogoPlantas />}
                    {modulo === 'produccion' && <ProduccionInterna />}
                    {modulo === 'usuarios' && <ControlUsuarios />}
                    {modulo === 'ventas' && <PuntodeVenta user={user} />}
                    {modulo === 'inventario' && <Inventario />}
                    
                    {modulo === '' && (
                        <div style={noAccesoMensajeStyle}>
                            <h3>⚠️ Acceso Restringido</h3>
                            <p>Tu cuenta no cuenta con ningún privilegio de menú asignado. Por favor, contacta con un administrador.</p>
                        </div>
                    )}
                </div>
            </main>

            {mostrarBienvenida && (
                <BienvenidaModal
                    nombre={nombreUsuario}
                    rol={rolUsuario}
                    onClose={() => setMostrarBienvenida(false)}
                />
            )}
        </div>
    );
}

/* --- COMPONENTES AUXILIARES --- */

const Watermark = () => (
    <div style={{
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%',
        backgroundImage: `url(${logoFondo})`, 
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat', 
        backgroundSize: '800px',
        opacity: 0.08, 
        pointerEvents: 'none'
    }}></div>
);

const BienvenidaModal = ({ nombre, rol, onClose }) => (
    <div style={bienvenidaOverlayStyle}>
        <div style={bienvenidaCardStyle}>
            <button style={bienvenidaCloseStyle} onClick={onClose} aria-label="Cerrar bienvenida">
                x
            </button>

            <div style={bienvenidaImagenWrapStyle}>
                <img src={logoFondo} alt="Stock Bloom" style={bienvenidaImagenStyle} />
            </div>

            <span style={bienvenidaEyebrowStyle}>Sesion iniciada</span>
            <h2 style={bienvenidaTitleStyle}>Bienvenido, {nombre}</h2>
            <p style={bienvenidaTextStyle}>
                Tu acceso como <strong>{rol}</strong> esta listo. Ya puedes continuar trabajando en Stock Bloom.
            </p>

            <button style={bienvenidaButtonStyle} onClick={onClose}>
                Entrar al sistema
            </button>
        </div>
    </div>
);

/* --- ESTILOS EN CONSTANTES --- */
const mainContentStyle = { 
    flex: 1, 
    minWidth: 0,
    padding: 'clamp(18px, 3vw, 40px)', 
    position: 'relative', 
    background: '#FFF8E5',
    overflowX: 'auto'
};

const appShellStyle = {
    display: 'flex',
    width: '100%',
    maxWidth: '100vw',
    minHeight: '100vh',
    overflowX: 'hidden'
};

const contentLayerStyle = { 
    position: 'relative', 
    zIndex: 1 
};

const noAccesoMensajeStyle = {
    backgroundColor: '#ffffff',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
    textAlign: 'center',
    maxWidth: '500px',
    margin: '100px auto 0 auto',
    fontFamily: 'sans-serif',
    color: '#4F6B3A',
    border: '2px dashed #FF7C7C'
};

const bienvenidaOverlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: 'rgba(30, 61, 42, 0.62)',
    backdropFilter: 'blur(5px)'
};

const bienvenidaCardStyle = {
    position: 'relative',
    width: 'min(480px, 100%)',
    padding: '34px 34px 32px',
    borderRadius: '18px',
    textAlign: 'center',
    background: 'linear-gradient(180deg, #FFF8E5 0%, #FFFFFF 100%)',
    border: '2px solid #FFE79A',
    boxShadow: '0 28px 80px rgba(30, 61, 42, 0.35)',
    fontFamily: 'Arial, sans-serif',
    color: '#2E5E3E'
};

const bienvenidaCloseStyle = {
    position: 'absolute',
    top: '14px',
    right: '14px',
    width: '34px',
    height: '34px',
    border: 'none',
    borderRadius: '50%',
    background: '#D6E9CD',
    color: '#2E5E3E',
    cursor: 'pointer',
    fontWeight: 900,
    fontSize: '18px',
    lineHeight: 1
};

const bienvenidaImagenWrapStyle = {
    width: '170px',
    height: '170px',
    margin: '0 auto 18px',
    padding: '8px',
    borderRadius: '24px',
    background: 'linear-gradient(135deg, #2E5E3E, #5FA45A)',
    boxShadow: '0 18px 34px rgba(46, 94, 62, 0.24)'
};

const bienvenidaImagenStyle = {
    width: '100%',
    height: '100%',
    display: 'block',
    objectFit: 'cover',
    borderRadius: '18px',
    border: '3px solid #FFF8E5'
};

const bienvenidaEyebrowStyle = {
    display: 'inline-block',
    marginBottom: '10px',
    padding: '7px 12px',
    borderRadius: '999px',
    background: '#FFE79A',
    color: '#7A3E1E',
    fontSize: '12px',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 0
};

const bienvenidaTitleStyle = {
    margin: '0 0 10px',
    color: '#2E5E3E',
    fontSize: '32px',
    lineHeight: 1.12,
    letterSpacing: 0
};

const bienvenidaTextStyle = {
    margin: '0 auto 24px',
    maxWidth: '360px',
    color: '#4F6B3A',
    fontSize: '15px',
    lineHeight: 1.55
};

const bienvenidaButtonStyle = {
    width: '100%',
    padding: '14px 18px',
    border: 'none',
    borderRadius: '12px',
    background: '#5FA45A',
    color: '#FFFFFF',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 900,
    boxShadow: '0 12px 24px rgba(95, 164, 90, 0.28)'
};

export default App;
