import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { FiSend, FiArrowLeft, FiSmile, FiUser, FiPaperclip, FiFile, FiExternalLink, FiDownload } from 'react-icons/fi';


const TeamChatRoom = () => {
    const { id: teamId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [team, setTeam] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState(null);
    const [onlineMembers, setOnlineMembers] = useState(new Set());
    const [typingUsers, setTypingUsers] = useState(new Map()); // userId -> userName
    const [uploadingFile, setUploadingFile] = useState(false);
    const typingTimeoutRef = useRef(null);


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

        socketInstance.emit('join_team', teamId);

        socketInstance.on('receive_message', (message) => {
            setMessages((prev) => {
                if (prev.find(m => m._id === message._id)) return prev;
                return [...prev, message];
            });
        });

        socketInstance.on('initial_online_list', (list) => {
            setOnlineMembers(new Set(list));
        });

        socketInstance.on('user_online', (userId) => {
            setOnlineMembers((prev) => new Set([...prev, userId]));
        });

        socketInstance.on('user_offline', (userId) => {
            setOnlineMembers((prev) => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        });

        socketInstance.on('user_typing', ({ userId, userName }) => {
            setTypingUsers((prev) => new Map(prev).set(userId, userName));
        });

        socketInstance.on('user_stop_typing', ({ userId }) => {
            setTypingUsers((prev) => {
                const next = new Map(prev);
                next.delete(userId);
                return next;
            });
        });

        socketInstance.on('message_reacted', ({ messageId, reactions }) => {
            setMessages((prev) => prev.map(m =>
                m._id === messageId ? { ...m, reactions } : m
            ));
        });

        // Join personal room to track online status across the app
        socketInstance.emit('join_personal', user?.id || user?._id);

        return () => {
            socketInstance.disconnect();
        };
    }, [teamId, user]);

    useEffect(() => {
        const fetchChatData = async () => {
            try {
                const msgRes = await axios.get(`/teams/${teamId}/messages`);
                setMessages(msgRes.data);

                // Fetch user's teams to find the current team info
                const teamsRes = await axios.get('/teams/my');
                const currentTeam = teamsRes.data.find(t => t._id === teamId);

                if (!currentTeam) {
                    toast.error("Team not found or unauthorized");
                    navigate('/dashboard');
                    return;
                }

                if (currentTeam.status !== 'complete') {
                    toast.error("Chat is only unlocked when the team is complete!");
                    navigate('/dashboard');
                    return;
                }

                setTeam(currentTeam);
            } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to load chat');
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchChatData();
    }, [teamId, navigate]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket) return;

        const myId = user?.id || user?._id;
        socket.emit('send_message', {
            teamId,
            sender: myId,
            content: newMessage
        });

        setNewMessage('');
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        if (!socket) return;

        const myId = user?.id || user?._id;
        const myName = user?.firstName;

        socket.emit('typing_start', { teamId, userId: myId, userName: myName });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing_stop', { teamId, userId: myId });
        }, 2000);
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

            const myId = user?.id || user?._id;
            socket.emit('send_message', {
                teamId,
                sender: myId,
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
        const myId = user?.id || user?._id;
        socket.emit('react_message', {
            messageId,
            teamId,
            user: myId,
            emoji
        });
    };

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;
    if (!team) return null;

    return (
        <div className="page" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden', padding: 0 }}>
            <div style={{ display: 'flex', height: '100%', background: 'var(--color-background)' }}>
                {/* Left Sidebar - Team Members */}
                <div style={{
                    width: '300px',
                    borderRight: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#FF1493', color: '#fff' }}>
                        <button className="btn btn-ghost btn-sm btn-circle" style={{ color: '#fff' }} onClick={() => navigate(-1)}>
                            <FiArrowLeft size={20} />
                        </button>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {team.name}
                        </h2>
                    </div>

                    <div style={{ padding: '1.25rem 1rem', flex: 1, overflowY: 'auto' }}>
                        <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-dim)', marginBottom: '1rem', letterSpacing: '0.05em', fontWeight: 600 }}>
                            Members ({team.members.length}/{team.maxSize})
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {team.members.map(member => {
                                const myId = user?.id || user?._id;
                                return (
                                    <div key={member.user._id} onClick={() => { if (member.user._id !== myId) navigate(`/chat/${member.user._id}`); }} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: member.user._id !== myId ? 'pointer' : 'default', padding: '0.5rem', borderRadius: '0.5rem', transition: 'background 0.2s' }}>
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #FF69B4, #FF1493)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                                            fontWeight: 'bold', fontSize: '1rem', flexShrink: 0
                                        }}>
                                            {member.user.firstName?.charAt(0) || 'U'}
                                        </div>
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: 'var(--color-text)' }}>
                                                {member.user.firstName} {member.user.lastName}
                                                {member.user._id === (user?.id || user?._id) && ' (You)'}
                                            </div>
                                            {team.leaderId._id === member.user._id && (
                                                <div style={{ fontSize: '0.7rem', color: '#FF1493', fontWeight: 600 }}>Leader</div>
                                            )}
                                        </div>
                                        <div style={{
                                            width: 10, height: 10, borderRadius: '50%',
                                            background: onlineMembers.has(member.user._id) ? '#FF1493' : 'var(--color-text-dim)',
                                            border: '2px solid var(--color-surface)',
                                            boxShadow: onlineMembers.has(member.user._id) ? '0 0 10px rgba(255, 20, 147, 0.5)' : 'none'
                                        }} title={onlineMembers.has(member.user._id) ? 'Online' : 'Offline'} />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Main Chat Area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-background)', position: 'relative' }}>
                    {/* Header */}
                    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-light)', display: 'flex', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                            Event: <span style={{ color: 'var(--color-text)' }}>{team.eventId?.name || 'Unknown'}</span>
                        </div>
                    </div>

                    {/* Messages Container */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', scrollBehavior: 'smooth' }}>
                        {messages.length === 0 ? (
                            <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--color-text-dim)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ fontSize: '3rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}></div>
                                <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Say hello to your team!</p>
                            </div>
                        ) : (
                            messages.map(msg => {
                                const myId = user?.id || user?._id;
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
                                            {!isMe && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginLeft: '0.2rem', marginBottom: '0.3rem', fontWeight: 500 }}>{msg.sender.firstName}</span>}
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
                                    onChange={handleTyping}
                                    placeholder="Type a message..."
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
        </div>
    );
};

export default TeamChatRoom;
