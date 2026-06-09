import React, { useState } from 'react';
import { ApiStockBloom } from '../Service/ApiStockBloom';
import logo3 from '../assets/logo3.jpeg';

export const Login = ({ onLoginSuccess }) => {
    const [telefono, setTelefono] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [error, setError] = useState('');
    const [modoRecuperacion, setModoRecuperacion] = useState(false);
    const [metodoRecuperacion, setMetodoRecuperacion] = useState('telefono');
    const [identificadorRecuperacion, setIdentificadorRecuperacion] = useState('');
    const [mensajeRecuperacion, setMensajeRecuperacion] = useState(null);
    const [cargandoRecuperacion, setCargandoRecuperacion] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = await ApiStockBloom.login(telefono, contrasena);
            if (data.success) {
                onLoginSuccess(data);
            } else {
                setError(data.message || data.mensaje || 'Credenciales incorrectas');
            }
        } catch (err) {
            setError('Error al conectar con el servidor');
        }
    };

    const handleRecuperarContrasena = async (e) => {
        e.preventDefault();
        setError('');
        setMensajeRecuperacion(null);
        setCargandoRecuperacion(true);

        try {
            const data = await ApiStockBloom.recuperarContrasena(metodoRecuperacion, identificadorRecuperacion);

            if (data.success) {
                setMensajeRecuperacion({
                    tipo: 'exito',
                    texto: data.mensaje,
                    contrasenaTemporal: data.contrasenaTemporal
                });
                setContrasena('');
                if (metodoRecuperacion === 'telefono') setTelefono(identificadorRecuperacion);
            } else {
                setMensajeRecuperacion({
                    tipo: 'error',
                    texto: data.error || data.message || 'No se pudo recuperar la contraseña.'
                });
            }
        } catch (err) {
            setMensajeRecuperacion({
                tipo: 'error',
                texto: 'Error al conectar con el servidor'
            });
        } finally {
            setCargandoRecuperacion(false);
        }
    };

    return (
        <main style={pageStyle}>
            <section style={loginShellStyle}>
                <div style={brandPanelStyle}>
                    <div style={imageFrameStyle}>
                        <img src={logo3} alt="Stock Bloom" style={heroImageStyle} />
                    </div>
                    <div style={brandTextStyle}>
                        <span style={eyebrowStyle}>Invernadero George el curioso</span>
                        <h1 style={brandTitleStyle}>🌿 Stock Bloom</h1>
                        <p style={brandCopyStyle}>Control de plantas, produccion, ventas e inventario en un solo lugar.</p>
                    </div>
                </div>

                <div style={formPanelStyle}>
                    <div style={formHeaderStyle}>
                        <span style={badgeStyle}>Acceso interno</span>
                        <h2 style={formTitleStyle}>{modoRecuperacion ? 'Recuperar acceso' : 'Bienvenido'}</h2>
                        <p style={formSubtitleStyle}>
                            {modoRecuperacion
                                ? 'Elige como quieres recibir una contraseña temporal.'
                                : 'Ingresa tus credenciales para continuar.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ ...formStyle, display: modoRecuperacion ? 'none' : 'flex' }}>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Usuario</label>
                            <input
                                type="text"
                                placeholder="Telefono"
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                                style={inputStyle}
                                required
                            />
                        </div>

                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Contraseña</label>
                            <input
                                type="password"
                                placeholder="********"
                                value={contrasena}
                                onChange={(e) => setContrasena(e.target.value)}
                                style={inputStyle}
                                required
                            />
                        </div>

                        {error && <p style={errorStyle}>{error}</p>}

                        <button type="submit" style={buttonStyle}>Ingresar</button>
                        <button type="button" style={linkButtonStyle} onClick={() => setModoRecuperacion(true)}>
                            Olvide mi contraseña
                        </button>
                    </form>

                    {modoRecuperacion && (
                        <form onSubmit={handleRecuperarContrasena} style={formStyle}>
                            <div style={recoveryOptionsStyle}>
                                <label style={recoveryOptionStyle}>
                                    <input
                                        type="radio"
                                        name="metodoRecuperacion"
                                        value="telefono"
                                        checked={metodoRecuperacion === 'telefono'}
                                        onChange={(e) => setMetodoRecuperacion(e.target.value)}
                                    />
                                    Telefono
                                </label>
                                <label style={recoveryOptionStyle}>
                                    <input
                                        type="radio"
                                        name="metodoRecuperacion"
                                        value="correo"
                                        checked={metodoRecuperacion === 'correo'}
                                        onChange={(e) => setMetodoRecuperacion(e.target.value)}
                                    />
                                    Correo
                                </label>
                            </div>

                            <div style={inputGroupStyle}>
                                <label style={labelStyle}>{metodoRecuperacion === 'correo' ? 'Correo registrado' : 'Telefono registrado'}</label>
                                <input
                                    type={metodoRecuperacion === 'correo' ? 'email' : 'tel'}
                                    placeholder={metodoRecuperacion === 'correo' ? 'correo@ejemplo.com' : '7120000000'}
                                    value={identificadorRecuperacion}
                                    onChange={(e) => setIdentificadorRecuperacion(e.target.value)}
                                    style={inputStyle}
                                    required
                                />
                            </div>

                            <div style={recoveryMessageSlotStyle}>
                                {mensajeRecuperacion ? (
                                    <div style={mensajeRecuperacion.tipo === 'exito' ? successStyle : errorStyle}>
                                        <p style={messageTextStyle}>{mensajeRecuperacion.texto}</p>
                                        {mensajeRecuperacion.contrasenaTemporal && (
                                            <strong style={temporaryPasswordStyle}>
                                                Contrasena temporal: {mensajeRecuperacion.contrasenaTemporal}
                                            </strong>
                                        )}
                                    </div>
                                ) : (
                                    <div style={emptyRecoveryMessageStyle} aria-hidden="true" />
                                )}
                            </div>

                            <button type="submit" style={buttonStyle} disabled={cargandoRecuperacion}>
                                {cargandoRecuperacion ? 'Generando...' : 'Enviar contrasena temporal'}
                            </button>
                            <button
                                type="button"
                                style={secondaryButtonStyle}
                                onClick={() => {
                                    setModoRecuperacion(false);
                                    setMensajeRecuperacion(null);
                                    setError('');
                                }}
                            >
                                Volver al inicio de sesion
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
};

const pageStyle = {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 'clamp(14px, 4vw, 32px)',
    background: 'linear-gradient(135deg, rgba(255, 242, 204, 0.92) 0%, rgba(214, 233, 205, 0.82) 48%, rgba(205, 230, 242, 0.72) 100%)',
    boxSizing: 'border-box',
    overflowX: 'hidden'
};

const loginShellStyle = {
    width: 'min(980px, 100%)',
    minHeight: 'min(560px, calc(100vh - 28px))',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
    overflow: 'hidden',
    borderRadius: '18px',
    background: '#FFFDF6',
    border: '1px solid rgba(46, 94, 62, 0.16)',
    boxShadow: '0 30px 80px rgba(46, 94, 62, 0.18)'
};

const brandPanelStyle = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 'clamp(22px, 4vw, 34px)',
    background: 'linear-gradient(160deg, #173923 0%, #2E5E3E 58%, #4F6B3A 100%)',
    color: '#FFF8E5'
};

const imageFrameStyle = {
    borderRadius: '14px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 248, 229, 0.42)',
    boxShadow: '0 18px 38px rgba(0, 0, 0, 0.22)',
    background: '#FFF8E5'
};

const heroImageStyle = {
    width: '100%',
    height: 'clamp(170px, 28vw, 270px)',
    display: 'block',
    objectFit: 'cover'
};

const brandTextStyle = {
    marginTop: 'clamp(20px, 4vw, 34px)'
};

const eyebrowStyle = {
    display: 'inline-block',
    color: '#FFE79A',
    fontSize: '13px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 0
};

const brandTitleStyle = {
    margin: '12px 0 10px',
    fontSize: 'clamp(34px, 7vw, 52px)',
    lineHeight: 1,
    letterSpacing: 0,
    color: '#FFF8E5',
    textShadow: '0 3px 12px rgba(0, 0, 0, 0.22)'
};

const brandCopyStyle = {
    maxWidth: '420px',
    margin: 0,
    color: '#D6E9CD',
    fontSize: '16px',
    lineHeight: 1.55
};

const formPanelStyle = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: 'clamp(24px, 5vw, 48px) clamp(22px, 5vw, 46px)',
    background: '#FFFDF6'
};

const formHeaderStyle = {
    marginBottom: '28px'
};

const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    width: 'fit-content',
    padding: '7px 12px',
    borderRadius: '999px',
    background: '#FFE79A',
    color: '#7A3E1E',
    fontSize: '12px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 0
};

