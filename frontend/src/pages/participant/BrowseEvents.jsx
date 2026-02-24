import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Fuse from 'fuse.js';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { FiSearch, FiFilter, FiCalendar, FiTrendingUp, FiX } from 'react-icons/fi';

const EventCard = ({ event, onClick }) => (
    <div className="event-card" onClick={() => onClick(event._id)}>
        <div className="event-card-header">
            <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{event.organizer?.organizerName}</span>
            <span className={`badge ${event.type === 'merchandise' ? 'badge-cyan' : 'badge-purple'}`}>{event.type}</span>
        </div>
        <div className="event-card-body">
            <h4 className="event-card-title">{event.name}</h4>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {event.tags?.slice(0, 3).map(t => <span key={t} className="tag">{t}</span>)}
            </div>
            <div className="event-card-meta">
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <FiCalendar size={12} /> {event.startDate && format(new Date(event.startDate), 'dd MMM yyyy')}
                </div>
                {event.registrationFee > 0
                    ? <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>₹{event.registrationFee}</span>
                    : <span style={{ color: 'var(--color-primary)' }}>Free</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                <span className={`badge ${event.eligibility === 'all' ? 'badge-primary' : 'badge-purple'}`}>{event.eligibility}</span>
                <span className={`badge status-${event.status}`}>{event.status}</span>
            </div>
        </div>
    </div>
);

const BrowseEvents = () => {
    const [events, setEvents] = useState([]);
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ type: '', eligibility: '', startDate: '', endDate: '', followed: false });
    const [showFilters, setShowFilters] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ trending: 'true', limit: 100 });
            if (filters.type) params.set('type', filters.type);
            if (filters.eligibility) params.set('eligibility', filters.eligibility);
            if (filters.startDate) params.set('startDate', filters.startDate);
            if (filters.endDate) params.set('endDate', filters.endDate);
            if (filters.followed && user?.id) { params.set('followed', 'true'); params.set('userId', user.id); }
            const { data } = await axios.get(`/events?${params}`);
            setEvents(data.events || []);
            setTrending(data.trending || []);
        } catch (err) {
            setEvents([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEvents(); }, [filters]);

    const fuse = useMemo(() => new Fuse(events, {
        keys: ['name', 'organizer.organizerName', 'tags'],
        threshold: 0.4,
    }), [events]);

    const displayEvents = search.trim()
        ? fuse.search(search.trim()).map(r => r.item)
        : events;

    const filterCount = Object.values(filters).filter(v => v && v !== false).length;

    return (
        <div className="page">
            <div className="container">
                <div style={{ marginBottom: '2rem' }}>
                    <h1>Browse Events</h1>
                    <p className="text-muted">Discover workshops, competitions, merchandise, and more</p>
                </div>

                {/* Search + Filter bar */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="search-bar" style={{ flex: '1 1 300px', minWidth: 250 }}>
                        <FiSearch color="var(--color-text-dim)" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events, organizers..." />
                        {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-dim)' }}><FiX /></button>}
                    </div>
                    <button className="btn btn-secondary" onClick={() => setShowFilters(!showFilters)} style={{ position: 'relative' }}>
                        <FiFilter /> Filters
                        {filterCount > 0 && <span className="badge badge-primary" style={{ marginLeft: 4 }}>{filterCount}</span>}
                    </button>
                </div>

                {showFilters && (
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                            <div className="form-group">
                                <label className="form-label">Event Type</label>
                                <select className="form-select" value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}>
                                    <option value="">All Types</option>
                                    <option value="normal">Normal</option>
                                    <option value="merchandise">Merchandise</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Eligibility</label>
                                <select className="form-select" value={filters.eligibility} onChange={e => setFilters({ ...filters, eligibility: e.target.value })}>
                                    <option value="">All</option>
                                    <option value="iiit">IIIT Only</option>
                                    <option value="non-iiit">Non-IIIT</option>
                                    <option value="all">Open</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">From Date</label>
                                <input type="date" className="form-input" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">To Date</label>
                                <input type="date" className="form-input" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
                            </div>
                            {user && (
                                <div className="form-group">
                                    <label className="form-label">Show</label>
                                    <button className={`btn ${filters.followed ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilters({ ...filters, followed: !filters.followed })}>
                                        {filters.followed ? '✓ Followed Clubs' : 'Followed Clubs'}
                                    </button>
                                </div>
                            )}
                            <button className="btn btn-ghost" onClick={() => setFilters({ type: '', eligibility: '', startDate: '', endDate: '', followed: false })}>
                                Clear Filters
                            </button>
                        </div>
                    </div>
                )}

                {/* Trending */}
                {trending.length > 0 && !search && (
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <FiTrendingUp color="var(--color-primary)" />
                            <h3 style={{ margin: 0 }}>Trending Today</h3>
                            <span className="badge badge-primary" style={{ marginLeft: 4 }}>Top 5</span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                            {trending.map((e, i) => (
                                <div key={e._id} onClick={() => navigate(`/events/${e._id}`)}
                                    style={{
                                        minWidth: 220, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-lg)', padding: '1rem', cursor: 'pointer', flexShrink: 0,
                                        transition: 'var(--transition)', position: 'relative', overflow: 'hidden',
                                    }}
                                    onMouseEnter={el => el.currentTarget.style.borderColor = 'var(--color-primary)'}
                                    onMouseLeave={el => el.currentTarget.style.borderColor = 'var(--color-border)'}>
                                    <span style={{ position: 'absolute', top: 8, right: 8, fontSize: '1.2rem', fontWeight: 800, color: 'rgba(255,20,147,0.15)' }}>#{i + 1}</span>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>{e.name}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <FiTrendingUp size={11} color="var(--color-primary)" /> {e.recentViewCount || 0} views today
                                    </div>
                                    <div style={{ marginTop: '0.5rem' }}><span className={`badge status-${e.status}`}>{e.status}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Event grid */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>All Events <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>({displayEvents.length})</span></h3>
                </div>

                {loading ? (
                    <div className="loading-center"><div className="spinner" /></div>
                ) : displayEvents.length === 0 ? (
                    <div className="empty-state"><div className="empty-state-icon"></div><p>No events found. Try different filters or search terms.</p></div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                        {displayEvents.map(e => (
                            <EventCard key={e._id} event={e} onClick={id => navigate(`/events/${id}`)} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BrowseEvents;
