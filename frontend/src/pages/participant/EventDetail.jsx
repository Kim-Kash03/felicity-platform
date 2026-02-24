import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { FiCalendar, FiClock, FiUser, FiTag, FiDollarSign, FiAlertCircle, FiUsers, FiShoppingCart, FiCheck, FiX, FiRefreshCcw, FiStar } from 'react-icons/fi';
import PaymentProofUpload from '../../components/PaymentProofUpload';

const EventDetail = () => {
    const { id } = useParams();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [registrationCount, setRegistrationCount] = useState(0);
    const [userRegistration, setUserRegistration] = useState(null);
    const [showTeamForm, setShowTeamForm] = useState(false);
    const [teamForm, setTeamForm] = useState({ name: '', maxSize: 4 });
    const [creatingTeam, setCreatingTeam] = useState(false);
    const [feedbackStatus, setFeedbackStatus] = useState({ checked: false, submitted: false });
    const [feedbackForm, setFeedbackForm] = useState({ rating: 0, comment: '' });
    const [submittingFeedback, setSubmittingFeedback] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();
    const fetchedId = useRef(null);

    useEffect(() => {
        if (fetchedId.current === id) return;
        fetchedId.current = id;

        axios.get(`/events/${id}`)
            .then(r => { setEvent(r.data); })
            .catch(() => toast.error('Event not found'))
            .finally(() => setLoading(false));

        if (user?.role === 'participant') {
            axios.get('/participants/registrations').then(r => {
                // Find active registration first, fallback to cancelled/rejected to show previous attempt status
                const regsForEvent = r.data.filter(reg => reg.event?._id?.toString() === id?.toString());
                if (regsForEvent.length > 0) {
                    const active = regsForEvent.find(reg => !['cancelled', 'rejected'].includes(reg.status));
                    setUserRegistration(active || regsForEvent[0]);
                }
            }).catch(() => { });

            axios.get(`/events/${id}/feedback/status`).then(r => {
                setFeedbackStatus({ checked: true, submitted: r.data.submitted });
            }).catch(() => {
                setFeedbackStatus({ checked: true, submitted: false });
            });
        }
    }, [id, user]);

    if (loading) return <div className="loading-center" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;
    if (!event) return <div className="page"><div className="container"><div className="empty-state">Event not found.</div></div></div>;

    const now = new Date();
    const deadlinePassed = new Date(event.registrationDeadline) < now;
    const isMerchandise = event.type === 'merchandise';
    const totalStock = event.variants?.reduce((s, v) => s + v.stock, 0) || event.totalStock || 0;
    const outOfStock = isMerchandise && totalStock <= 0;

    const canRegister = user?.role === 'participant' && !deadlinePassed && !outOfStock
        && ['published', 'ongoing'].includes(event.status);

    const blockReason = !user ? 'Login to register'
        : user.role !== 'participant' ? null
            : deadlinePassed ? 'Registration deadline has passed'
                : outOfStock ? 'Out of stock'
                    : !['published', 'ongoing'].includes(event.status) ? 'Event is not open for registration'
                        : null;

    const handleCreateTeam = async (e) => {
        e.preventDefault();
        setCreatingTeam(true);
        try {
            await axios.post('/teams', {
                eventId: event._id,
                name: teamForm.name,
                maxSize: teamForm.maxSize
            });
            toast.success('Team created successfully! Check your dashboard to invite members.');
            setShowTeamForm(false);
            navigate('/dashboard'); // Go to dashboard to see the team
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create team');
        } finally {
            setCreatingTeam(false);
        }
    };

    const handleFeedbackSubmit = async (e) => {
        e.preventDefault();
        if (feedbackForm.rating === 0) {
            toast.error('Please select a star rating');
            return;
        }
        setSubmittingFeedback(true);
        try {
            await axios.post(`/events/${id}/feedback`, feedbackForm);
            toast.success('Thank you for your feedback!');
            setFeedbackStatus({ checked: true, submitted: true });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit feedback');
        } finally {
            setSubmittingFeedback(false);
        }
    };

    return (
        <div className="page">
            <div className="container">
                {/* Back */}
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '1.5rem' }}>← Back to Events</button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
                    {/* Main content */}
                    <div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            <span className={`badge ${isMerchandise ? 'badge-cyan' : 'badge-purple'}`}>
                                {isMerchandise ? ' Merchandise' : 'Normal Event'}
                            </span>
                            <span className={`badge status-${event.status}`}>{event.status}</span>
                            <span className={`badge ${event.eligibility === 'all' ? 'badge-primary' : 'badge-purple'}`}>{event.eligibility}</span>
                        </div>

                        <h1 style={{ marginBottom: '0.5rem' }}>{event.name}</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            by {event.organizer?.organizerName} · {event.organizer?.category}
                        </p>

                        <div className="card" style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ marginBottom: '0.75rem' }}>About this Event</h3>
                            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.8 }}>{event.description}</p>
                        </div>

                        {/* Tags */}
                        {event.tags?.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                                {event.tags.map(t => <span key={t} className="tag"><FiTag size={11} /> {t}</span>)}
                            </div>
                        )}

                        {/* Merchandise variants */}
                        {isMerchandise && event.variants?.length > 0 && (
                            <div className="card" style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ marginBottom: '1rem' }}>Available Variants</h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    {event.variants.map(v => (
                                        <div key={v._id} style={{
                                            padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)',
                                            border: `1px solid ${v.stock > 0 ? 'var(--color-border)' : 'rgba(239,68,68,0.3)'}`,
                                            background: v.stock > 0 ? 'var(--color-surface2)' : 'rgba(239,68,68,0.05)',
                                            opacity: v.stock > 0 ? 1 : 0.6,
                                        }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                                {v.size && `Size: ${v.size}`} {v.color && `| ${v.color}`}
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: v.stock > 0 ? 'var(--color-primary)' : 'var(--color-danger)' }}>
                                                {v.stock > 0 ? `${v.stock} left` : 'Out of stock'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Custom form preview for normal events */}
                        {!isMerchandise && event.customForm?.length > 0 && (
                            <div className="card">
                                <h3 style={{ marginBottom: '0.75rem' }}>Registration Form Preview</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {event.customForm.map((f, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0 }} />
                                            {f.label} {f.required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                                            <span className="badge badge-primary" style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>{f.type}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Leave Feedback Section */}
                        {userRegistration && !isMerchandise && (userRegistration.status === 'attended' || event.status === 'completed') && (
                            <div className="card" style={{ marginTop: '1.5rem', border: '1px solid var(--color-primary-light)' }}>
                                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FiStar /> Event Feedback
                                </h3>
                                {!feedbackStatus.checked ? (
                                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Checking feedback status...</div>
                                ) : feedbackStatus.submitted ? (
                                    <div className="alert alert-success" style={{ marginBottom: 0 }}>
                                        <FiCheck /> Thank you! Your anonymous feedback has been submitted.
                                    </div>
                                ) : (
                                    <form onSubmit={handleFeedbackSubmit}>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                                            Your feedback is completely anonymous and helps organizers improve future events.
                                        </p>
                                        <div style={{ marginBottom: '1rem' }}>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Rate your experience</div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <FiStar
                                                        key={star}
                                                        size={28}
                                                        fill={feedbackForm.rating >= star ? 'var(--color-primary)' : 'none'}
                                                        color={feedbackForm.rating >= star ? 'var(--color-primary)' : 'var(--color-text-muted)'}
                                                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                                        onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                                            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Additional Comments (Optional)</label>
                                            <textarea
                                                className="input"
                                                rows="3"
                                                placeholder="What did you like? What could be improved?"
                                                value={feedbackForm.comment}
                                                onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
                                            />
                                        </div>
                                        <button type="submit" className="btn btn-primary" disabled={submittingFeedback || feedbackForm.rating === 0}>
                                            {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sidebar - Registration card */}
                    <div style={{ position: 'sticky', top: '90px' }}>
                        <div className="card">
                            <h3 style={{ marginBottom: '1rem' }}>{isMerchandise ? 'Purchase' : 'Registration'} Details</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <FiDollarSign size={13} /> Price
                                    </span>
                                    <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                                        {event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <FiClock size={13} /> Deadline
                                    </span>
                                    <span style={{ color: deadlinePassed ? 'var(--color-danger)' : 'var(--color-text)' }}>
                                        {format(new Date(event.registrationDeadline), 'dd MMM yyyy')}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <FiCalendar size={13} /> Event Date
                                    </span>
                                    <span>{format(new Date(event.startDate), 'dd MMM yyyy')}</span>
                                </div>
                                {event.registrationLimit > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                        <span style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <FiUsers size={13} /> Limit
                                        </span>
                                        <span>{event.registrationLimit} seats</span>
                                    </div>
                                )}
                                {isMerchandise && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                        <span style={{ color: 'var(--color-text-muted)' }}>Stock</span>
                                        <span style={{ color: totalStock > 0 ? 'var(--color-primary)' : 'var(--color-danger)' }}>
                                            {totalStock > 0 ? `${totalStock} available` : 'Sold Out'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {userRegistration && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div className={`alert ${userRegistration.status === 'rejected' || userRegistration.status === 'cancelled' ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '0.5rem' }}>
                                        {userRegistration.status === 'rejected' ? <FiX size={14} /> : <FiCheck size={14} />}
                                        <strong>Status: {userRegistration.status.toUpperCase()}</strong>
                                    </div>

                                    {event.registrationFee > 0 ? (
                                        ['pending', 'rejected'].includes(userRegistration.paymentStatus) ? (
                                            <div style={{ marginTop: '1rem' }}>
                                                {/* Show totalAmount if this is a merchandise cart purchase, else Registration Fee */}
                                                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Amount to Pay</div>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-primary-light)' }}>
                                                        ₹{userRegistration.totalAmount || event.registrationFee}
                                                    </div>
                                                </div>
                                                {userRegistration.paymentStatus === 'rejected' && (
                                                    <div className="alert alert-error" style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>
                                                        <FiRefreshCcw /> Your previous payment proof was rejected. Please upload a clear image of the transaction receipt.
                                                    </div>
                                                )}
                                                <PaymentProofUpload
                                                    registrationId={userRegistration._id}
                                                    onSuccess={() => {
                                                        axios.get('/participants/registrations').then(r => {
                                                            const reg = r.data.find(reg => reg.event?._id?.toString() === id?.toString());
                                                            if (reg) setUserRegistration(reg);
                                                        }).catch(() => { });
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            userRegistration.paymentStatus === 'paid' ? (
                                                <div style={{ background: 'var(--color-surface2)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>
                                                        ✓ Payment Approved
                                                    </div>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                                        Ticket ID: <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--color-text)' }}>{userRegistration.ticketId}</span>
                                                    </p>
                                                    {userRegistration.qrCode && (
                                                        <img src={userRegistration.qrCode} alt="QR Code" style={{ width: '150px', height: '150px', marginTop: '1rem' }} />
                                                    )}
                                                </div>
                                            ) : null
                                        )
                                    ) : (
                                        <div style={{ background: 'var(--color-surface2)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                                Ticket ID: <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--color-text)' }}>{userRegistration.ticketId}</span>
                                            </p>
                                            {userRegistration.qrCode && (
                                                <img src={userRegistration.qrCode} alt="QR Code" style={{ width: '150px', height: '150px', marginTop: '1rem' }} />
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="divider" style={{ margin: '1rem 0' }} />

                            {userRegistration && !['cancelled', 'rejected'].includes(userRegistration.status) && (!isMerchandise || (userRegistration && false /* placeholder, will check via API ideally, but for now block if any active */)) ? (
                                // Active registration exists, block for normal events.
                                // NOTE: For merchandise, they could technically buy more, but we need
                                // a more complex query to know their exact total purchased quantity.
                                // For simplicity, we'll let them buy more if it's merchandise by redirecting to register.
                                null
                            ) : blockReason ? (
                                <div>
                                    <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                                        <FiAlertCircle /> {blockReason}
                                    </div>
                                    {!user && <button className="btn btn-primary btn-full" onClick={() => navigate('/login')}>Sign In to Register</button>}
                                </div>
                            ) : event.isTeamEvent ? (
                                showTeamForm ? (
                                    <form onSubmit={handleCreateTeam} className="card" style={{ background: 'var(--color-surface2)', padding: '1rem', marginTop: '1rem' }}>
                                        <h4 style={{ marginBottom: '1rem' }}>Create Team</h4>
                                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                                            <label style={{ fontSize: '0.8rem' }}>Team Name</label>
                                            <input type="text" className="input" required value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                                            <label style={{ fontSize: '0.8rem' }}>Team Size ({Math.max(2, event.teamSizeMin || 2)} - {Math.min(10, event.teamSizeMax || 10)})</label>
                                            <input type="number" className="input" required min={Math.max(2, event.teamSizeMin || 2)} max={Math.min(10, event.teamSizeMax || 10)} value={teamForm.maxSize} onChange={e => setTeamForm({ ...teamForm, maxSize: e.target.value })} />
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={creatingTeam}>{creatingTeam ? 'Creating...' : 'Create'}</button>
                                            <button type="button" className="btn btn-ghost" onClick={() => setShowTeamForm(false)}>Cancel</button>
                                        </div>
                                    </form>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <button className="btn btn-primary btn-full btn-lg" onClick={() => {
                                            setTeamForm({ name: '', maxSize: Math.max(2, event.teamSizeMin || 2) });
                                            setShowTeamForm(true);
                                        }}>
                                            <FiUsers /> Create a Team
                                        </button>
                                        <button className="btn btn-ghost btn-full" onClick={() => navigate('/dashboard')}>
                                            Join via Dashboard
                                        </button>
                                    </div>
                                )
                            ) : (
                                <button className="btn btn-primary btn-full btn-lg"
                                    onClick={() => navigate(`/events/${id}/register`)}>
                                    {isMerchandise ? <><FiShoppingCart /> Purchase Now</> : 'Register Now'}
                                </button>
                            )}
                        </div>

                        {/* Organizer info */}
                        <div className="card" style={{ marginTop: '1rem' }}>
                            <h4 style={{ marginBottom: '0.75rem' }}>Organized by</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <div className="avatar">{event.organizer?.organizerName?.slice(0, 1)}</div>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{event.organizer?.organizerName}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{event.organizer?.category}</div>
                                </div>
                            </div>
                            {event.organizer?.description && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>{event.organizer.description}</p>
                            )}
                            <button className="btn btn-ghost btn-sm btn-full" onClick={() => navigate(`/clubs/${event.organizer?._id}`)}>
                                View Profile
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile layout - action button at bottom */}
                <style>{`@media (max-width: 768px) { .event-sidebar { position: static !important; } }`}</style>
            </div>
        </div>
    );
};

export default EventDetail;
