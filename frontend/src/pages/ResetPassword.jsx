import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!password || !confirmPassword) return toast.error('Please fill in all fields');
        if (password.length < 6) return toast.error('Password must be at least 6 characters');
        if (password !== confirmPassword) return toast.error('Passwords do not match');

        setLoading(true);

        try {
            const { data } = await axios.post(`/auth/reset-password/${token}`, { password });
            toast.success(data.message || 'Password reset successful');
            navigate('/login');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid or expired token');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '1rem' }}>
            <div style={{ width: '100%', maxWidth: 440 }} className="animate-slide-up">

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'black' }}>Felicity</div>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>Set New Password</p>
                </div>

                <div className="card">
                    <h2 style={{ marginBottom: '0.25rem' }}>Create Password</h2>
                    <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.75rem' }}>Enter your new secure password.</p>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <div style={{ position: 'relative' }}>
                                <FiLock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                                <input type={showPass ? 'text' : 'password'} className="form-input" placeholder="••••••••"
                                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }} value={password} onChange={(e) => setPassword(e.target.value)} required />
                                <button type="button" onClick={() => setShowPass(!showPass)}
                                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-dim)' }}>
                                    {showPass ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirm New Password</label>
                            <div style={{ position: 'relative' }}>
                                <FiLock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                                <input type="password" className="form-input" placeholder="••••••••"
                                    style={{ paddingLeft: '2.5rem' }} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading} style={{ marginTop: '0.5rem' }}>
                            {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Reset Password'}
                        </button>
                    </form>

                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <Link to="/login" style={{ fontSize: '0.875rem', color: 'var(--color-primary-light)', textDecoration: 'none', fontWeight: 500 }}>
                            Cancel
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
