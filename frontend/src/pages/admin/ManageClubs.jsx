import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiUsers, FiUserPlus, FiToggleLeft, FiToggleRight, FiTrash2 } from 'react-icons/fi';

const ManageClubs = () => {
    const [organizers, setOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newOrg, setNewOrg] = useState({ contactEmail: '', organizerName: '', category: 'Technical', description: '' });
    const [creating, setCreating] = useState(false);
    const [createdCreds, setCreatedCreds] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const fetchOrganizers = async () => {
        try {
            const { data } = await axios.get('/admin/organizers');
            setOrganizers(data);
        } catch {
            toast.error('Failed to load organizers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrganizers(); }, []);

    const handleCreate = async () => {
        if (!newOrg.organizerName || !newOrg.category) return toast.error('Name and category are required');
        setCreating(true);
        try {
            const { data } = await axios.post('/admin/organizers', newOrg);
            setCreatedCreds(data);
            toast.success('Organizer created!');
            setNewOrg({ contactEmail: '', organizerName: '', category: 'Technical', description: '' });
            fetchOrganizers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create');
        } finally { setCreating(false); }
    };

    const toggleStatus = async (org) => {
        try {
            const action = org.isActive ? 'disable' : 'enable';
            await axios.put(`/admin/organizers/${org._id}/${action}`);
            toast.success(`Organizer ${action}d`);
            fetchOrganizers();
        } catch { toast.error('Failed to update status'); }
    };

    const deleteOrg = async (id) => {
        if (confirmDeleteId !== id) {
            setConfirmDeleteId(id);
            setTimeout(() => setConfirmDeleteId(null), 3000);
            return;
        }
        try {
            const { data } = await axios.delete(`/admin/organizers/${id}`);
            toast.success(data.message || 'Organizer deleted');
            setConfirmDeleteId(null);
            fetchOrganizers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Deletion failed');
        }
    };

    return (
        <div className="page">
            <div className="container">
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <FiUsers color="var(--color-primary-light)" size={20} />
                            <h1 style={{ margin: 0 }}>Manage Clubs</h1>
                        </div>
                        <p className="text-muted" style={{ fontSize: '0.875rem' }}>{organizers.length} organizer{organizers.length !== 1 ? 's' : ''} registered</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}><FiUserPlus /> New Organizer</button>
                </div>

                {/* Create Form */}
                {showCreate && !createdCreds && (
                    <div className="card" style={{ marginBottom: '2rem', borderColor: 'var(--color-primary-light)' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Create Organizer Account</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Contact Email <span className="required">*</span></label>
                                <input className="form-input" type="email" placeholder="club@example.com" value={newOrg.contactEmail} onChange={e => setNewOrg({ ...newOrg, contactEmail: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Club / Organizer Name <span className="required">*</span></label>
                                <input className="form-input" placeholder="E-Cell" value={newOrg.organizerName} onChange={e => setNewOrg({ ...newOrg, organizerName: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category <span className="required">*</span></label>
                                <select className="form-select" value={newOrg.category} onChange={e => setNewOrg({ ...newOrg, category: e.target.value })}>
                                    <option value="Technical">Technical</option>
                                    <option value="Cultural">Cultural</option>
                                    <option value="Sports">Sports</option>
                                    <option value="Fest">Fest Team</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create Account'}</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
                        </div>
                    </div>
                )}

                {createdCreds && (
                    <div className="card" style={{ marginBottom: '2rem', borderColor: 'var(--color-primary)' }}>
                        <h3 style={{ marginBottom: '0.75rem' }}>Organizer Created — Share these credentials once:</h3>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ background: 'var(--color-surface2)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontFamily: 'monospace' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginBottom: 4 }}>EMAIL</div>
                                <div>{createdCreds.organizer?.email}</div>
                            </div>
                            <div style={{ background: 'var(--color-surface2)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontFamily: 'monospace' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginBottom: 4 }}>PASSWORD (shown once)</div>
                                <div style={{ color: 'var(--color-primary)' }}>{createdCreds.credentials?.password}</div>
                            </div>
                        </div>
                        <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => { setCreatedCreds(null); setShowCreate(false); }}>Dismiss</button>
                    </div>
                )}

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                    <div className="stat-card"><div className="stat-value">{organizers.length}</div><div className="stat-label">Total</div></div>
                    <div className="stat-card"><div className="stat-value">{organizers.filter(o => o.isActive).length}</div><div className="stat-label">Active</div></div>
                    <div className="stat-card"><div className="stat-value">{organizers.filter(o => !o.isActive).length}</div><div className="stat-label">Disabled</div></div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="loading-center"><div className="spinner" /></div>
                ) : organizers.length === 0 ? (
                    <div className="empty-state"><div className="empty-state-icon"></div><p>No organizers yet. Create one above.</p></div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Login Email</th>
                                    <th>Contact Email</th>
                                    <th>Category</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {organizers.map(org => (
                                    <tr key={org._id}>
                                        <td style={{ fontWeight: 600 }}>{org.organizerName}</td>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{org.email}</td>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{org.contactEmail || '—'}</td>
                                        <td><span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>{org.category || '—'}</span></td>
                                        <td><span className={`badge ${org.isActive ? 'badge-primary' : 'badge-danger'}`}>{org.isActive ? 'Active' : 'Disabled'}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className={`btn btn-sm ${org.isActive ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleStatus(org)} title={org.isActive ? 'Disable' : 'Enable'}>
                                                    {org.isActive ? <FiToggleRight size={14} /> : <FiToggleLeft size={14} />} {org.isActive ? 'Disable' : 'Enable'}
                                                </button>
                                                <button
                                                    className={`btn btn-sm ${confirmDeleteId === org._id ? 'btn-primary' : 'btn-danger'}`}
                                                    onClick={(e) => { e.stopPropagation(); deleteOrg(org._id); }}
                                                    title="Delete"
                                                    style={{ minWidth: confirmDeleteId === org._id ? '90px' : 'auto' }}
                                                >
                                                    {confirmDeleteId === org._id ? 'Confirm?' : <FiTrash2 size={14} style={{ pointerEvents: 'none' }} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageClubs;
