import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const PasswordResets = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resolvingId, setResolvingId] = useState(null);
    const [generatedCredential, setGeneratedCredential] = useState(null);
    const [comments, setComments] = useState({});

    const fetchRequests = async () => {
        try {
            const { data } = await axios.get('/admin/password-resets');
            setRequests(data);
        } catch (err) {
            toast.error('Failed to load password reset requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleCommentChange = (id, val) => {
        setComments(prev => ({ ...prev, [id]: val }));
    };

    const handleResolve = async (id) => {
        if (!window.confirm('Are you sure you want to generate a new password for this organizer?')) return;
        setResolvingId(id);

        try {
            const { data } = await axios.put(`/admin/password-resets/${id}/resolve`, {
                adminComment: comments[id]
            });
            toast.success('Password reset successfully');

            setGeneratedCredential({
                email: data.organizerEmail,
                password: data.newPassword
            });

            fetchRequests();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to resolve request');
        } finally {
            setResolvingId(null);
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm('Are you sure you want to reject this request?')) return;
        setResolvingId(id);

        try {
            await axios.put(`/admin/password-resets/${id}/reject`, {
                adminComment: comments[id]
            });
            toast.success('Request rejected');
            fetchRequests();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to reject request');
        } finally {
            setResolvingId(null);
        }
    };

    if (loading) return <div className="page"><div className="loading-center"><div className="spinner" /></div></div>;

    return (
        <div className="page">
            <div className="container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ margin: 0, marginBottom: '0.25rem' }}>Password Resets</h1>
                        <p className="text-muted" style={{ fontSize: '0.875rem' }}>Manage organizer password recovery requests</p>
                    </div>
                </div>

                {generatedCredential && (
                    <div className="card" style={{ backgroundColor: '#fff0f5', borderColor: '#ff69b4', marginBottom: '2rem' }}>
                        <h3 style={{ color: '#c71585', marginTop: 0 }}>Password Generated Successfully</h3>
                        <p style={{ color: '#db7093', marginBottom: '1rem' }}>Please securely communicate this temporary password to the organizer. <strong>It will not be shown again.</strong></p>
                        <div style={{ background: '#fff', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #ffb6c1', fontFamily: 'monospace', fontSize: '1.2rem', color: '#ff1493' }}>
                            <div style={{ marginBottom: '0.5rem' }}>Email: <strong>{generatedCredential.email}</strong></div>
                            <div>Password: <strong>{generatedCredential.password}</strong></div>
                        </div>
                        <button className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }} onClick={() => setGeneratedCredential(null)}>Dismiss</button>
                    </div>
                )}

                <div className="card full-width">
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Organizer</th>
                                    <th>Requested Info</th>
                                    <th>Status</th>
                                    <th style={{ width: '350px' }}>Action & Admin Comment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                                            No password reset requests found.
                                        </td>
                                    </tr>
                                ) : (
                                    requests.map(req => (
                                        <tr key={req._id}>
                                            <td style={{ verticalAlign: 'top' }}>
                                                <div style={{ fontWeight: 600 }}>{req.organizer?.organizerName || 'Unknown User'}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{req.organizer?.email}</div>
                                                <div style={{ marginTop: 4 }}><span className="badge badge-purple">{req.organizer?.category || 'N/A'}</span></div>
                                            </td>
                                            <td style={{ verticalAlign: 'top' }}>
                                                <div style={{ fontSize: '0.85rem' }}><span className="text-muted">Requested:</span> {format(new Date(req.requestedAt), 'dd MMM yy, HH:mm')}</div>
                                                {req.reason && (
                                                    <div style={{ marginTop: 6, fontSize: '0.875rem', padding: '6px 10px', background: 'var(--color-surface2)', borderRadius: 4, borderLeft: '3px solid var(--color-primary-light)' }}>
                                                        <strong>Reason:</strong> {req.reason}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ verticalAlign: 'top' }}>
                                                <span className={`badge ${req.status === 'pending' ? 'badge-purple' : req.status === 'resolved' ? 'badge-primary' : 'badge-danger'}`}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td style={{ verticalAlign: 'top' }}>
                                                {req.status === 'pending' ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <textarea
                                                            className="form-textarea"
                                                            placeholder="Admin internal comment..."
                                                            rows={2}
                                                            style={{ fontSize: '0.85rem' }}
                                                            value={comments[req._id] || ''}
                                                            onChange={(e) => handleCommentChange(req._id, e.target.value)}
                                                        />
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button
                                                                className="btn btn-primary btn-sm"
                                                                style={{ flex: 1 }}
                                                                onClick={() => handleResolve(req._id)}
                                                                disabled={resolvingId === req._id}
                                                            >
                                                                {resolvingId === req._id ? '...' : 'Approve'}
                                                            </button>
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                style={{ flex: 1 }}
                                                                onClick={() => handleReject(req._id)}
                                                                disabled={resolvingId === req._id}
                                                            >
                                                                {resolvingId === req._id ? '...' : 'Reject'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: '0.85rem' }}>
                                                        <div className="text-muted">{req.status.charAt(0).toUpperCase() + req.status.slice(1)} on {format(new Date(req.resolvedAt || req.updatedAt), 'dd MMM yyyy')}</div>
                                                        {req.adminComment && (
                                                            <div style={{ marginTop: 6, opacity: 0.8, fontStyle: 'italic' }}>
                                                                "{req.adminComment}"
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default PasswordResets;
