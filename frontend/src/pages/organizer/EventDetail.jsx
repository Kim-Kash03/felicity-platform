import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { FiDownload, FiCheck, FiSearch, FiStar } from 'react-icons/fi';

const OrganizerEventDetail = () => {
    const { id } = useParams();
    const [event, setEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [teams, setTeams] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [feedbacks, setFeedbacks] = useState([]);
    const [feedbackAnalytics, setFeedbackAnalytics] = useState(null);
    const [feedbackFilter, setFeedbackFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('participants');
    const [search, setSearch] = useState('');
    const [selectedReg, setSelectedReg] = useState(null);
    const navigate = useNavigate();

    const fetchAll = async () => {
        try {
            const [evRes, regRes, anRes, teamRes, fbRes] = await Promise.all([
                axios.get(`/events/${id}`),
                axios.get(`/registrations/event/${id}`),
                axios.get(`/registrations/event/${id}/analytics`),
                axios.get(`/teams/event/${id}`).catch(() => ({ data: [] })),
                axios.get(`/events/${id}/feedback`).catch(() => ({ data: { feedbacks: [], analytics: null } }))
            ]);
            setEvent(evRes.data);
            setRegistrations(regRes.data);
            setAnalytics(anRes.data);
            setTeams(teamRes.data);
            setFeedbacks(fbRes.data.feedbacks || []);
            setFeedbackAnalytics(fbRes.data.analytics || null);
        } catch (err) {
            toast.error('Failed to load event');
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, [id]);

    const handleStatusChange = async (newStatus) => {
        try {
            await axios.put(`/events/${id}`, { status: newStatus });
            toast.success(`Event marked as ${newStatus}`);
            fetchAll();
        } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    };

    const handleAttendance = async (regId) => {
        try {
            await axios.put(`/registrations/${regId}/attend`);
            toast.success('Attendance marked');
            fetchAll();
        } catch (err) { toast.error('Failed to mark attendance'); }
    };

    const handleReject = async (regId) => {
        if (!window.confirm('Are you sure you want to reject this registration?')) return;
        try {
            await axios.put(`/registrations/${regId}/reject`);
            toast.success('Registration rejected');
            fetchAll();
        } catch (err) { toast.error('Failed to reject registration'); }
    };

    const handleApprovePayment = async (regId) => {
        try {
            await axios.put(`/registrations/${regId}/approve-payment`);
            toast.success('Payment approved and ticket generated');
            fetchAll();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to approve payment'); }
    };

    const handleRejectPayment = async (regId) => {
        if (!window.confirm('Are you sure you want to reject this payment?')) return;
        try {
            await axios.put(`/registrations/${regId}/reject-payment`);
            toast.success('Payment rejected');
            fetchAll();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to reject payment'); }
    };

    const handleCSV = () => {
        window.location.href = `${axios.defaults.baseURL}/registrations/event/${id}/csv`;
    };

    const filtered = registrations.filter(r =>
        !search || r.participant?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        r.participant?.email?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="loading-center" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;
    if (!event) return <div className="page"><div className="container"><div className="empty-state">Event not found.</div></div></div>;

    return (
        <div className="page">
            <div className="container">
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/organizer/dashboard')} style={{ marginBottom: '1.5rem' }}>← Dashboard</button>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span className={`badge ${event.type === 'merchandise' ? 'badge-cyan' : 'badge-purple'}`}>{event.type}</span>
                            <span className={`badge status-${event.status}`}>{event.status}</span>
                        </div>
                        <h2 style={{ margin: 0 }}>{event.name}</h2>
                        <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{event.startDate && format(new Date(event.startDate), 'dd MMM yyyy')} → {event.endDate && format(new Date(event.endDate), 'dd MMM yyyy')}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {event.status === 'draft' ? (
                            <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange('published')}>Publish</button>
                        ) : (
                            <button
                                className={`btn btn-sm ${event.status === 'ongoing' ? 'btn-success' : 'btn-secondary'}`}
                                onClick={() => handleStatusChange(event.status === 'ongoing' ? 'completed' : 'ongoing')}
                            >
                                {event.status === 'ongoing' ? 'Mark Completed' : 'Mark Ongoing'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Analytics */}
                {analytics && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="stat-card"><div className="stat-value">{analytics.total}</div><div className="stat-label">Registrations</div></div>
                        <div className="stat-card"><div className="stat-value">{analytics.attended}</div><div className="stat-label">Attended</div></div>
                        <div className="stat-card"><div className="stat-value">{analytics.cancelled}</div><div className="stat-label">Cancelled</div></div>
                        <div className="stat-card"><div className="stat-value">₹{analytics.revenue || 0}</div><div className="stat-label">Revenue</div></div>
                    </div>
                )}

                {/* Tabs */}
                <div className="tabs">
                    {['participants', 'overview', 'approvals', 'feedback', ...(event.isTeamEvent ? ['teams'] : [])].map(t => (
                        <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                            {t === 'participants' ? 'Participants' : t === 'overview' ? 'Event Overview' : t === 'teams' ? 'Teams' : t === 'feedback' ? 'Feedback' : 'Payment Approvals'}
                            {t === 'approvals' && registrations.some(r => r.paymentStatus === 'pending' && r.paymentProofUrl) && (
                                <span className="badge badge-primary" style={{ marginLeft: 8 }}>
                                    {registrations.filter(r => r.paymentStatus === 'pending' && r.paymentProofUrl).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {activeTab === 'teams' && event.isTeamEvent && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <p className="text-muted">Manage teams registered for this hackathon.</p>
                        </div>
                        {teams.length === 0 ? (
                            <div className="empty-state"><div className="empty-state-icon"></div><p>No teams created yet.</p></div>
                        ) : (
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Team Name</th>
                                            <th>Leader</th>
                                            <th>Size</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teams.map(t => (
                                            <tr key={t._id}>
                                                <td style={{ fontWeight: 600 }}>{t.name}</td>
                                                <td>{t.leaderId?.firstName} {t.leaderId?.lastName}</td>
                                                <td>{t.members.filter(m => m.status === 'accepted').length} / {t.maxSize}</td>
                                                <td>
                                                    <span className={`badge ${t.status === 'complete' ? 'badge-primary' : 'badge-purple'}`}>
                                                        {t.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'participants' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
                            <div className="search-bar" style={{ flex: 1, maxWidth: 340 }}>
                                <FiSearch color="var(--color-text-dim)" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." />
                            </div>
                            <button className="btn btn-secondary btn-sm" onClick={handleCSV}><FiDownload /> Export CSV</button>
                        </div>

                        {filtered.length === 0 ? (
                            <div className="empty-state"><div className="empty-state-icon"></div><p>No registrations yet.</p></div>
                        ) : (
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Ticket ID</th>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Reg. Date</th>
                                            <th>Status</th>
                                            <th>Payment</th>
                                            <th>Details</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(r => (
                                            <tr key={r._id}>
                                                <td><span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-primary-light)' }}>{r.ticketId}</span></td>
                                                <td>{r.participant?.firstName} {r.participant?.lastName}</td>
                                                <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{r.participant?.email}</td>
                                                <td style={{ fontSize: '0.78rem' }}>{format(new Date(r.registeredAt || r.createdAt), 'dd MMM yy')}</td>
                                                <td><span className={`badge ${r.status === 'attended' ? 'badge-purple' : r.status === 'confirmed' ? 'badge-primary' : 'badge-danger'}`}>{r.status}</span></td>
                                                <td><span className={`badge ${r.paymentStatus === 'free' ? 'badge-purple' : r.paymentStatus === 'paid' ? 'badge-primary' : 'badge-purple'}`}>{r.paymentStatus}</span></td>
                                                <td>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => setSelectedReg(r)}>View</button>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        {r.status === 'confirmed' && (
                                                            <>
                                                                <button className="btn btn-primary btn-sm" onClick={() => handleAttendance(r._id)}>
                                                                    <FiCheck size={12} /> Attended
                                                                </button>
                                                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleReject(r._id)}>
                                                                    Reject
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'overview' && (
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {[['Description', event.description], ['Eligibility', event.eligibility], ['Fee', event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'], ['Deadline', event.registrationDeadline && format(new Date(event.registrationDeadline), 'dd MMM yyyy HH:mm')], ['Limit', event.registrationLimit || 'Unlimited']].map(([k, v]) => (
                            <div key={k}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                                <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{v || '-'}</div>
                            </div>
                        ))}
                        {event.tags?.length > 0 && (
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Tags</div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>{event.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'approvals' && (
                    <>
                        <div style={{ marginBottom: '1rem' }}>
                            <p className="text-muted">Review payment proofs uploaded by participants before approving their registration and generating their tickets.</p>
                        </div>
                        {registrations.filter(r => r.paymentStatus === 'pending' && r.paymentProofUrl).length === 0 ? (
                            <div className="empty-state"><div className="empty-state-icon"></div><p>No pending payment approvals.</p></div>
                        ) : (
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Participant</th>
                                            <th>Email</th>
                                            <th>Amount</th>
                                            <th>Payment Proof</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {registrations.filter(r => r.paymentStatus === 'pending' && r.paymentProofUrl).map(r => (
                                            <tr key={r._id}>
                                                <td>{r.participant?.firstName} {r.participant?.lastName}</td>
                                                <td>{r.participant?.email}</td>
                                                <td style={{ fontWeight: 600 }}>₹{r.totalAmount || event.registrationFee}</td>
                                                <td>
                                                    <a href={r.paymentProofUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>View Proof </a>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button className="btn btn-success btn-sm" onClick={() => handleApprovePayment(r._id)}>Approve</button>
                                                        <button className="btn btn-danger btn-sm" onClick={() => handleRejectPayment(r._id)}>Reject</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'feedback' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <p className="text-muted">Anonymous feedback from verified attendees.</p>
                            <select className="input" style={{ width: 140 }} value={feedbackFilter} onChange={e => setFeedbackFilter(e.target.value)}>
                                <option value="">All Ratings</option>
                                {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Stars</option>)}
                            </select>
                        </div>

                        {feedbackAnalytics && feedbackAnalytics.total > 0 && (
                            <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ textAlign: 'center', minWidth: '150px' }}>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                                        {feedbackAnalytics.average}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', color: 'var(--color-primary-light)', marginTop: '0.25rem' }}>
                                        {[1, 2, 3, 4, 5].map(s => <FiStar key={s} size={18} fill={s <= Math.round(feedbackAnalytics.average) ? 'currentColor' : 'none'} />)}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                                        {feedbackAnalytics.total} Reviews
                                    </div>
                                </div>
                                <div style={{ flex: 1, borderLeft: '1px solid var(--color-border)', paddingLeft: '2rem', minWidth: '250px' }}>
                                    {[5, 4, 3, 2, 1].map(star => {
                                        const count = feedbackAnalytics.ratingCounts[star] || 0;
                                        const percentage = feedbackAnalytics.total > 0 ? (count / feedbackAnalytics.total) * 100 : 0;
                                        return (
                                            <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                                <div style={{ width: 45, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>{star} <FiStar size={12} fill="currentColor" color="var(--color-primary-light)" /></div>
                                                <div style={{ flex: 1, height: 8, background: 'var(--color-surface2)', borderRadius: 4, overflow: 'hidden' }}>
                                                    <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--color-primary-light)', borderRadius: 4 }} />
                                                </div>
                                                <div style={{ width: 30, textAlign: 'right', color: 'var(--color-text-muted)' }}>{count}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {feedbacks.filter(f => !feedbackFilter || f.rating === Number(feedbackFilter)).length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon"><FiStar size={32} /></div>
                                <p>No feedback matching this filter.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                {feedbacks.filter(f => !feedbackFilter || f.rating === Number(feedbackFilter)).map(f => (
                                    <div key={f._id} className="card">
                                        <div style={{ display: 'flex', gap: '0.25rem', color: 'var(--color-primary-light)', marginBottom: '0.75rem' }}>
                                            {[1, 2, 3, 4, 5].map(s => <FiStar key={s} size={16} fill={s <= f.rating ? 'currentColor' : 'none'} />)}
                                        </div>
                                        <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: f.comment ? 'var(--color-text)' : 'var(--color-text-muted)', fontStyle: f.comment ? 'normal' : 'italic' }}>
                                            {f.comment || 'No comment provided'}
                                        </p>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '1rem' }}>
                                            {format(new Date(f.createdAt), 'dd MMM yyyy')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Registration Details Modal */}
            {selectedReg && (
                <div className="modal-overlay" onClick={() => setSelectedReg(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Registration Details</h3>
                            <button className="btn btn-ghost" onClick={() => setSelectedReg(null)}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ padding: '1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ fontWeight: 600 }}>{selectedReg.participant?.firstName} {selectedReg.participant?.lastName}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{selectedReg.participant?.email}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{selectedReg.participant?.contactNumber}</div>
                            </div>

                            <div>
                                <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Form Responses</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                    {event.customForm?.map(field => (
                                        <div key={field.label}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{field.label}</div>
                                            <div style={{ marginTop: '0.25rem' }}>
                                                {typeof selectedReg.formResponses?.[field.label] === 'string' && selectedReg.formResponses[field.label].startsWith('/uploads/') ? (
                                                    <a href={`${axios.defaults.baseURL.replace(/\/api\/?$/, '')}${selectedReg.formResponses[field.label]}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <FiDownload size={14} /> View File
                                                    </a>
                                                ) : (
                                                    Array.isArray(selectedReg.formResponses?.[field.label])
                                                        ? selectedReg.formResponses[field.label].join(', ')
                                                        : (selectedReg.formResponses?.[field.label] || '-')
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {(!event.customForm || event.customForm.length === 0) && <div className="text-muted">No custom fields for this event.</div>}
                                </div>
                            </div>
                        </div>
                        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={() => setSelectedReg(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrganizerEventDetail;
