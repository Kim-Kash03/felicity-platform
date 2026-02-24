import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { FiSkipForward, FiCheck, FiArrowRight } from 'react-icons/fi';

const INTERESTS = [
    'Technology', 'Music', 'Sports', 'Gaming', 'Arts & Craft',
    'Dance', 'Coding', 'Robotics', 'Design', 'Finance',
    'Literature', 'Photography', 'Film', 'Debate', 'Science',
];

const Onboarding = () => {
    const [step, setStep] = useState(1);
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [organizers, setOrganizers] = useState([]);
    const [followedOrgs, setFollowedOrgs] = useState([]);
    const [loading, setLoading] = useState(false);
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        axios.get('/organizers').then(r => setOrganizers(r.data)).catch(() => { });
    }, []);

    const toggleInterest = (item) => {
        setSelectedInterests(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    };
    const toggleOrg = (id) => {
        setFollowedOrgs(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleComplete = async () => {
        setLoading(true);
        try {
            const { data } = await axios.put('/participants/onboarding', {
                interests: selectedInterests,
                followedOrganizers: followedOrgs,
            });
            updateUser({ onboardingComplete: true, interests: selectedInterests, followedOrganizers: followedOrgs });
            toast.success('Setup complete! Welcome to Felicity');
            navigate('/dashboard');
        } catch (err) {
            toast.error('Failed to save preferences');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        updateUser({ onboardingComplete: true });
        navigate('/dashboard');
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '1.5rem' }}>
            <div style={{ width: '100%', maxWidth: 600 }} className="animate-slide-up">
                {/* Progress */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                    {[1, 2].map(s => (
                        <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? 'var(--gradient-primary)' : 'var(--color-border)', transition: 'var(--transition-slow)' }} />
                    ))}
                </div>

                <div className="card">
                    {step === 1 && (
                        <>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Welcome, {user?.firstName}!</div>
                                <h2 style={{ margin: 0 }}>What are you into?</h2>
                                <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Select your interests to get event recommendations</p>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', marginBottom: '2rem' }}>
                                {INTERESTS.map(item => (
                                    <button key={item} onClick={() => toggleInterest(item)}
                                        style={{
                                            padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', border: '1.5px solid',
                                            borderColor: selectedInterests.includes(item) ? 'var(--color-primary)' : 'var(--color-border)',
                                            background: selectedInterests.includes(item) ? 'rgba(108,99,255,0.2)' : 'var(--color-surface2)',
                                            color: selectedInterests.includes(item) ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                                            cursor: 'pointer', font: 'inherit', fontSize: '0.875rem', fontWeight: 500,
                                            transition: 'var(--transition)',
                                        }}>
                                        {selectedInterests.includes(item) && <FiCheck style={{ marginRight: 4 }} />}
                                        {item}
                                    </button>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost" onClick={handleSkip}><FiSkipForward /> Skip setup</button>
                                <button className="btn btn-primary" onClick={() => setStep(2)}>Next <FiArrowRight /></button>
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h2 style={{ margin: 0 }}>Follow Clubs & Organizers</h2>
                                <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Stay updated on events from your favourite clubs</p>
                            </div>
                            {organizers.length === 0 ? (
                                <div className="empty-state"><div className="empty-state-icon"></div><p>No clubs yet — check back soon!</p></div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 320, overflowY: 'auto', marginBottom: '1.5rem' }}>
                                    {organizers.map(org => (
                                        <div key={org._id} onClick={() => toggleOrg(org._id)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '1rem',
                                                padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)',
                                                border: '1px solid',
                                                borderColor: followedOrgs.includes(org._id) ? 'var(--color-primary)' : 'var(--color-border)',
                                                background: followedOrgs.includes(org._id) ? 'rgba(108,99,255,0.1)' : 'var(--color-surface2)',
                                                cursor: 'pointer', transition: 'var(--transition)',
                                            }}>
                                            <div className="avatar" style={{ width: 40, height: 40, fontSize: '1rem' }}>
                                                {org.organizerName.slice(0, 1)}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{org.organizerName}</div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{org.category}</div>
                                            </div>
                                            {followedOrgs.includes(org._id) && <FiCheck style={{ color: 'var(--color-primary)' }} />}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
                                <button className="btn btn-ghost" onClick={handleSkip}><FiSkipForward /> Skip</button>
                                <button className="btn btn-primary" onClick={handleComplete} disabled={loading}>
                                    {loading ? 'Saving...' : 'Get Started '}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
