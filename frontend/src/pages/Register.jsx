import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Register.css';

function Register() {
    const navigate = useNavigate();

    // Estado del formulario
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        password2: '',
    });

    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    // Estado de validación de contraseña
    const [passwordValidations, setPasswordValidations] = useState({
        hasUppercase: false,
        hasNumber: false,
        hasSymbol: false,
    });

    // Validación dinámica de contraseña
    useEffect(() => {
        setPasswordValidations({
            hasUppercase: /[A-Z]/.test(formData.password),
            hasNumber: /\d/.test(formData.password),
            hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
        });
    }, [formData]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (formData.password !== formData.password2) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        // Verificar que todos los requisitos estén completos
        if (!passwordValidations.hasUppercase || !passwordValidations.hasNumber || !passwordValidations.hasSymbol) {
            setError("La contraseña no cumple todos los requisitos.");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("http://127.0.0.1:8000/api/usuarios/register/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || JSON.stringify(data));
            } else {
                console.log("Registro exitoso:", data);
                if (data.token) localStorage.setItem("authToken", data.token);
                navigate("/"); // Redirigir al login
            }
        } catch (err) {
            console.error(err);
            setError("Error de registro. Intenta más tarde.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-container">
            <div className="background-overlay"></div>
            <div className="card">
                <div className="logo-container">
                    <img src="/assets/logo.png" alt="Logo Clase V" className="logo-image" />
                </div>

                <h2>Crea una cuenta</h2>
                <p className="subtitle">Es rápido y fácil.</p>

                <form className="form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <span className="input-icon">👤</span>
                        <input
                            type="text"
                            name="username"
                            placeholder="Nombre de usuario"
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <span className="input-icon">📧</span>
                        <input
                            type="email"
                            name="email"
                            placeholder="Correo electrónico"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <span className="input-icon">🔒</span>
                        <input
                            type="password"
                            name="password"
                            placeholder="Contraseña"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <span className="input-icon">🔒</span>
                        <input
                            type="password"
                            name="password2"
                            placeholder="Confirma contraseña"
                            value={formData.password2}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Mensaje de error */}
                    {error && <p style={{ color: 'red', fontSize: '0.9em', marginTop: '10px' }}>{error}</p>}

                    {/* Requisitos de contraseña */}
                    <div className="password-requirements" style={{ textAlign: 'left', marginTop: '10px' }}>
                        <p style={{ color: passwordValidations.hasUppercase ? 'limegreen' : 'white' }}>• Contiene al menos una letra mayúscula</p>
                        <p style={{ color: passwordValidations.hasNumber ? 'limegreen' : 'white' }}>• Contiene al menos un número</p>
                        <p style={{ color: passwordValidations.hasSymbol ? 'limegreen' : 'white' }}>• Contiene al menos un símbolo (!@#$...)</p>
                    </div>

                    <button type="submit" className="register-button" disabled={loading}>
                        {loading ? "Registrando..." : "Registrar"}
                    </button>
                </form>

                <p className="login-link-container">
                    ¿Ya tienes una cuenta? <Link to="/">Iniciar sesión</Link>
                </p>
            </div>
        </div>
    );
}

export default Register;