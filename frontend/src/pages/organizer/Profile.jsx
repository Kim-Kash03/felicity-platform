import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { FiEdit3, FiSave, FiLink, FiLock, FiSend } from 'react-icons/fi';

const OrganizerProfile = () => {
    const { user, updateUser } = useAuth();
    const [form, setForm] = useState({ organizerName: '', category: '', description: '', contactEmail: '', discordWebhook: '' });
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
    const [pwTab, setPwTab] = useState(false);
    const [pwSaving, setPwSaving] = useState(false);
    const [resetRequested, setResetRequested] = useState(false);
    const [webhookTesting, setWebhookTesting] = useState(false);

    useEffect(() => {
        if (user) setForm({
            organizerName: user.organizerName || '',
            category: user.category || '',
            description: user.description || '',
            contactEmail: user.contactEmail || '',
            discordWebhook: user.discordWebhook || '',
        });
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data } = await axios.put('/organizers/profile/me', form);
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
        if (pwForm.newPassword.length < 6) return toast.error('Min. 6 characters');
        setPwSaving(true);
        try {
            await axios.put('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
            toast.success('Password updated!');
            setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
            setPwTab(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed');
        } finally { setPwSaving(false); }
    };

    const handleResetRequest = async () => {
        try {
            await axios.post('/organizers/password-reset-request');
            toast.success('Reset request sent to admin');
            setResetRequested(true);
        } catch (err) { toast.error('Failed to send request'); }
    };

    const testWebhook = async () => {
        setWebhookTesting(true);
        try {
            await axios.post('/organizers/discord-webhook-test', { webhookUrl: form.discordWebhook });
            toast.success('Test message sent to Discord!');
        } catch (err) { toast.error('Webhook test failed – check the URL'); }
        finally { setWebhookTesting(false); }
    };

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: 700 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1>Organizer Profile</h1>
                        <p className="text-muted" style={{ fontSize: '0.875rem' }}>Manage your club's public information</p>
                    </div>
                    {!editing
                        ? <button className="btn btn-secondary" onClick={() => setEditing(true)}><FiEdit3 /> Edit Profile</button>
                        : <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : <><FiSave /> Save</>}</button>
                        </div>
                    }
                </div>

                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="avatar avatar-lg" style={{ fontSize: '1.6rem' }}>{form.organizerName?.slice(0, 1) || '?'}</div>
                        <div>
                            <h3 style={{ margin: 0 }}>{form.organizerName}</h3>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{user?.email}</div>
                            <span className="badge badge-purple" style={{ marginTop: '0.3rem' }}>Organizer</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Club / Organizer Name</label>
                            <input className="form-input" value={form.organizerName} onChange={e => setForm({ ...form, organizerName: e.target.value })} disabled={!editing} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Category</label>
                            <input className="form-input" placeholder="e.g. Tech, Cultural, Sports" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} disabled={!editing} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea className="form-textarea" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} disabled={!editing} placeholder="Tell participants about your club..." />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Contact Email</label>
                            <input type="email" className="form-input" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} disabled={!editing} placeholder="club@example.com" />
                        </div>
                    </div>
                </div>

                {/* Discord Webhook */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}><FiLink /> Discord Webhook</h3>
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                        <label className="form-label">Webhook URL</label>
                        <input className="form-input" placeholder="https://discord.com/api/webhooks/..." value={form.discordWebhook} onChange={e => setForm({ ...form, discordWebhook: e.target.value })} disabled={!editing} />
                    </div>
                    {form.discordWebhook && (
                        <button className="btn btn-secondary btn-sm" onClick={testWebhook} disabled={webhookTesting}>
                            <FiSend /> {webhookTesting ? 'Sending...' : 'Test Webhook'}
                        </button>
                    )}
                </div>

                {/* Security */}
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}><FiLock /> Security & Password</h3>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setPwTab(!pwTab)}>Change Password</button>
                        {!resetRequested && (
                            <button className="btn btn-ghost btn-sm" onClick={handleResetRequest}>Request Admin Reset</button>
                        )}
                        {resetRequested && <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center' }}>Reset requested ✓</span>}
                    </div>

                    {pwTab && (
                        <form onSubmit={handlePwChange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.25rem' }}>
                            <div className="form-group">
                                <label className="form-label">Current Password</label>
                                <input type="password" className="form-input" value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">New Password</label>
                                <input type="password" className="form-input" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Confirm New Password</label>
                                <input type="password" className="form-input" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} />
                            </div>
                            <button type="submit" className="btn btn-primary btn-sm" disabled={pwSaving} style={{ alignSelf: 'flex-start' }}>
                                {pwSaving ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrganizerProfile;
