import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';

const OrganizerDetail = () => {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        axios.get(`/organizers/${id}`).then(r => setData(r.data)).finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="loading-center" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;
    if (!data) return <div className="page"><div className="container"><div className="empty-state">Organizer not found.</div></div></div>;

    const { organizer, upcomingEvents, pastEvents } = data;

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: 800 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '1.5rem' }}>← Back</button>

                {/* Organizer Header */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1rem' }}>
                        <div className="avatar avatar-lg" style={{ width: 72, height: 72, fontSize: '1.75rem' }}>{organizer.organizerName.slice(0, 1)}</div>
                        <div>
                            <h2 style={{ margin: 0 }}>{organizer.organizerName}</h2>
                            <span className="badge badge-primary" style={{ marginTop: '0.3rem' }}>{organizer.category}</span>
                        </div>
                    </div>
                    {organizer.description && (
                        <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.8, marginBottom: '0.75rem' }}>{organizer.description}</p>
                    )}
                    {organizer.contactEmail && (
                        <a href={`mailto:${organizer.contactEmail}`} style={{ fontSize: '0.875rem', color: 'var(--color-primary-light)' }}>
                             {organizer.contactEmail}
                        </a>
                    )}
                </div>

                {/* Upcoming Events */}
                <h3 style={{ marginBottom: '1rem' }}>Upcoming Events ({upcomingEvents.length})</h3>
                {upcomingEvents.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem' }}><p>No upcoming events.</p></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                        {upcomingEvents.map(e => (
                            <div key={e._id} onClick={() => navigate(`/events/${e._id}`)}
                                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'var(--transition)' }}
                                onMouseEnter={el => el.currentTarget.style.borderColor = 'var(--color-primary)'}
                                onMouseLeave={el => el.currentTarget.style.borderColor = 'var(--color-border)'}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{e.name}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                        {format(new Date(e.startDate), 'dd MMM yyyy')} → {format(new Date(e.endDate), 'dd MMM yyyy')}
                                    </div>
                                </div>
                                <span className={`badge ${e.type === 'merchandise' ? 'badge-cyan' : 'badge-purple'}`}>{e.type}</span>
                                <span className={`badge status-${e.status}`}>{e.status}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Past Events */}
                <h3 style={{ marginBottom: '1rem' }}>Past Events ({pastEvents.length})</h3>
                {pastEvents.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem' }}><p>No past events.</p></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {pastEvents.map(e => (
                            <div key={e._id} onClick={() => navigate(`/events/${e._id}`)}
                                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', opacity: 0.75, transition: 'var(--transition)' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{e.name}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{format(new Date(e.endDate), 'dd MMM yyyy')}</div>
                                </div>
                                <span className={`badge status-${e.status}`}>{e.status}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrganizerDetail;
