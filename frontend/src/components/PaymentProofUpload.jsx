import { useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiUpload, FiImage, FiCheckCircle } from 'react-icons/fi';

const PaymentProofUpload = ({ registrationId, onSuccess }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;

        // Basic validation
        if (selected.size > 5000000) {
            toast.error('File size must be less than 5MB');
            return;
        }

        setFile(selected);
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result);
        };
        reader.readAsDataURL(selected);
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            // 1. Upload the image to get the URL
            const uploadRes = await axios.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // 2. Submit the URL to the registration
            const baseUrl = axios.defaults.baseURL ? axios.defaults.baseURL.replace(/\/api\/?$/, '') : 'http://localhost:5000';
            const fullUrl = `${baseUrl}${uploadRes.data.url}`;

            await axios.put(`/registrations/${registrationId}/payment-proof`, {
                paymentProofUrl: fullUrl
            });

            toast.success('Payment proof submitted successfully!');
            if (onSuccess) onSuccess();
            setFile(null);
            setPreview('');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit payment proof');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ padding: '1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FiUpload /> Upload Payment Proof
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Please upload a screenshot of your successful transaction to complete your registration or order.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {preview ? (
                    <div style={{ position: 'relative', width: '100%', maxWidth: '300px', alignSelf: 'center' }}>
                        <img
                            src={preview}
                            alt="Payment Proof Preview"
                            style={{ width: '100%', height: 'auto', borderRadius: 'var(--radius-sm)', border: '2px solid var(--color-border)' }}
                        />
                        <button
                            className="btn btn-ghost btn-sm"
                            style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white' }}
                            onClick={() => { setFile(null); setPreview(''); }}
                        >
                            Change
                        </button>
                    </div>
                ) : (
                    <div
                        style={{ border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-md)', padding: '2rem', textAlign: 'center', cursor: 'pointer' }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <FiImage size={32} style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }} />
                        <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>Click to select image</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '0.25rem' }}>JPG, PNG or WEBP (Max 5MB)</div>
                    </div>
                )}

                <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />

                {file && (
                    <button
                        className="btn btn-primary"
                        onClick={handleUpload}
                        disabled={uploading}
                        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                    >
                        {uploading ? 'Uploading...' : <><FiCheckCircle /> Submit Proof</>}
                    </button>
                )}
            </div>
        </div>
    );
};

export default PaymentProofUpload;
