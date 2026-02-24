import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiArrowUp, FiArrowDown } from 'react-icons/fi';

const FIELD_TYPES = ['text', 'textarea', 'dropdown', 'checkbox', 'radio', 'file', 'number', 'date'];

const CreateEvent = () => {
    const [step, setStep] = useState(1); // 1=details, 2=form-builder, 3=review
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const [details, setDetails] = useState({
        name: '', description: '', type: 'normal', eligibility: 'all',
        registrationDeadline: '', startDate: '', endDate: '',
        registrationLimit: 0, registrationFee: 0, tags: '',
        isTeamEvent: false, teamSizeMin: 2, teamSizeMax: 4,
    });

    const [customForm, setCustomForm] = useState([]);
    const [variants, setVariants] = useState([{ size: '', color: '', stock: 0 }]);
    const [purchaseLimitPerParticipant, setPurchaseLimitPerParticipant] = useState(1);

    const addField = () => setCustomForm(prev => [...prev, { label: '', type: 'text', options: [], required: false }]);
    const removeField = (i) => setCustomForm(prev => prev.filter((_, idx) => idx !== i));
    const updateField = (i, key, val) => setCustomForm(prev => prev.map((f, idx) => idx === i ? { ...f, [key]: val } : f));
    const moveField = (i, dir) => {
        const arr = [...customForm];
        const j = i + dir;
        if (j < 0 || j >= arr.length) return;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        setCustomForm(arr);
    };

    const addVariant = () => setVariants(prev => [...prev, { size: '', color: '', stock: 0 }]);
    const updateVariant = (i, key, val) => setVariants(prev => prev.map((v, idx) => idx === i ? { ...v, [key]: val } : v));
    const removeVariant = (i) => setVariants(prev => prev.filter((_, idx) => idx !== i));

    const handlePublish = async (status) => {
        if (!details.name || !details.description || !details.registrationDeadline || !details.startDate || !details.endDate)
            return toast.error('Please fill in all required fields');
        setSubmitting(true);
        try {
            const payload = {
                ...details,
                tags: details.tags.split(',').map(t => t.trim()).filter(Boolean),
                registrationLimit: parseInt(details.registrationLimit) || 0,
                registrationFee: parseFloat(details.registrationFee) || 0,
                customForm: details.type === 'normal' ? customForm.map((f, i) => ({
                    ...f,
                    order: i,
                    options: f.optionsRaw ? f.optionsRaw.split(',').map(o => o.trim()).filter(Boolean) : (f.options || [])
                })) : [],
                variants: details.type === 'merchandise' ? variants : [],
                purchaseLimitPerParticipant,
                totalStock: details.type === 'merchandise' ? variants.reduce((s, v) => s + parseInt(v.stock || 0), 0) : 0,
                isTeamEvent: details.isTeamEvent,
                teamSizeMin: parseInt(details.teamSizeMin) || 2,
                teamSizeMax: parseInt(details.teamSizeMax) || 4,
            };
            const { data: event } = await axios.post('/events', payload);

            if (status === 'published') {
                await axios.put(`/events/${event._id}`, { status: 'published' });
            }
            toast.success(status === 'published' ? 'Event published!' : 'Event saved as draft');
            navigate(`/organizer/events/${event._id}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create event');
        } finally { setSubmitting(false); }
    };

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: 720 }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                    {['Details', details.type === 'normal' ? 'Form Builder' : 'Variants', 'Review'].map((s, i) => (
                        <div key={s} style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ height: 4, background: i < step ? 'var(--gradient-primary)' : 'var(--color-border)', borderRadius: 2, marginBottom: '0.25rem', transition: 'all 0.3s' }} />
                            <span style={{ fontSize: '0.75rem', color: i < step ? 'var(--color-primary-light)' : 'var(--color-text-dim)' }}>Step {i + 1}: {s}</span>
                        </div>
                    ))}
                </div>

                <h2 style={{ marginBottom: '1.5rem' }}>Create New Event</h2>

                {/* Step 1: Event Details */}
                {step === 1 && (
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Event Name <span className="required">*</span></label>
                            <input className="form-input" placeholder="e.g. Web Dev Workshop" value={details.name} onChange={e => setDetails({ ...details, name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description <span className="required">*</span></label>
                            <textarea className="form-textarea" rows={4} placeholder="Describe your event..." value={details.description} onChange={e => setDetails({ ...details, description: e.target.value })} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Event Type</label>
                                <select className="form-select" value={details.type} onChange={e => setDetails({ ...details, type: e.target.value })}>
                                    <option value="normal">Normal Event</option>
                                    <option value="merchandise">Merchandise</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Eligibility</label>
                                <select className="form-select" value={details.eligibility} onChange={e => setDetails({ ...details, eligibility: e.target.value })}>
                                    <option value="all">Open to All</option>
                                    <option value="iiit">IIIT Only</option>
                                    <option value="non-iiit">Non-IIIT Only</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Registration Deadline <span className="required">*</span></label>
                                <input type="datetime-local" className="form-input" value={details.registrationDeadline} onChange={e => setDetails({ ...details, registrationDeadline: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Registration Fee (₹)</label>
                                <input type="number" className="form-input" min={0} value={details.registrationFee} onChange={e => setDetails({ ...details, registrationFee: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Start Date <span className="required">*</span></label>
                                <input type="datetime-local" className="form-input" value={details.startDate} onChange={e => setDetails({ ...details, startDate: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">End Date <span className="required">*</span></label>
                                <input type="datetime-local" className="form-input" value={details.endDate} onChange={e => setDetails({ ...details, endDate: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Registration Limit (0 = unlimited)</label>
                                <input type="number" className="form-input" min={0} value={details.registrationLimit} onChange={e => setDetails({ ...details, registrationLimit: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tags (comma-separated)</label>
                                <input className="form-input" placeholder="tech, coding, workshop" value={details.tags} onChange={e => setDetails({ ...details, tags: e.target.value })} />
                            </div>
                        </div>

                        {details.type === 'normal' && (
                            <div className="form-group" style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                                    <input type="checkbox" checked={details.isTeamEvent} onChange={e => setDetails(d => ({ ...d, isTeamEvent: e.target.checked }))} />
                                    This is a Team Event / Hackathon
                                </label>
                                {details.isTeamEvent && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">Min Team Size</label>
                                            <input type="number" className="form-input" min={1} max={50} value={details.teamSizeMin} onChange={e => setDetails({ ...details, teamSizeMin: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Max Team Size</label>
                                            <input type="number" className="form-input" min={1} max={50} value={details.teamSizeMax} onChange={e => setDetails({ ...details, teamSizeMax: e.target.value })} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {details.type === 'merchandise' && (
                            <div className="form-group">
                                <label className="form-label">Purchase Limit per Participant</label>
                                <input type="number" className="form-input" min={1} value={purchaseLimitPerParticipant} onChange={e => setPurchaseLimitPerParticipant(parseInt(e.target.value))} />
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button className="btn btn-primary" onClick={() => setStep(2)}>Next →</button>
                        </div>
                    </div>
                )}

                {/* Step 2: Form Builder or Variants */}
                {step === 2 && details.type === 'normal' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3>Custom Registration Form</h3>
                            <button className="btn btn-secondary btn-sm" onClick={addField}><FiPlus /> Add Field</button>
                        </div>
                        {customForm.length === 0 ? (
                            <div className="empty-state" style={{ padding: '2rem', marginBottom: '1rem' }}>
                                <div className="empty-state-icon"></div>
                                <p>No fields yet. Add fields or skip to create event with no custom form.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                                {customForm.map((field, i) => (
                                    <div key={i} className="card" style={{ padding: '1rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.75rem', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <input className="form-input" placeholder="Field Label" value={field.label} onChange={e => updateField(i, 'label', e.target.value)} style={{ flex: '1 1 150px' }} />
                                                <select className="form-select" value={field.type} onChange={e => updateField(i, 'type', e.target.value)} style={{ flex: '0 0 130px' }}>
                                                    {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                                                    <input type="checkbox" checked={field.required} onChange={e => updateField(i, 'required', e.target.checked)} /> Required
                                                </label>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => moveField(i, -1)} title="Move up"><FiArrowUp size={14} /></button>
                                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => moveField(i, 1)} title="Move down"><FiArrowDown size={14} /></button>
                                            </div>
                                            <button className="btn btn-danger btn-icon btn-sm" onClick={() => removeField(i)}><FiTrash2 size={14} /></button>
                                        </div>
                                        {['dropdown', 'radio', 'checkbox'].includes(field.type) && (
                                            <div style={{ marginTop: '0.5rem' }}>
                                                <input className="form-input" placeholder="Options: Apple, Banana, Cherry (Separate with commas)" style={{ fontSize: '0.8rem' }}
                                                    value={field.optionsRaw !== undefined ? field.optionsRaw : (field.options?.join(', ') || '')}
                                                    onChange={e => updateField(i, 'optionsRaw', e.target.value)} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
                            <button className="btn btn-primary" onClick={() => setStep(3)}>Next → Review</button>
                        </div>
                    </div>
                )}

                {step === 2 && details.type === 'merchandise' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3>Merchandise Variants</h3>
                            <button className="btn btn-secondary btn-sm" onClick={addVariant}><FiPlus /> Add Variant</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                            {variants.map((v, i) => (
                                <div key={i} className="card" style={{ padding: '0.875rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'center' }}>
                                    <input className="form-input" placeholder="Size (S/M/L/XL)" value={v.size} onChange={e => updateVariant(i, 'size', e.target.value)} />
                                    <input className="form-input" placeholder="Color" value={v.color} onChange={e => updateVariant(i, 'color', e.target.value)} />
                                    <input type="number" className="form-input" placeholder="Stock" min={0} value={v.stock} onChange={e => updateVariant(i, 'stock', parseInt(e.target.value) || 0)} />
                                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => removeVariant(i)}><FiTrash2 size={14} /></button>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
                            <button className="btn btn-primary" onClick={() => setStep(3)}>Next → Review</button>
                        </div>
                    </div>
                )}

                {/* Step 3: Review & Publish */}
                {step === 3 && (
                    <div>
                        <div className="card" style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem' }}>Event Summary</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {[['Name', details.name], ['Type', details.type], ['Eligibility', details.eligibility], ['Registration Deadline', details.registrationDeadline], ['Start Date', details.startDate], ['End Date', details.endDate], ['Fee', details.registrationFee > 0 ? `₹${details.registrationFee}` : 'Free'], ['Limit', details.registrationLimit || 'Unlimited'],].map(([k, v]) => (
                                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.375rem' }}>
                                        <span style={{ color: 'var(--color-text-muted)' }}>{k}</span>
                                        <span style={{ fontWeight: 500 }}>{v}</span>
                                    </div>
                                ))}
                                {details.type === 'normal' && <div style={{ fontSize: '0.875rem' }}><span style={{ color: 'var(--color-text-muted)' }}>Form Fields: </span>{customForm.length}</div>}
                                {details.type === 'merchandise' && <div style={{ fontSize: '0.875rem' }}><span style={{ color: 'var(--color-text-muted)' }}>Variants: </span>{variants.length} · Total Stock: {variants.reduce((s, v) => s + parseInt(v.stock || 0), 0)}</div>}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back</button>
                            <button className="btn btn-secondary" disabled={submitting} onClick={() => handlePublish('draft')}>
                                {submitting ? 'Saving...' : 'Save as Draft'}
                            </button>
                            <button className="btn btn-primary" disabled={submitting} onClick={() => handlePublish('published')}>
                                {submitting ? 'Publishing...' : 'Publish Event'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateEvent;
