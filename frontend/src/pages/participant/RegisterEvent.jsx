import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { FiCheck } from 'react-icons/fi';
import PaymentProofUpload from '../../components/PaymentProofUpload';

const RegisterEvent = () => {
    const { id } = useParams();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({});
    const [cart, setCart] = useState([]); // Array of { variant: v, quantity: n }
    const [ticket, setTicket] = useState(null);
    const [paymentProofUrl, setPaymentProofUrl] = useState('');
    const [proofSubmitted, setProofSubmitted] = useState(false);
    const [submittingProof, setSubmittingProof] = useState(false);
    const [registrationId, setRegistrationId] = useState(null);
    const [uploadingFields, setUploadingFields] = useState({}); // Tracking which field is uploading
    const navigate = useNavigate();

    useEffect(() => {
        axios.get(`/events/${id}`)
            .then(r => setEvent(r.data))
            .catch(() => { toast.error('Event not found'); navigate(-1); })
            .finally(() => setLoading(false));
    }, [id]);

    const handleFieldChange = (label, value) => {
        setFormData(prev => ({ ...prev, [label]: value }));
    };

    const handleFileUpload = async (label, file) => {
        if (!file) return;
        setUploadingFields(prev => ({ ...prev, [label]: true }));
        const formData = new FormData();
        formData.append('image', file);

        try {
            const { data } = await axios.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            // Update form data with the file URL
            handleFieldChange(label, data.url);
            toast.success(`File uploaded for ${label}`);
        } catch (err) {
            toast.error(`Failed to upload file for ${label}`);
        } finally {
            setUploadingFields(prev => ({ ...prev, [label]: false }));
        }
    };

    const handleAddToCart = (variant) => {
        if (!variant || variant.stock <= 0) return;
        setCart(prev => {
            const existing = prev.find(item => item.variant._id === variant._id);
            if (existing) return prev; // already in cart
            return [...prev, { variant, quantity: 1 }];
        });
    };

    const handleRemoveFromCart = (variantId) => {
        setCart(prev => prev.filter(item => item.variant._id !== variantId));
    };

    const handleUpdateQuantity = (variantId, newQuantity) => {
        setCart(prev => prev.map(item => {
            if (item.variant._id === variantId) {
                const maxAllowed = Math.min(item.variant.stock, event.purchaseLimitPerParticipant);
                const safeQuantity = Math.min(Math.max(1, newQuantity), maxAllowed);
                return { ...item, quantity: safeQuantity };
            }
            return item;
        }));
    };

    const cartTotalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Validate required form fields
        for (const field of (event?.customForm || [])) {
            if (field.required && !formData[field.label]) {
                return toast.error(`"${field.label}" is required`);
            }
        }
        if (event?.type === 'merchandise' && cart.length === 0) {
            return toast.error('Please select at least one item');
        }

        if (event?.type === 'merchandise' && cartTotalQuantity > event.purchaseLimitPerParticipant) {
            return toast.error(`You can only purchase a maximum of ${event.purchaseLimitPerParticipant} items in total.`);
        }

        setSubmitting(true);
        try {
            const payload = {
                eventId: id,
                formResponses: formData,
                merchandiseVariants: event?.type === 'merchandise' ? cart.map(item => ({
                    variantId: item.variant._id,
                    size: item.variant.size,
                    color: item.variant.color,
                    quantity: item.quantity,
                })) : undefined,
            };
            const { data } = await axios.post('/registrations', payload);
            setTicket(data.registration);
            setRegistrationId(data.registration?._id || data.registrationId);
            toast.success(event.type === 'merchandise' ? 'Purchase successful! Check your email.' : 'Registered! Ticket sent to your email.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="loading-center" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;
    if (!event) return null;

    if (ticket) {
        return (
            <div className="page">
                <div className="container" style={{ maxWidth: 500, margin: '0 auto' }}>
                    <div className="card animate-slide-up" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}></div>
                        <h2 style={{ marginBottom: '0.5rem' }}>{event.type === 'merchandise' ? 'Purchase Successful!' : 'You\'re Registered!'}</h2>
                        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
                            {ticket.paymentStatus === 'pending'
                                ? 'Please upload your payment proof to complete your registration.'
                                : 'Check your email for your ticket and QR code.'}
                        </p>

                        {!ticket.ticketId ? (
                            <div className="alert alert-warning" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                                <strong>Ticket Generation Pending</strong>
                                <br />Your QR code and Ticket ID will be generated once the organizer approves your payment.
                            </div>
                        ) : (
                            <div style={{ background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem', border: '1px solid var(--color-border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Ticket ID</div>
                                <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary-light)', letterSpacing: '0.1em' }}>
                                    {ticket.ticketId}
                                </div>
                            </div>
                        )}

                        {ticket.qrCode && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>Your QR Code</div>
                                <img src={ticket.qrCode} alt="QR Code" style={{ width: 180, borderRadius: 12, border: '3px solid var(--color-primary)' }} />
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-secondary btn-full" onClick={() => navigate('/dashboard')}>My Dashboard</button>
                            <button className="btn btn-primary btn-full" onClick={() => navigate('/events')}>Browse More Events</button>
                        </div>

                        {/* Payment Proof — required for paid events */}
                        {event.registrationFee > 0 && registrationId && !proofSubmitted && (
                            <div className="card" style={{ marginTop: '1.5rem', borderColor: 'var(--color-primary-light)', background: 'rgba(255,105,180,0.05)', textAlign: 'left' }}>
                                <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Payment Required — ₹{event.registrationFee}</h4>
                                <PaymentProofUpload
                                    registrationId={registrationId}
                                    onSuccess={() => setProofSubmitted(true)}
                                />
                            </div>
                        )}
                        {proofSubmitted && (
                            <div className="alert alert-success" style={{ marginTop: '1rem' }}>
                                Payment proof received! Your registration is now fully confirmed.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: 600, margin: '0 auto' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '1.5rem' }}>← Back</button>
                <h2 style={{ marginBottom: '0.25rem' }}>
                    {event.type === 'merchandise' ? 'Purchase' : 'Register for'}: {event.name}
                </h2>
                <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                    by {event.organizer?.organizerName}
                    {event.registrationFee > 0 && <strong style={{ color: 'var(--color-primary)', marginLeft: '0.5rem' }}>₹{event.registrationFee}</strong>}
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>

                        {/* Merchandise variant selector */}
                        {event.type === 'merchandise' && event.variants?.length > 0 && (
                            <div className="form-group">
                                <label className="form-label">Select Variant <span className="required">*</span></label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {event.variants.map(v => (
                                        <button type="button" key={v._id}
                                            disabled={v.stock <= 0 || cart.some(item => item.variant._id === v._id)}
                                            onClick={() => handleAddToCart(v)}
                                            style={{
                                                padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1.5px solid',
                                                borderColor: cart.some(item => item.variant._id === v._id) ? 'var(--color-primary)' : v.stock > 0 ? 'var(--color-border)' : 'rgba(239,68,68,0.3)',
                                                background: cart.some(item => item.variant._id === v._id) ? 'rgba(255,20,147,0.15)' : 'var(--color-surface2)',
                                                color: v.stock > 0 ? 'var(--color-text)' : 'var(--color-text-dim)',
                                                cursor: (v.stock > 0 && !cart.some(item => item.variant._id === v._id)) ? 'pointer' : 'not-allowed', font: 'inherit', fontSize: '0.875rem',
                                                transition: 'var(--transition)',
                                            }}>
                                            {v.size && `${v.size}`} {v.color && `/ ${v.color}`}
                                            {v.stock <= 0 && ' (sold out)'}
                                            {cart.some(item => item.variant._id === v._id) && <FiCheck style={{ marginLeft: 4 }} />}
                                        </button>
                                    ))}
                                </div>
                                {cart.length > 0 && (
                                    <div style={{ marginTop: '1.5rem', background: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                                        <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Your Selection</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {cart.map(item => (
                                                <div key={item.variant._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>{item.variant.size} {item.variant.color && `/ ${item.variant.color}`}</div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>{item.variant.stock} available</div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <label style={{ fontSize: '0.8rem' }}>Qty:</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={Math.min(item.variant.stock, event.purchaseLimitPerParticipant)}
                                                                value={item.quantity}
                                                                onChange={(e) => handleUpdateQuantity(item.variant._id, parseInt(e.target.value) || 1)}
                                                                className="form-input"
                                                                style={{ width: '60px', padding: '0.25rem' }}
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost btn-sm"
                                                            style={{ color: 'var(--color-danger)', padding: '0.25rem 0.5rem' }}
                                                            onClick={() => handleRemoveFromCart(item.variant._id)}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontWeight: 'bold' }}>
                                                <span>Total Items:</span>
                                                <span style={{ color: cartTotalQuantity > event.purchaseLimitPerParticipant ? 'var(--color-danger)' : 'var(--color-text)' }}>
                                                    {cartTotalQuantity} / {event.purchaseLimitPerParticipant} allowed
                                                </span>
                                            </div>
                                            {event.registrationFee > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-primary-light)' }}>
                                                    <span>Total Amount:</span>
                                                    <span>₹{cartTotalQuantity * event.registrationFee}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Dynamic form fields for normal events */}
                        {event.type === 'normal' && event.customForm?.map((field, i) => (
                            <div className="form-group" key={i}>
                                <label className="form-label">
                                    {field.label}
                                    {field.required && <span className="required"> *</span>}
                                </label>

                                {field.type === 'text' || field.type === 'number' || field.type === 'date' ? (
                                    <input type={field.type} className="form-input" placeholder={field.label}
                                        value={formData[field.label] || ''} onChange={e => handleFieldChange(field.label, e.target.value)} />
                                ) : field.type === 'textarea' ? (
                                    <textarea className="form-textarea" placeholder={field.label}
                                        value={formData[field.label] || ''} onChange={e => handleFieldChange(field.label, e.target.value)} />
                                ) : field.type === 'dropdown' ? (
                                    <select className="form-select" value={formData[field.label] || ''} onChange={e => handleFieldChange(field.label, e.target.value)}>
                                        <option value="">Select...</option>
                                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                ) : field.type === 'radio' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {field.options?.map(opt => (
                                            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                <input type="radio" name={field.label} value={opt}
                                                    checked={formData[field.label] === opt}
                                                    onChange={() => handleFieldChange(field.label, opt)} />
                                                <span style={{ fontSize: '0.875rem' }}>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : field.type === 'checkbox' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {field.options?.map(opt => (
                                            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                <input type="checkbox" value={opt}
                                                    checked={Array.isArray(formData[field.label]) && formData[field.label].includes(opt)}
                                                    onChange={e => {
                                                        const current = Array.isArray(formData[field.label]) ? formData[field.label] : [];
                                                        handleFieldChange(field.label, e.target.checked ? [...current, opt] : current.filter(v => v !== opt));
                                                    }} />
                                                <span style={{ fontSize: '0.875rem' }}>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : field.type === 'file' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <input
                                            type="file"
                                            className="form-input"
                                            onChange={(e) => handleFileUpload(field.label, e.target.files[0])}
                                            disabled={uploadingFields[field.label]}
                                        />
                                        {uploadingFields[field.label] && <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>Uploading...</div>}
                                        {formData[field.label] && !uploadingFields[field.label] && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <FiCheck /> File Uploaded
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        ))}

                        {/* No form fields message */}
                        {event.type === 'normal' && (!event.customForm || event.customForm.length === 0) && (
                            <div className="alert alert-info">
                                No additional information required. Just click Register!
                            </div>
                        )}
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={submitting}>
                        {submitting
                            ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Processing...</>
                            : event.type === 'merchandise' ? ' Confirm Purchase' : '✓ Confirm Registration'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RegisterEvent;
