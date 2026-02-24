import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiCopy, FiCheck, FiX, FiCheckCircle, FiMessageSquare } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const TeamManagement = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [joinCode, setJoinCode] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');

    const fetchTeams = () => {
        setLoading(true);
        axios.get('/teams/my')
            .then(res => setTeams(res.data))
            .catch(err => toast.error(err.response?.data?.message || 'Failed to fetch teams'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchTeams();
    }, []);

    const handleJoin = async (e) => {
        e.preventDefault();
        if (!joinCode) return;
        try {
            await axios.post('/teams/join', { code: joinCode.trim().toUpperCase() });
            toast.success('Joined team successfully!');
            setJoinCode('');
            fetchTeams();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to join team');
        }
    };

    const handleRespond = async (teamId, status) => {
        try {
            await axios.put(`/teams/${teamId}/respond`, { status });
            toast.success(`Invite ${status}`);
            fetchTeams();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to respond to invite');
        }
    };

    const handleInvite = async (e, teamId) => {
        e.preventDefault();
        if (!inviteEmail) return;
        try {
            await axios.post(`/teams/${teamId}/invite`, { email: inviteEmail.trim() });
            toast.success('Invite sent successfully!');
            setInviteEmail('');
            fetchTeams();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to invite user');
        }
    };

    const handleLeaveTeam = async (teamId) => {
        if (!window.confirm('Are you sure you want to leave this team?')) return;
        try {
            await axios.delete(`/teams/${teamId}/leave`);
            toast.success('Successfully left the team');
            fetchTeams();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to leave team');
        }
    };

    const handleDeleteTeam = async (teamId) => {
        console.log("Delete Team button clicked for team:", teamId);
        if (!window.confirm('Are you sure you want to delete this team? All members will be removed.')) {
            console.log("User cancelled deletion");
            return;
        }
        try {
            console.log("Sending DELETE request to /teams/" + teamId);
            const res = await axios.delete(`/teams/${teamId}`);
            console.log("Delete response:", res.data);
            toast.success('Team deleted successfully');
            fetchTeams();
        } catch (err) {
            console.error("Delete team error:", err);
            toast.error(err.response?.data?.message || 'Failed to delete team');
        }
    };

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;

    return (
        <div>
            {/* Join Team Section */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Join a Team</h3>
                <form onSubmit={handleJoin} style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Enter 8-character Invite Code"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
                        maxLength={8}
                    />
                    <button type="submit" className="btn btn-primary" disabled={!joinCode}>Join Event Team</button>
                </form>
            </div>

            {teams.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><FiUsers /></div>
                    <p>You are not in any teams yet.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {teams.map(team => (
                        <div key={team._id} className="card" style={{
                            borderLeft: `4px solid ${team.status === 'complete' ? 'var(--color-primary)' : 'var(--color-primary-light)'}`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        {team.name}
                                        {team.status === 'complete' && <FiCheckCircle style={{ color: 'var(--color-primary)' }} title="Registration Complete" />}
                                    </h3>
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                        Event: <strong>{team.eventId?.name}</strong> | Leader: {team.leaderId?.firstName} {team.leaderId?.lastName}
                                    </p>

                                    {team.myStatus === 'accepted' && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            {(user?.id || user?._id) === (team.leaderId?._id || team.leaderId) ? (
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTeam(team._id)}>
                                                    Delete Team
                                                </button>
                                            ) : (
                                                <button className="btn btn-danger btn-sm" onClick={() => handleLeaveTeam(team._id)}>
                                                    Leave Team
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {team.status === 'complete' && team.myStatus === 'accepted' && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <button
                                                className="btn btn-sm"
                                                onClick={() => navigate(`/team/${team._id}/chat`)}
                                                style={{ background: '#FF1493', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                            >
                                                <FiMessageSquare /> Team Chat
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Size</span>
                                    <strong>{team.members.filter(m => m.status === 'accepted').length} / {team.maxSize}</strong>
                                </div>
                            </div>

                            {team.myStatus === 'pending' && (
                                <div className="alert alert-warning" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>You have been invited to join this team.</span>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn btn-success btn-sm" onClick={() => handleRespond(team._id, 'accepted')}><FiCheck /> Accept</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleRespond(team._id, 'rejected')}><FiX /> Reject</button>
                                    </div>
                                </div>
                            )}

                            {team.status !== 'complete' && team.myStatus === 'accepted' && (
                                <div style={{ background: 'var(--color-surface2)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ color: 'var(--color-text-muted)' }}>Invite Code:</span>
                                            <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '2px', color: 'var(--color-primary-light)' }}>
                                                {team.code}
                                            </span>
                                            <button className="btn btn-ghost btn-xs" onClick={() => { navigator.clipboard.writeText(team.code); toast.success('Copied!'); }}>
                                                <FiCopy /> Copy
                                            </button>
                                        </div>
                                    </div>

                                    <form onSubmit={(e) => handleInvite(e, team._id)} style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="email"
                                            placeholder="Invite member by email..."
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
                                            disabled={(user?.id || user?._id) !== (team.leaderId?._id || team.leaderId)}
                                        />
                                        <button type="submit" className="btn btn-primary btn-sm" disabled={!inviteEmail}>Send Invite</button>
                                    </form>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '0.5rem' }}>
                                        * Only the team leader can send email invites. Anyone can join using the code.
                                    </p>
                                </div>
                            )}

                            {/* Members List */}
                            <div>
                                <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Members Status</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {team.members.map(m => (
                                        <div key={m.user._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div className="avatar" style={{ width: 28, height: 28, fontSize: '0.8rem' }}>
                                                    {m.user.firstName?.charAt(0) || '?'}
                                                </div>
                                                <span style={{ fontSize: '0.9rem' }}>{m.user.firstName} {m.user.lastName}</span>
                                                {m.user._id === (team.leaderId?._id || team.leaderId) && <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Leader</span>}
                                            </div>
                                            <span style={{ fontSize: '0.8rem' }} className={
                                                m.status === 'accepted' ? 'text-primary' :
                                                    m.status === 'rejected' ? 'text-danger' : 'text-warning'
                                            }>
                                                {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TeamManagement;
