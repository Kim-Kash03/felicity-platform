import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { FiSend, FiArrowLeft, FiSmile, FiPaperclip, FiFile, FiExternalLink, FiDownload } from 'react-icons/fi';

const DirectChat = () => {
    const { userId } = useParams();
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();

    const [otherUser, setOtherUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        // Initialize socket
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const socketUrl = apiUrl.replace(/\/api$/, '') || window.location.origin;
        const socketInstance = io(socketUrl, {
            withCredentials: true
        });

        setSocket(socketInstance);

        // Join personal room for messages
        const myId = currentUser?.id || currentUser?._id;
        socketInstance.emit('join_personal', myId);

        socketInstance.on('receive_direct_message', (message) => {
            const myId = currentUser?.id || currentUser?._id;
            if (
                (message.sender._id === myId && message.receiver._id === userId) ||
                (message.sender._id === userId && message.receiver._id === myId)
            ) {
                setMessages((prev) => {
                    if (prev.find(m => m._id === message._id)) return prev;
                    return [...prev, message];
                });
            }
        });

        socketInstance.on('initial_online_list', (list) => {
            if (list.includes(userId)) setIsOnline(true);
        });

        socketInstance.on('user_online', (uid) => {
            if (uid === userId) setIsOnline(true);
        });

        socketInstance.on('user_offline', (uid) => {
            if (uid === userId) setIsOnline(false);
        });

        socketInstance.on('direct_message_reacted', ({ messageId, reactions }) => {
            setMessages((prev) => prev.map(m =>
                m._id === messageId ? { ...m, reactions } : m
            ));
        });

        return () => {
            socketInstance.disconnect();
        };
    }, [currentUser, userId]);

    useEffect(() => {
        const fetchChatData = async () => {
            try {
                const res = await axios.get(`/messages/${userId}`);
                setOtherUser(res.data.user);
                setMessages(res.data.messages);
            } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to load chat');
                navigate(-1);
            } finally {
                setLoading(false);
            }
        };
        fetchChatData();
    }, [userId, navigate]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket) return;

        const myId = currentUser?.id || currentUser?._id;
        socket.emit('send_direct_message', {
            sender: myId,
            receiver: userId,
            content: newMessage
        });

        setNewMessage('');
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("File size must be less than 5MB");
            return;
        }

        setUploadingFile(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const myId = currentUser?.id || currentUser?._id;
            socket.emit('send_direct_message', {
                sender: myId,
                receiver: userId,
                type: 'file',
                content: `Sent a file: ${file.name}`,
                fileName: file.name,
                fileUrl: res.data.url,
                fileType: file.type
            });
        } catch (err) {
            toast.error("Failed to upload file");
        } finally {
            setUploadingFile(false);
        }
    };

    const renderMessageContent = (msg) => {
        if (msg.type === 'file') {
            const isImage = msg.fileType?.startsWith('image/');
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {isImage ? (
                        <img src={msg.fileUrl} alt={msg.fileName} style={{ maxWidth: '100%', borderRadius: '0.5rem', cursor: 'pointer' }} onClick={() => window.open(msg.fileUrl, '_blank')} />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                            <FiFile size={20} />
                            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{msg.fileName}</div>
                        </div>
                    )}
                    <a href={msg.fileUrl} download={msg.fileName} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'inherit', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FiDownload size={12} /> Download
                    </a>
                </div>
            );
        }

        // Link detection
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = msg.content.split(urlRegex);
        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                return <a key={i} href={part} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{part} <FiExternalLink size={12} /></a>;
            }
            return part;
        });
    };

    const handleReaction = (messageId, emoji) => {
        if (!socket) return;
        const myId = currentUser?.id || currentUser?._id;
        socket.emit('react_direct_message', {
            messageId,
            receiver: userId,
            sender: myId,
            user: myId,
            emoji
        });
    };

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;
    if (!otherUser) return null;

    return (
        <div className="page" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden', padding: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-background)', position: 'relative' }}>
                {/* Header */}
                <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: '#FF1493', color: '#fff', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn btn-ghost btn-sm btn-circle" style={{ color: '#fff' }} onClick={() => navigate(-1)}>
                        <FiArrowLeft size={20} />
                    </button>
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 'bold', fontSize: '1.1rem', flexShrink: 0
                        }}>
                            {otherUser.firstName?.charAt(0) || 'U'}
                        </div>
                        <div style={{
                            position: 'absolute', bottom: 0, right: 0,
                            width: 12, height: 12, borderRadius: '50%',
                            background: isOnline ? '#FF1493' : '#FBCFE8',
                            border: '2px solid #FF1493'
                        }} title={isOnline ? 'Online' : 'Offline'} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                            {otherUser.firstName} {otherUser.lastName}
                        </h2>
                        <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                            {isOnline ? 'Active now' : 'Offline'}
                        </div>
                    </div>
                </div>

                {/* Messages Container */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', scrollBehavior: 'smooth' }}>
                    {messages.length === 0 ? (
                        <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--color-text-dim)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Start a conversation with {otherUser.firstName}!</p>
                        </div>
                    ) : (
                        messages.map(msg => {
                            const myId = currentUser?.id || currentUser?._id;
                            const isMe = msg.sender._id === myId;
                            return (
                                <div key={msg._id} style={{
                                    display: 'flex',
                                    flexDirection: isMe ? 'row-reverse' : 'row',
                                    alignItems: 'flex-end',
                                    gap: '0.5rem',
                                    marginBottom: '0.5rem'
                                }}>
                                    {!isMe && (
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-dim)',
                                            fontSize: '0.8rem', flexShrink: 0
                                        }} title={msg.sender.firstName}>
                                            {msg.sender.firstName?.charAt(0) || 'U'}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                                        <div style={{
                                            padding: '0.75rem 1rem',
                                            borderRadius: '1.25rem',
                                            borderBottomRightRadius: isMe ? '0.25rem' : '1.25rem',
                                            borderBottomLeftRadius: isMe ? '1.25rem' : '0.25rem',
                                            background: isMe ? '#FF1493' : 'var(--color-surface)',
                                            color: isMe ? '#fff' : 'var(--color-text)',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                            fontSize: '0.95rem',
                                            lineHeight: 1.5,
                                            position: 'relative',
                                            wordBreak: 'break-word',
                                            border: isMe ? 'none' : '1px solid var(--color-border)'
                                        }}>
                                            {renderMessageContent(msg)}
                                            {/* Reactions Display */}
                                            {msg.reactions && msg.reactions.length > 0 && (
                                                <div style={{
                                                    position: 'absolute', bottom: '-14px', right: isMe ? 'auto' : '-10px', left: isMe ? '-10px' : 'auto',
                                                    display: 'flex', gap: '2px', background: 'var(--color-surface)', borderRadius: '1rem', padding: '2px 6px',
                                                    border: '1px solid var(--color-border)', fontSize: '0.8rem', zIndex: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                }}>
                                                    {[...new Set(msg.reactions.map(r => r.emoji))].map(emoji => {
                                                        const count = msg.reactions.filter(r => r.emoji === emoji).length;
                                                        return (
                                                            <span key={emoji} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }} onClick={() => handleReaction(msg._id, emoji)}>
                                                                {emoji} {count > 1 && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>{count}</span>}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.3rem', visibility: 'visible', opacity: 0.7 }}>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                                {format(new Date(msg.createdAt), 'h:mm a')}
                                            </span>
                                            <div style={{ cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }} title="Quick React ">
                                                <span onClick={() => handleReaction(msg._id, '❤️')}>❤️</span>
                                                <span onClick={() => handleReaction(msg._id, '👍')}>👍</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div style={{ padding: '1rem 1.5rem', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', boxShadow: '0 -4px 12px rgba(0,0,0,0.02)' }}>
                    <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <label className="btn btn-ghost btn-circle btn-sm" style={{ cursor: 'pointer', flexShrink: 0 }}>
                            {uploadingFile ? <div className="spinner" style={{ width: 18, height: 18 }} /> : <FiPaperclip size={20} />}
                            <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploadingFile} />
                        </label>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <input
                                type="text"
                                className="input focus:ring-2 focus:ring-[#FF1493] focus:border-[#FF1493]"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Message..."
                                style={{
                                    width: '100%',
                                    background: 'var(--color-background)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '2rem',
                                    padding: '0.75rem 1.5rem',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    transition: 'all 0.2s'
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn"
                            style={{
                                borderRadius: '50%',
                                width: '46px',
                                height: '46px',
                                padding: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: newMessage.trim() ? '#FF1493' : 'var(--color-surface-light)',
                                color: newMessage.trim() ? '#fff' : 'var(--color-text-muted)',
                                border: newMessage.trim() ? 'none' : '1px solid var(--color-border)',
                                cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                                boxShadow: newMessage.trim() ? '0 4px 10px rgba(255, 20, 147, 0.3)' : 'none',
                                transition: 'all 0.2s'
                            }}
                            disabled={!newMessage.trim()}
                        >
                            <FiSend size={18} style={{ marginLeft: '-2px' }} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default DirectChat;
