import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiUser, FiPhone, FiBriefcase, FiEye, FiEyeOff, FiCheckCircle } from 'react-icons/fi';

const IIIT_DOMAINS = ['@iiit.ac.in', '@research.iiit.ac.in', '@students.iiit.ac.in', '@mg.iiit.ac.in'];
const isIIIT = (email) => IIIT_DOMAINS.some(d => email.toLowerCase().endsWith(d));

const Register = () => {
    const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', contactNumber: '', college: '' });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const iiit = isIIIT(form.email);
    const onChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.password || !form.firstName || !form.lastName) return toast.error('Required fields missing');
        if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
        setLoading(true);
        try {
            const { data } = await axios.post('/auth/register', form);
            login(data.token, data.user);
            toast.success('Account created! Let\'s set up your preferences.');
            navigate('/onboarding');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '1.5rem' }}>
            <div style={{ width: '100%', maxWidth: 500 }} className="animate-slide-up">
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>Felicity</div>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>Create your participant account</p>
                </div>

                <div className="card">
                    <h2 style={{ marginBottom: '0.25rem' }}>Join Felicity</h2>
                    <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.75rem' }}>Discover and register for amazing events</p>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Name Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">First Name <span className="required">*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <FiUser style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                                    <input name="firstName" className="form-input" placeholder="John" style={{ paddingLeft: '2.5rem' }} value={form.firstName} onChange={onChange} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name <span className="required">*</span></label>
                                <input name="lastName" className="form-input" placeholder="Doe" value={form.lastName} onChange={onChange} />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="form-group">
                            <label className="form-label">Email Address <span className="required">*</span></label>
                            <div style={{ position: 'relative' }}>
                                <FiMail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                                <input name="email" type="email" className="form-input" placeholder="you@iiit.ac.in"
                                    style={{ paddingLeft: '2.5rem', paddingRight: iiit ? '2.5rem' : '1rem' }} value={form.email} onChange={onChange} />
                                {iiit && <FiCheckCircle style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-primary)' }} />}
                            </div>
                            {iiit && (
                                <div className="alert alert-primary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                                    ✓ IIIT student detected — college auto-filled
                                </div>
                            )}
                        </div>

                        {/* Password */}
                        <div className="form-group">
                            <label className="form-label">Password <span className="required">*</span></label>
                            <div style={{ position: 'relative' }}>
                                <FiLock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                                <input name="password" type={showPass ? 'text' : 'password'} className="form-input" placeholder="Min. 6 characters"
                                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }} value={form.password} onChange={onChange} />
                                <button type="button" onClick={() => setShowPass(!showPass)}
                                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-dim)' }}>
                                    {showPass ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="form-group">
                            <label className="form-label">Contact Number</label>
                            <div style={{ position: 'relative' }}>
                                <FiPhone style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                                <input name="contactNumber" className="form-input" placeholder="+91 9999999999" style={{ paddingLeft: '2.5rem' }} value={form.contactNumber} onChange={onChange} />
                            </div>
                        </div>

                        {/* College (non-IIIT only) */}
                        {!iiit && (
                            <div className="form-group">
                                <label className="form-label">College / Organization <span className="required">*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <FiBriefcase style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                                    <input name="college" className="form-input" placeholder="Your institution" style={{ paddingLeft: '2.5rem' }} value={form.college} onChange={onChange} />
                                </div>
                            </div>
                        )}

                        <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading} style={{ marginTop: '0.5rem' }}>
                            {loading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Creating account...</> : 'Create Account'}
                        </button>
                    </form>

                    <div className="divider-text" style={{ margin: '1.5rem 0' }}>Already have an account?</div>
                    <Link to="/login"><button className="btn btn-secondary btn-full">Sign In</button></Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
