import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiMail } from 'react-icons/fi';

const ForgotPassword = () => {
    const [form, setForm] = useState({ email: '', role: 'participant' });
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const onChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.email) return toast.error('Please enter your email');
        setLoading(true);
        setSuccessMsg('');

        try {
            const { data } = await axios.post('/auth/forgot-password', form);
            setSuccessMsg(data.message);
            toast.success('Request submitted');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '1rem' }}>
            <div style={{ width: '100%', maxWidth: 440 }} className="animate-slide-up">

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'black' }}>Felicity</div>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>Password Recovery</p>
                </div>

                <div className="card">
                    <h2 style={{ marginBottom: '0.25rem' }}>Forgot Password</h2>
                    <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.75rem' }}>Enter your email to receive a password reset link.</p>

                    {successMsg ? (
                        <div className="alert alert-success" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                            {successMsg}
                            {form.role === 'participant' && (
                                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.8 }}>
                                    (search backend log for the site link)
                                </div>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">I am a...</label>
                                <select
                                    name="role"
                                    className="form-input"
                                    value={form.role}
                                    onChange={onChange}
                                >
                                    <option value="participant">Participant</option>
                                    <option value="organizer">Organizer</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <FiMail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                                    <input name="email" type="email" className="form-input" placeholder="you@example.com"
                                        style={{ paddingLeft: '2.5rem' }} value={form.email} onChange={onChange} required autoComplete="email" />
                                </div>
                            </div>

                            {form.role === 'organizer' && (
                                <div className="form-group animate-slide-up">
                                    <label className="form-label">Reason for Reset <span className="required">*</span></label>
                                    <textarea
                                        name="reason"
                                        className="form-textarea"
                                        placeholder="Explain why you need a password reset..."
                                        rows={3}
                                        value={form.reason || ''}
                                        onChange={onChange}
                                        required
                                    />
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading} style={{ marginTop: '0.5rem' }}>
                                {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Send Reset Link'}
                            </button>
                        </form>
                    )}

                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <Link to="/login" style={{ fontSize: '0.875rem', color: 'var(--color-primary-light)', textDecoration: 'none', fontWeight: 500 }}>
                            &larr; Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
