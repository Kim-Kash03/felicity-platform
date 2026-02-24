import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

import { Link } from 'react-router-dom';

const StatCard = ({ label, value, color }) => (
    <div className="stat-card" style={{ borderColor: color ? `${color}40` : undefined }}>
        <div style={{ marginBottom: '0.75rem' }}>
            <div className="stat-label">{label}</div>
        </div>
        <div className="stat-value" style={{ backgroundImage: color ? `linear-gradient(135deg, ${color}, ${color}aa)` : undefined }}>{value}</div>
    </div>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await axios.get('/admin/stats');
                setStats(data);
            } catch (err) {
                toast.error('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="page"><div className="loading-center"><div className="spinner" /></div></div>;

    return (
        <div className="page">
            <div className="container">
                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ marginBottom: '0.25rem' }}>
                        <h1 style={{ margin: 0 }}>Admin Overview</h1>
                    </div>
                    <p className="text-muted" style={{ fontSize: '0.875rem' }}>Felicity Event Management System — System-wide statistics</p>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    <StatCard label="Total Participants" value={stats?.totalParticipants ?? 0} color="#ff1493" />
                    <StatCard label="Total Organizers" value={stats?.totalOrganizers ?? 0} color="#ff69b4" />
                    <StatCard label="Total Events" value={stats?.totalEvents ?? 0} color="#db7093" />
                    <StatCard label="Active Events" value={stats?.activeEvents ?? 0} color="#da70d6" />
                    <StatCard label="Total Revenue" value={`₹${stats?.totalRevenue?.toLocaleString() ?? 0}`} color="#f472b6" />
                </div>

                {/* Recent Sections */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                    {/* Recent Organizer Registrations */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem' }}>Recent Organizers</h3>
                            <Link to="/admin/organizers" style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)' }}>View All →</Link>
                        </div>
                        {stats?.recentOrganizers?.length === 0 ? (
                            <p className="text-muted" style={{ fontSize: '0.85rem' }}>No organizers yet.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {stats?.recentOrganizers?.map(org => (
                                    <div key={org._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{org.organizerName}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{org.category}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span className={`badge ${org.isActive ? 'badge-primary' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>{org.isActive ? 'Active' : 'Disabled'}</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>{format(new Date(org.createdAt), 'dd MMM')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Password Reset Requests */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem' }}>Password Reset Requests</h3>
                            <Link to="/admin/resets" style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)' }}>View All →</Link>
                        </div>
                        {stats?.recentResets?.length === 0 ? (
                            <p className="text-muted" style={{ fontSize: '0.85rem' }}>No reset requests.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {stats?.recentResets?.map(r => (
                                    <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.organizer?.organizerName || 'Unknown'}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{r.organizer?.email}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span className={`badge ${r.status === 'pending' ? 'badge-purple' : 'badge-primary'}`} style={{ fontSize: '0.7rem' }}>{r.status}</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>{format(new Date(r.createdAt), 'dd MMM')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Events */}
                    <div className="card" style={{ gridColumn: '1 / -1' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem' }}>Recent Events Created</h3>
                        </div>
                        {stats?.recentEvents?.length === 0 ? (
                            <p className="text-muted" style={{ fontSize: '0.85rem' }}>No events yet.</p>
                        ) : (
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Event Name</th>
                                            <th>Organizer</th>
                                            <th>Status</th>
                                            <th>Fee</th>
                                            <th>Created</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats?.recentEvents?.map(ev => (
                                            <tr key={ev._id}>
                                                <td style={{ fontWeight: 600 }}>{ev.name}</td>
                                                <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{ev.organizer?.organizerName || '—'}</td>
                                                <td><span className={`badge status-${ev.status}`}>{ev.status}</span></td>
                                                <td>{ev.registrationFee > 0 ? `₹${ev.registrationFee}` : 'Free'}</td>
                                                <td style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)' }}>{format(new Date(ev.createdAt), 'dd MMM yy')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
