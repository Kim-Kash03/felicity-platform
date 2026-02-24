import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { FiUser, FiMail, FiPhone, FiBriefcase, FiEdit3, FiSave, FiLock } from 'react-icons/fi';

const INTERESTS = ['Technology', 'Music', 'Sports', 'Gaming', 'Arts & Craft', 'Dance', 'Coding', 'Robotics', 'Design', 'Finance', 'Literature', 'Photography', 'Film', 'Debate', 'Science'];

const ParticipantProfile = () => {
    const { user, updateUser } = useAuth();
    const [form, setForm] = useState({ firstName: '', lastName: '', contactNumber: '', college: '', interests: [] });
    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pwTab, setPwTab] = useState(false);
    const [pwSaving, setPwSaving] = useState(false);

    useEffect(() => {
        if (user) setForm({ firstName: user.firstName || '', lastName: user.lastName || '', contactNumber: user.contactNumber || '', college: user.college || '', interests: user.interests || [] });
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data } = await axios.put('/participants/profile', form);
            updateUser(data);
            toast.success('Profile updated!');
            setEditing(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Update failed');
        } finally { setSaving(false); }
    };

    const handlePwChange = async (e) => {
        e.preventDefault();
        if (pwForm.newPassword !== pwForm.confirm) return toast.error('Passwords do not match');
        if (pwForm.newPassword.length < 6) return toast.error('Password must be at least 6 characters');
        setPwSaving(true);
        try {
            await axios.put('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
            toast.success('Password changed successfully!');
            setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Password change failed');
        } finally { setPwSaving(false); }
    };

    const toggleInterest = (item) => {
        if (!editing) return;
        setForm(prev => ({
            ...prev,
            interests: prev.interests.includes(item) ? prev.interests.filter(i => i !== item) : [...prev.interests, item]
        }));
    };

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: 700 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1>My Profile</h1>
                        <p className="text-muted" style={{ fontSize: '0.875rem' }}>Manage your account and preferences</p>
                    </div>
                    {!editing
                        ? <button className="btn btn-secondary" onClick={() => setEditing(true)}><FiEdit3 /> Edit Profile</button>
                        : <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : <><FiSave /> Save</>}</button>
                        </div>
                    }
                </div>

                {/* Non-editable info */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="avatar avatar-lg">{user?.firstName?.slice(0, 1) || '?'}</div>
                        <div>
                            <h3 style={{ margin: 0 }}>{user?.firstName} {user?.lastName}</h3>
                            <p className="text-muted" style={{ fontSize: '0.875rem', margin: '0.25rem 0 0' }}>{user?.email}</p>
                            <span className={`badge ${user?.participantType === 'iiit' ? 'badge-purple' : 'badge-cyan'}`} style={{ marginTop: '0.5rem' }}>
                                {user?.participantType === 'iiit' ? 'IIIT Student' : 'Non-IIIT'}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">First Name</label>
                            <input className="form-input" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} disabled={!editing} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Last Name</label>
                            <input className="form-input" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} disabled={!editing} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Contact Number</label>
                            <input className="form-input" value={form.contactNumber} onChange={e => setForm({ ...form, contactNumber: e.target.value })} disabled={!editing} placeholder="Your phone number" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">College / Organization</label>
                            <input className="form-input" value={form.college} onChange={e => setForm({ ...form, college: e.target.value })} disabled={!editing || user?.participantType === 'iiit'} />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Email Address <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>(non-editable)</span></label>
                            <input className="form-input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
                        </div>
                    </div>
                </div>

                {/* Interests */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Areas of Interest</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {INTERESTS.map(item => (
                            <button key={item} onClick={() => toggleInterest(item)}
                                style={{
                                    padding: '0.4rem 0.875rem', borderRadius: 'var(--radius-full)', border: '1.5px solid',
                                    borderColor: form.interests.includes(item) ? 'var(--color-primary)' : 'var(--color-border)',
                                    background: form.interests.includes(item) ? 'rgba(255,105,180,0.15)' : 'var(--color-surface2)',
                                    color: form.interests.includes(item) ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                    cursor: editing ? 'pointer' : 'default', font: 'inherit', fontSize: '0.8rem', fontWeight: 500,
                                    transition: 'var(--transition)', opacity: editing ? 1 : 0.8,
                                }}>
                                {item}
                            </button>
                        ))}
                    </div>
                    {!editing && <p style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', marginTop: '0.5rem' }}>Click Edit Profile to change interests</p>}
                </div>

                {/* Security */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0 }}>Security Settings</h3>
                        <button className="btn btn-secondary btn-sm" onClick={() => setPwTab(!pwTab)}><FiLock /> Change Password</button>
                    </div>
                    {pwTab && (
                        <form onSubmit={handlePwChange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Current Password</label>
                                <input type="password" className="form-input" placeholder="Enter current password" value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">New Password</label>
                                <input type="password" className="form-input" placeholder="Min. 6 characters" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Confirm New Password</label>
                                <input type="password" className="form-input" placeholder="Repeat new password" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={pwSaving} style={{ alignSelf: 'flex-start' }}>
                                {pwSaving ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ParticipantProfile;
