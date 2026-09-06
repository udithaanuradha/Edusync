const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const jwt = require('jsonwebtoken');
const { pubClient, subClient, redisPresence } = require('../config/redis');
const MessageV2Model = require('../models/MessageV2Model');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';
const ONLINE_USERS_SET = 'online_users_v2';

function setupSocketV2(httpServer, corsOptions = {}) {
  const io = new Server(httpServer, {
    cors: corsOptions.cors || {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  try {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[SocketV2] Redis Adapter attached.');
  } catch (err) {
    console.warn('[SocketV2] Redis Adapter warning:', err.message);
  }

  io.use(async (socket, next) => {
    try {
      const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      const userIdFallback = socket.handshake.auth?.userId;

      let user = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          user = jwt.verify(token, JWT_SECRET);
        } catch (e) {
          if (userIdFallback) {
            user = {
              id: Number(userIdFallback),
              role: socket.handshake.auth?.userRole,
              name: socket.handshake.auth?.userName,
            };
          }
        }
      } else if (userIdFallback) {
        user = {
          id: Number(userIdFallback),
          role: socket.handshake.auth?.userRole,
          name: socket.handshake.auth?.userName,
        };
      }

      if (!user || !user.id) {
        return next(new Error('Authentication failed'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Internal Auth Error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    const userRoom = `room:user_${userId}`;

    socket.join(userRoom);

    try {
      await redisPresence.sadd(ONLINE_USERS_SET, userId.toString());
      await redisPresence.sadd(`user_sockets:${userId}`, socket.id);
      socket.broadcast.emit('user:online', { userId });

      const onlineMembers = await redisPresence.smembers(ONLINE_USERS_SET);
      socket.emit('presence:sync', onlineMembers.map((id) => parseInt(id, 10)));
    } catch (err) {
      console.warn('[SocketV2] Redis presence error:', err.message);
    }

    socket.on('message:send', async (payload, callback) => {
      try {
        const { receiver_id, message_text } = payload;
        if (!receiver_id || !message_text?.trim()) {
          if (typeof callback === 'function') callback({ success: false, error: 'Invalid payload' });
          return;
        }

        const savedMessage = await MessageV2Model.saveMessage({
          sender_id: userId,
          receiver_id: parseInt(receiver_id, 10),
          message_text: message_text.trim(),
        });

        io.to(`room:user_${receiver_id}`).emit('message:received', savedMessage);
        if (typeof callback === 'function') callback({ success: true, data: savedMessage });
      } catch (error) {
        if (typeof callback === 'function') callback({ success: false, error: 'Failed to send' });
      }
    });

    socket.on('message:read', async ({ sender_id }) => {
      if (!sender_id) return;
      await MessageV2Model.markMessagesAsRead(sender_id, userId);
      io.to(`room:user_${sender_id}`).emit('message:read_receipt', {
        sender_id: parseInt(sender_id, 10),
        reader_id: userId,
      });
    });

    socket.on('typing:start', ({ receiver_id }) => {
      if (receiver_id) {
        socket.to(`room:user_${receiver_id}`).emit('typing:update', { sender_id: userId, is_typing: true });
      }
    });

    socket.on('typing:stop', ({ receiver_id }) => {
      if (receiver_id) {
        socket.to(`room:user_${receiver_id}`).emit('typing:update', { sender_id: userId, is_typing: false });
      }
    });

    socket.on('disconnect', async () => {
      try {
        await redisPresence.srem(`user_sockets:${userId}`, socket.id);
        const remaining = await redisPresence.scard(`user_sockets:${userId}`);
        if (remaining === 0) {
          await redisPresence.srem(ONLINE_USERS_SET, userId.toString());
          socket.broadcast.emit('user:offline', { userId });
        }
      } catch (err) {
        console.warn('[SocketV2] Cleanup error:', err.message);
      }
    });
  });

  return io;
}

module.exports = { setupSocketV2 };
