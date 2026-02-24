import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { FiSend, FiTrash2, FiBell } from 'react-icons/fi';

const OrganizerAnnouncements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchAnnouncements = async () => {
        try {
            const { data } = await axios.get('/announcements/my');
            setAnnouncements(data);
        } catch (err) {
            toast.error('Failed to load announcements');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;

        setSubmitting(true);
        try {
            await axios.post('/announcements', { content });
            toast.success('Announcement sent and posted to Discord');
            setContent('');
            fetchAnnouncements();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send announcement');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: '800px' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ margin: 0 }}>Announcements</h1>
                    <p className="text-muted">Broadcast messages to all your followers and Discord.</p>
                </div>

                {/* Create Form */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginTop: 0 }}>New Announcement</h3>
                    <form onSubmit={handleCreate}>
                        <div className="form-group">
                            <label>Message Content</label>
                            <textarea
                                className="form-control"
                                rows="4"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Write your announcement here..."
                                disabled={submitting}
                                style={{ resize: 'vertical' }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={submitting || !content.trim()}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <FiSend /> {submitting ? 'Sending...' : 'Broadcast Announcement (@everyone)'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* History */}
                <div className="card">
                    <h3 style={{ marginTop: 0 }}>Recent Announcements</h3>
                    {loading ? (
                        <div className="loading-center" style={{ padding: '2rem' }}><div className="spinner" /></div>
                    ) : announcements.length === 0 ? (
                        <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                            <div className="empty-state-icon"><FiBell /></div>
                            <p>No announcements sent yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {announcements.map((a) => (
                                <div key={a._id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                            {format(new Date(a.createdAt), 'dd MMM yyyy, HH:mm')}
                                        </span>
                                        <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Discord Notified</span>
                                    </div>
                                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.925rem', lineHeight: 1.5 }}>{a.content}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrganizerAnnouncements;
