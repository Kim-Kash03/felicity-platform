import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const Clubs = () => {
    const [organizers, setOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [followed, setFollowed] = useState([]);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        axios.get('/organizers').then(r => setOrganizers(r.data)).finally(() => setLoading(false));
        // Fetch fresh follow list directly from the profile endpoint to avoid stale cache
        if (user) {
            axios.get('/participants/profile')
                .then(r => setFollowed((r.data.followedOrganizers || []).map(id => id?.toString ? id.toString() : id)))
                .catch(() => setFollowed((user.followedOrganizers || []).map(id => id?.toString ? id.toString() : id)));
        }
    }, []);

    const toggleFollow = async (orgId) => {
        if (!user) { navigate('/login'); return; }
        const strId = orgId.toString();
        try {
            const { data } = await axios.post(`/participants/follow/${strId}`);
            setFollowed(prev =>
                data.following
                    ? [...prev, strId]
                    : prev.filter(id => id.toString() !== strId)
            );
            toast.success(data.message);
        } catch (err) {
            toast.error('Failed to update follow status');
        }
    };

    const isFollowed = (id) => followed.includes(id.toString());

    return (
        <div className="page">
            <div className="container">
                <div style={{ marginBottom: '2rem' }}>
                    <h1>Clubs & Organizers</h1>
                    <p className="text-muted">Discover and follow your favourite clubs to get personalized event updates</p>
                </div>

                {loading ? (
                    <div className="loading-center"><div className="spinner" /></div>
                ) : organizers.length === 0 ? (
                    <div className="empty-state"><div className="empty-state-icon"></div><p>No clubs registered yet. Check back soon!</p></div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                        {organizers.map(org => (
                            <div key={org._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                                    <div className="avatar avatar-lg">{org.organizerName.slice(0, 1)}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h4 style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{org.organizerName}</h4>
                                        <span className="badge badge-primary" style={{ marginTop: '0.25rem', fontSize: '0.72rem' }}>{org.category}</span>
                                    </div>
                                </div>
                                {org.description && (
                                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {org.description}
                                    </p>
                                )}
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                                    <button className="btn btn-ghost btn-sm btn-full" onClick={() => navigate(`/clubs/${org._id}`)}>View Profile</button>
                                    {user?.role === 'participant' && (
                                        <button
                                            className={`btn btn-sm btn-full ${isFollowed(org._id) ? 'btn-secondary' : 'btn-primary'}`}
                                            onClick={() => toggleFollow(org._id)}>
                                            {isFollowed(org._id) ? '✓ Following' : '+ Follow'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Clubs;
