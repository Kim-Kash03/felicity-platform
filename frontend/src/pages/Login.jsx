import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/felicity.png';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

const Login = () => {
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const onChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.password) return toast.error('Please fill in all fields');
        setLoading(true);
        try {
            const { data } = await axios.post('/auth/login', form);
            login(data.token, data.user);
            toast.success(`Welcome back, ${data.user.firstName || data.user.organizerName || 'Admin'}!`);
            const from = location.state?.from?.pathname;
            if (from && from !== '/login') { navigate(from); return; }
            if (data.user.role === 'participant') navigate('/dashboard');
            else if (data.user.role === 'organizer') navigate('/organizer/dashboard');
            else navigate('/admin/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '1rem' }}>
            <div style={{ width: '100%', maxWidth: 440 }} className="animate-slide-up">
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <img src={logo} alt="Felicity Logo" style={{ height: '150px', marginBottom: '0.5rem' }} />
                    <p style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>Event Management Platform</p>
                </div>

                <div className="card">
                    <h2 style={{ marginBottom: '0.25rem' }}>Welcome back</h2>
                    <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.75rem' }}>Sign in to your account</p>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <FiMail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                                <input name="email" type="email" className="form-input" placeholder="you@example.com"
                                    style={{ paddingLeft: '2.5rem' }} value={form.email} onChange={onChange} autoComplete="email" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <FiLock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                                <input name="password" type={showPass ? 'text' : 'password'} className="form-input" placeholder="••••••••"
                                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }} value={form.password} onChange={onChange} autoComplete="current-password" />
                                <button type="button" onClick={() => setShowPass(!showPass)}
                                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-dim)' }}>
                                    {showPass ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.5rem' }}>
                            <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)', textDecoration: 'none' }}>
                                Forgot Password?
                            </Link>
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading} style={{ marginTop: '0.5rem' }}>
                            {loading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Signing in...</> : 'Sign In'}
                        </button>
                    </form>

                    <div className="divider-text" style={{ margin: '1.5rem 0' }}>New to Felicity?</div>
                    <Link to="/register">
                        <button className="btn btn-secondary btn-full">Create Participant Account</button>
                    </Link>

                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', textAlign: 'center', marginTop: '1rem' }}>
                        Organizer? Contact admin for credentials.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
