import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { FiCalendar, FiClock, FiTag, FiUser, FiHash, FiBell, FiUsers } from 'react-icons/fi';
import TeamManagement from '../../components/TeamManagement';

const statusBadge = (s) => {
    const map = { confirmed: 'badge-primary', attended: 'badge-purple', cancelled: 'badge-danger', rejected: 'badge-danger' };
    return map[s] || 'badge-primary';
};

const ParticipantDashboard = () => {
    const [registrations, setRegistrations] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
    const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
    const [activeTab, setActiveTab] = useState('upcoming');
    const { user } = useAuth();
    const navigate = useNavigate();

    const fetchRegistrations = () => {
        axios.get('/participants/registrations')
            .then(r => setRegistrations(r.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchRegistrations();
        axios.get('/announcements/followed').then(r => setAnnouncements(r.data)).catch(() => { }).finally(() => setLoadingAnnouncements(false));
    }, []);

    const handleCancel = async (regId) => {
        if (!window.confirm('Are you sure you want to cancel this registration?')) return;
        try {
            await axios.put(`/registrations/${regId}/cancel`);
            toast.success('Registration cancelled successfully');
            fetchRegistrations();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to cancel registration');
        }
    };

    const handleMarkAsSeen = async (announcementId) => {
        try {
            await axios.put(`/announcements/${announcementId}/read`);
            setAnnouncements(prev => prev.filter(a => a._id !== announcementId));
        } catch (err) {
            toast.error('Failed to dismiss announcement');
        }
    };

    const now = new Date();
    const tabs = [
        { key: 'upcoming', label: 'Upcoming' },
        { key: 'normal', label: 'Normal' },
        { key: 'merchandise', label: 'Merchandise' },
        { key: 'completed', label: 'Completed' },
        { key: 'cancelled', label: 'Cancelled/Rejected' },
        { key: 'teams', label: 'My Teams' },
    ];

    const filteredRegs = registrations.filter(r => {
        if (activeTab === 'upcoming') {
            const isManualActive = r.event?.status === 'ongoing' || r.event?.status === 'published';
            const isActive = isManualActive || new Date(r.event?.endDate) >= now;
            return isActive && r.status !== 'cancelled';
        }
        if (activeTab === 'normal') return r.event?.type === 'normal';
        if (activeTab === 'merchandise') return r.event?.type === 'merchandise';
        if (activeTab === 'completed') return r.status === 'attended' || new Date(r.event?.endDate) < now || r.event?.status === 'closed' || r.event?.status === 'completed';
        if (activeTab === 'cancelled') return r.status === 'cancelled' || r.status === 'rejected';
        return true;
    });

    const upcoming = registrations.filter(r => {
        const isManualActive = r.event?.status === 'ongoing' || r.event?.status === 'published';
        const isDateActive = new Date(r.event?.endDate) >= now;
        return (isManualActive || isDateActive) && r.status !== 'cancelled';
    });

    return (
        <div className="page">
            <div className="container">
                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <h1>My Dashboard</h1>
                    <p className="text-muted">Welcome back, {user?.firstName}!</p>
                </div>

                <div className="dashboard-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '2rem' }}>
                    <div>
                        {/* Upcoming Events at a glance */}
                        {upcoming.length > 0 && (
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ marginBottom: '1rem' }}> Upcoming Events</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                    {upcoming.slice(0, 3).map(r => (
                                        <div key={r._id} className="card" style={{ borderColor: 'rgba(108,99,255,0.3)', cursor: 'pointer' }}
                                            onClick={() => navigate(`/events/${r.event._id}`)}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                                                <span className={`badge ${r.event?.type === 'merchandise' ? 'badge-cyan' : 'badge-purple'}`}>
                                                    {r.event?.type}
                                                </span>
                                                <span className={`badge ${statusBadge(r.status)}`}>{r.status}</span>
                                            </div>
                                            <h4 style={{ marginBottom: '0.5rem' }}>{r.event?.name}</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <FiUser size={12} /> {r.event?.organizer?.organizerName}
                                                </span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <FiCalendar size={12} /> {r.event?.startDate && format(new Date(r.event.startDate), 'dd MMM yyyy')}
                                                </span>
                                                {r.paymentStatus === 'pending' ? (
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <FiHash size={12} /> Pending Approval
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'monospace' }}>
                                                        <FiHash size={12} /> {r.ticketId}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <h3 style={{ marginBottom: '1rem' }}>Participation History & Teams</h3>
                        <div className="tabs">
                            {tabs.map(t => (
                                <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'teams' ? (
                            <TeamManagement />
                        ) : loading ? (
                            <div className="loading-center"><div className="spinner" /></div>
                        ) : filteredRegs.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon"></div>
                                <p>No records here yet.</p>
                                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/events')}>Browse Events</button>
                            </div>
                        ) : (
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Ticket ID</th>
                                            <th>Event Name</th>
                                            <th>Type</th>
                                            <th>Organizer</th>
                                            <th>Date</th>
                                            <th>Status</th>
                                            <th>Payment</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRegs.map(r => (
                                            <tr key={r._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/events/${r.event?._id}`)}>
                                                <td>
                                                    {r.paymentStatus === 'pending' ? (
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)' }}>Pending...</span>
                                                    ) : (
                                                        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-primary-light)' }}>{r.ticketId}</span>
                                                    )}
                                                </td>
                                                <td style={{ fontWeight: 500 }}>{r.event?.name}</td>
                                                <td><span className={`badge ${r.event?.type === 'merchandise' ? 'badge-cyan' : 'badge-purple'}`}>{r.event?.type}</span></td>
                                                <td>{r.event?.organizer?.organizerName || '-'}</td>
                                                <td style={{ fontSize: '0.8rem' }}>{r.event?.startDate && format(new Date(r.event.startDate), 'dd MMM yy')}</td>
                                                <td><span className={`badge ${statusBadge(r.status)}`}>{r.status}</span></td>
                                                <td><span className={`badge ${r.paymentStatus === 'free' ? 'badge-primary' : r.paymentStatus === 'paid' ? 'badge-purple' : 'badge-primary'}`}>{r.paymentStatus}</span></td>
                                                <td>
                                                    {(['confirmed', 'pending_approval'].includes(r.status) && new Date(r.event?.startDate) > new Date()) ? (
                                                        <button
                                                            className="btn btn-ghost btn-xs"
                                                            style={{ color: 'var(--color-danger)' }}
                                                            onClick={(e) => { e.stopPropagation(); handleCancel(r._id); }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    ) : null}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Announcements Sidebar */}
                    <div className="announcements-sidebar">
                        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FiBell size={20} style={{ color: 'var(--color-primary)' }} /> Feed
                        </h3>
                        <div className="card" style={{ padding: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
                            {loadingAnnouncements ? (
                                <div className="loading-center" style={{ padding: '1rem' }}><div className="spinner" /></div>
                            ) : announcements.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                                    <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>No updates yet.</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>Follow your favorite clubs to see their announcements here.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {announcements.slice(0, 4).map(a => (
                                        <div key={a._id} style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)', position: 'relative', paddingRight: '1rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', alignItems: 'flex-start' }}>
                                                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-primary-light)' }}>{a.organizer?.organizerName}</span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
                                                    {format(new Date(a.createdAt), 'dd MMM')}
                                                </span>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{a.content}</p>
                                            <button
                                                onClick={() => handleMarkAsSeen(a._id)}
                                                className="btn btn-ghost"
                                                style={{ position: 'absolute', top: 0, right: '-10px', padding: '2px 6px', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}
                                                title="Mark as seen"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                    {announcements.length > 4 && (
                                        <button
                                            className="btn btn-outline"
                                            style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem' }}
                                            onClick={() => setShowAllAnnouncements(true)}
                                        >
                                            View All Announcements ({announcements.length})
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* View All Announcements Modal */}
            {showAllAnnouncements && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    animation: 'fadeIn 0.2s ease-out'
                }} onClick={() => setShowAllAnnouncements(false)}>
                    <div style={{
                        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '600px',
                        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
                        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }} onClick={e => e.stopPropagation()}>

                        <div style={{
                            padding: '1.5rem', borderBottom: '1px solid var(--color-border)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'var(--color-surface-light)', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)'
                        }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FiBell style={{ color: 'var(--color-primary)' }} /> All Announcements
                            </h2>
                            <button className="btn btn-ghost" onClick={() => setShowAllAnnouncements(false)}>✕</button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {announcements.length === 0 ? (
                                <p className="text-muted" style={{ textAlign: 'center' }}>No announcements to display.</p>
                            ) : (
                                announcements.map(a => (
                                    <div key={a._id} className="card" style={{ padding: '1.25rem', position: 'relative' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary-light)' }} />
                                                {a.organizer?.organizerName}
                                            </span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                                {format(new Date(a.createdAt), 'dd MMM yyyy, h:mm a')}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--color-text)' }}>{a.content}</p>
                                        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                                            <button
                                                onClick={() => handleMarkAsSeen(a._id)}
                                                className="btn btn-ghost btn-sm"
                                                style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem' }}
                                            >
                                                ✓ Mark as Seen
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParticipantDashboard;