const formTitleStyle = {
    margin: '18px 0 6px',
    color: '#2E5E3E',
    fontSize: 'clamp(26px, 6vw, 34px)',
    lineHeight: 1.1,
    letterSpacing: 0
};

const formSubtitleStyle = {
    margin: 0,
    color: '#4F6B3A',
    fontSize: '14px'
};

const formStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
};

const inputGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
};

const labelStyle = {
    fontSize: '13px',
    fontWeight: 800,
    color: '#2E5E3E'
};

const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '14px 15px',
    borderRadius: '10px',
    border: '1px solid rgba(46, 94, 62, 0.22)',
    background: '#FFFFFF',
    color: '#2E5E3E',
    fontSize: '15px',
    outline: 'none',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.75)'
};

const errorStyle = {
    margin: 0,
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 13px',
    borderRadius: '12px',
    background: '#FFC1D1',
    color: '#7A3E1E',
    fontSize: '13px',
    fontWeight: 700,
    overflowWrap: 'anywhere'
};

const successStyle = {
    margin: 0,
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 13px',
    borderRadius: '12px',
    background: '#D6E9CD',
    color: '#2E5E3E',
    fontSize: '13px',
    fontWeight: 700,
    border: '1px solid #A8C98A',
    overflowWrap: 'anywhere'
};

