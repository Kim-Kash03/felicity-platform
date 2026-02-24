const { Server } = require("socket.io");
const Message = require('../models/Message');
const DirectMessage = require('../models/DirectMessage');

let io;
const onlineUsers = new Map(); // userId -> Set(socketIds)

module.exports = {
    init: (httpServer, allowedOrigins) => {
        io = new Server(httpServer, {
            cors: {
                origin: allowedOrigins,
                credentials: true
            }
        });

        io.on('connection', (socket) => {
            console.log('Client connected to socket:', socket.id);
            let currentUserId = null;

            // Join personal room for direct messages
            socket.on('join_personal', (userId) => {
                currentUserId = userId;
                socket.join(`user_${userId}`);

                if (!onlineUsers.has(userId)) {
                    onlineUsers.set(userId, new Set());
                }
                onlineUsers.get(userId).add(socket.id);

                // Broadcast online status to all rooms
                io.emit('user_online', userId);
            });

            // Join a specific team chat room
            socket.on('join_team', (teamId) => {
                socket.join(`team_${teamId}`);

                // When joining, tell the client who else is online
                const onlineList = Array.from(onlineUsers.keys());
                socket.emit('initial_online_list', onlineList);
            });

            // Handle typing status
            socket.on('typing_start', (data) => {
                const { teamId, userId, userName } = data;
                socket.to(`team_${teamId}`).emit('user_typing', { userId, userName, teamId });
            });

            socket.on('typing_stop', (data) => {
                const { teamId, userId } = data;
                socket.to(`team_${teamId}`).emit('user_stop_typing', { userId, teamId });
            });

            // Handle incoming messages
            socket.on('send_message', async (data) => {
                try {
                    const { teamId, sender, content, type, fileName, fileUrl, fileType } = data;

                    const newMessage = new Message({
                        teamId,
                        sender,
                        content,
                        type: type || 'text',
                        fileName,
                        fileUrl,
                        fileType
                    });
                    await newMessage.save();

                    await newMessage.populate('sender', 'firstName lastName email');

                    io.to(`team_${teamId}`).emit('receive_message', newMessage);
                } catch (error) {
                    console.error('Socket message error:', error);
                    socket.emit('error', { message: 'Failed to send message.' });
                }
            });

            // Handle incoming direct messages
            socket.on('send_direct_message', async (data) => {
                try {
                    const { sender, receiver, content } = data;

                    const newMessage = new DirectMessage({ sender, receiver, content });
                    await newMessage.save();

                    await newMessage.populate('sender', 'firstName lastName email');
                    await newMessage.populate('receiver', 'firstName lastName email');

                    io.to(`user_${receiver}`).emit('receive_direct_message', newMessage);
                    io.to(`user_${sender}`).emit('receive_direct_message', newMessage);
                } catch (error) {
                    console.error('Socket direct message error:', error);
                    socket.emit('error', { message: 'Failed to send direct message.' });
                }
            });

            // Handle message reactions
            socket.on('react_message', async (data) => {
                try {
                    const { messageId, teamId, user, emoji } = data;

                    const message = await Message.findById(messageId);
                    if (!message) return;

                    const existingReactionIndex = message.reactions.findIndex(
                        r => r.user.toString() === user && r.emoji === emoji
                    );

                    if (existingReactionIndex > -1) {
                        message.reactions.splice(existingReactionIndex, 1);
                    } else {
                        message.reactions.push({ user, emoji });
                    }

                    await message.save();

                    io.to(`team_${teamId}`).emit('message_reacted', {
                        messageId,
                        reactions: message.reactions
                    });
                } catch (error) {
                    console.error('Socket reaction error:', error);
                }
            });

            // Handle direct message reactions
            socket.on('react_direct_message', async (data) => {
                try {
                    const { messageId, receiver, sender, user, emoji } = data;

                    const message = await DirectMessage.findById(messageId);
                    if (!message) return;

                    const existingReactionIndex = message.reactions.findIndex(
                        r => r.user.toString() === user && r.emoji === emoji
                    );

                    if (existingReactionIndex > -1) {
                        message.reactions.splice(existingReactionIndex, 1);
                    } else {
                        message.reactions.push({ user, emoji });
                    }

                    await message.save();

                    const reactionData = {
                        messageId,
                        reactions: message.reactions
                    };

                    io.to(`user_${receiver}`).emit('direct_message_reacted', reactionData);
                    io.to(`user_${sender}`).emit('direct_message_reacted', reactionData);
                } catch (error) {
                    console.error('Socket direct reaction error:', error);
                }
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
                if (currentUserId && onlineUsers.has(currentUserId)) {
                    const socketIds = onlineUsers.get(currentUserId);
                    socketIds.delete(socket.id);
                    if (socketIds.size === 0) {
                        onlineUsers.delete(currentUserId);
                        io.emit('user_offline', currentUserId);
                    }
                }
            });
        });

        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error('Socket.io not initialized!');
        }
        return io;
    }
};
