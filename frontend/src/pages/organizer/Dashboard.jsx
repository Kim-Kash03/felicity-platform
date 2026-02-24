import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import {
    FiPlus, FiExternalLink, FiCalendar, FiUsers, FiDollarSign,
    FiBarChart2, FiClock, FiTag,
} from 'react-icons/fi';

const STATUS_COLORS = {
    draft: 'status-draft',
    published: 'status-published',
    ongoing: 'status-ongoing',
    completed: 'status-completed',
    closed: 'status-closed',
};

const BAR_COLORS = ['#ff1493', '#ff69b4', '#db7093', '#da70d6', '#f472b6', '#e879f9'];

// Mini bar for attendance rate
const AttendanceBar = ({ rate }) => (
    <div style={{ marginTop: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 3 }}>
            <span>Attendance</span><span>{rate}%</span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${rate}%`, background: 'var(--color-success)', borderRadius: 3, transition: 'width 0.6s ease' }} />
        </div>
    </div>
);

// Event card (all events)
const EventCard = ({ e, onClick }) => (
    <div
        className="card"
        style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.65rem', transition: 'transform 0.15s, box-shadow 0.15s' }}
        onClick={onClick}
        onMouseEnter={el => { el.currentTarget.style.transform = 'translateY(-2px)'; el.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)'; }}
        onMouseLeave={el => { el.currentTarget.style.transform = ''; el.currentTarget.style.boxShadow = ''; }}
    >
        {/* Type + Status row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className={`badge ${e.type === 'merchandise' ? 'badge-cyan' : 'badge-purple'}`} style={{ fontSize: '0.7rem' }}>
                <FiTag size={10} style={{ marginRight: 3 }} />{e.type}
            </span>
            <span className={`badge ${STATUS_COLORS[e.status]}`} style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>{e.status}</span>
        </div>

        {/* Title */}
        <h4 style={{ margin: 0, lineHeight: 1.3 }}>{e.name}</h4>

        {/* Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            <FiCalendar size={12} />
            {e.startDate ? format(new Date(e.startDate), 'dd MMM yyyy') : '—'}
        </div>

        {/* Fee + Registration limit */}
        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            <span><FiDollarSign size={11} /> {e.registrationFee > 0 ? `₹${e.registrationFee}` : 'Free'}</span>
            {e.registrationLimit > 0 && <span><FiUsers size={11} /> Limit: {e.registrationLimit}</span>}
        </div>

        {/* Tags */}
        {e.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {e.tags.slice(0, 3).map(t => (
                    <span key={t} style={{ fontSize: '0.68rem', background: 'var(--color-surface2)', padding: '2px 7px', borderRadius: 20, color: 'var(--color-text-muted)' }}>{t}</span>
                ))}
            </div>
        )}

        {/* CTA */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.25rem' }}>
            <span className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem', pointerEvents: 'none' }}>
                View Details <FiExternalLink size={11} />
            </span>
        </div>
    </div>
);

// Analytics card for a single completed event
const AnalyticsCard = ({ ev, idx }) => {
    const color = BAR_COLORS[idx % BAR_COLORS.length];
    return (
        <div className="card" style={{ borderLeft: `3px solid ${color}`, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ev.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', marginTop: 2 }}>
                        {ev.startDate ? format(new Date(ev.startDate), 'dd MMM yyyy') : '—'}
                    </div>
                </div>
                <span className="badge status-completed" style={{ fontSize: '0.68rem' }}>Completed</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{ background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', marginBottom: 2 }}>Registrations</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{ev.registrations}</div>
                </div>
                <div style={{ background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', marginBottom: 2 }}>Paid Sales</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>{ev.paid}</div>
                </div>
                <div style={{ background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', marginBottom: 2 }}>Revenue</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-secondary)' }}>₹{ev.revenue.toLocaleString()}</div>
                </div>
                <div style={{ background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', marginBottom: 2 }}>Attended</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-accent)' }}>{ev.attended}</div>
                </div>
            </div>

            <AttendanceBar rate={ev.attendanceRate} />
        </div>
    );
};

const OrganizerDashboard = () => {
    const [events, setEvents] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        Promise.all([
            axios.get('/events/organizer/my'),
            axios.get('/organizers/analytics/all'),
        ]).then(([evRes, anRes]) => {
            setEvents(evRes.data);
            setAnalytics(anRes.data);
        }).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const filteredEvents = activeTab === 'all'
        ? events
        : events.filter(e => e.status === activeTab);

    const tabCounts = {
        all: events.length,
        draft: events.filter(e => e.status === 'draft').length,
        published: events.filter(e => e.status === 'published').length,
        ongoing: events.filter(e => e.status === 'ongoing').length,
        completed: events.filter(e => e.status === 'completed').length,
    };

    return (
        <div className="page">
            <div className="container">

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <h1 style={{ margin: 0 }}>{user?.organizerName}</h1>
                        <p className="text-muted" style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>{user?.category} Club Dashboard</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => navigate('/organizer/create')}><FiPlus /> Create Event</button>
                </div>

                {/* Global Analytics Stats */}
                {analytics && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="stat-card">

                            <div className="stat-value">{analytics.totalEvents}</div>
                            <div className="stat-label">Events Hosted</div>
                        </div>
                        <div className="stat-card">

                            <div className="stat-value">{analytics.completedEvents ?? 0}</div>
                            <div className="stat-label">Completed</div>
                        </div>
                        <div className="stat-card">

                            <div className="stat-value">{analytics.totalSales}</div>
                            <div className="stat-label">Registrations</div>
                        </div>
                        <div className="stat-card">

                            <div className="stat-value">{analytics.attended}</div>
                            <div className="stat-label">Attended</div>
                        </div>
                        <div className="stat-card">

                            <div className="stat-value">₹{(analytics.revenue || 0).toLocaleString()}</div>
                            <div className="stat-label">Revenue</div>
                        </div>
                    </div>
                )}

                {/* ── MY EVENTS SECTION ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.15rem' }}>My Events</h2>
                </div>

                {/* Filter tabs */}
                <div className="tabs" style={{ marginBottom: '1.25rem' }}>
                    {['all', 'draft', 'published', 'ongoing', 'completed'].map(tab => (
                        <button
                            key={tab}
                            className={`tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            {tabCounts[tab] > 0 && (
                                <span className="badge badge-primary" style={{ marginLeft: 6, fontSize: '0.65rem', padding: '1px 6px' }}>
                                    {tabCounts[tab]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="loading-center"><div className="spinner" /></div>
                ) : filteredEvents.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon"><FiClock size={36} /></div>
                        <p>{activeTab === 'all' ? 'No events yet. Create your first event!' : `No ${activeTab} events.`}</p>
                        {activeTab === 'all' && (
                            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/organizer/create')}>
                                <FiPlus /> Create Event
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
                        {filteredEvents.map(e => (
                            <EventCard key={e._id} e={e} onClick={() => navigate(`/organizer/events/${e._id}`)} />
                        ))}
                    </div>
                )}

                {/* ── EVENT ANALYTICS SECTION (completed only) ── */}
                {analytics?.perEvent?.length > 0 && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                            <FiBarChart2 size={20} color="var(--color-primary-light)" />
                            <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Event Analytics</h2>
                            <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{analytics.perEvent.length} completed</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                            {analytics.perEvent.map((ev, i) => (
                                <AnalyticsCard key={ev._id} ev={ev} idx={i} />
                            ))}
                        </div>
                    </>
                )}

            </div>
        </div>
    );
};

export default OrganizerDashboard;