const recoveryMessageSlotStyle = {
    minHeight: '110px',
    display: 'flex',
    alignItems: 'stretch'
};

const emptyRecoveryMessageStyle = {
    width: '100%',
    minHeight: '110px',
    visibility: 'hidden'
};

const messageTextStyle = {
    margin: '0 0 8px'
};

const temporaryPasswordStyle = {
    display: 'block',
    padding: '10px 12px',
    borderRadius: '8px',
    background: '#FFF8E5',
    color: '#7A3E1E',
    fontSize: '14px'
};

const buttonStyle = {
    marginTop: '4px',
    padding: '15px',
    borderRadius: '10px',
    border: '1px solid rgba(46, 94, 62, 0.12)',
    background: 'linear-gradient(135deg, #2E5E3E, #5FA45A)',
    color: '#FFFFFF',
    fontWeight: 900,
    fontSize: '15px',
    cursor: 'pointer',
    boxShadow: '0 12px 24px rgba(95, 164, 90, 0.28)'
};

const linkButtonStyle = {
    border: 'none',
    background: 'transparent',
    color: '#2E5E3E',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 800,
    textDecoration: 'underline'
};

const secondaryButtonStyle = {
    padding: '13px',
    borderRadius: '10px',
    border: '1px solid #A8C98A',
    background: '#FFF8E5',
    color: '#2E5E3E',
    cursor: 'pointer',
    fontWeight: 800
};

const recoveryOptionsStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '10px'
};

const recoveryOptionStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    minHeight: '44px',
    borderRadius: '10px',
    border: '1px solid rgba(46, 94, 62, 0.22)',
    background: '#FFFFFF',
    color: '#2E5E3E',
    fontSize: '14px',
    fontWeight: 800,
    cursor: 'pointer'
};
