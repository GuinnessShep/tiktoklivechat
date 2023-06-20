const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { TikTokConnectionWrapper, getGlobalConnectionCount } = require('./connectionWrapper');
const { clientBlocked } = require('./limiter');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*'
  }
});

io.on('connection', (socket) => {
  let tiktokConnectionWrapper;

  console.info('New connection from origin', socket.handshake.headers['origin'] || socket.handshake.headers['referer']);

  socket.on('setUniqueId', (uniqueId, options) => {
    if (typeof options === 'object' && options) {
      delete options.requestOptions;
      delete options.websocketOptions;
    } else {
      options = {};
    }

    if (process.env.ENABLE_RATE_LIMIT && clientBlocked(io, socket)) {
      socket.emit('tiktokDisconnected', 'You have opened too many connections or made too many connection requests. Please reduce the number of connections/requests or host your own server instance. The connections are limited to avoid the server IP getting blocked by TikTok.');
      return;
    }

    try {
      tiktokConnectionWrapper = new TikTokConnectionWrapper(uniqueId, options, true);
      tiktokConnectionWrapper.connect();
    } catch (err) {
      socket.emit('tiktokDisconnected', err.toString());
      return;
    }

    tiktokConnectionWrapper.once('connected', state => socket.emit('tiktokConnected', state));
    tiktokConnectionWrapper.once('disconnected', reason => socket.emit('tiktokDisconnected', reason));
    tiktokConnectionWrapper.connection.on('streamEnd', () => socket.emit('streamEnd'));
    tiktokConnectionWrapper.connection.on('roomUser', msg => socket.emit('roomUser', msg));
    tiktokConnectionWrapper.connection.on('member', msg => socket.emit('member', msg));
    tiktokConnectionWrapper.connection.on('chat', msg => socket.emit('chat', msg));
    tiktokConnectionWrapper.connection.on('gift', msg => socket.emit('gift', msg));
    tiktokConnectionWrapper.connection.on('social', msg => socket.emit('social', msg));
    tiktokConnectionWrapper.connection.on('like', msg => socket.emit('like', msg));
    tiktokConnectionWrapper.connection.on('questionNew', msg => socket.emit('questionNew', msg));
    tiktokConnectionWrapper.connection.on('linkMicBattle', msg => socket.emit('linkMicBattle', msg));
    tiktokConnectionWrapper.connection.on('linkMicArmies', msg => socket.emit('linkMicArmies', msg));
    tiktokConnectionWrapper.connection.on('liveIntro', msg => socket.emit('liveIntro', msg));
    tiktokConnectionWrapper.connection.on('emote', msg => socket.emit('emote', msg));
    tiktokConnectionWrapper.connection.on('envelope', msg => socket.emit('envelope', msg));
    tiktokConnectionWrapper.connection.on('subscribe', msg => socket.emit('subscribe', msg));
  });

  socket.on('disconnect', () => {
    if (tiktokConnectionWrapper) {
      tiktokConnectionWrapper.disconnect();
    }
  });
});

setInterval(() => {
  io.emit('statistic', { globalConnectionCount: getGlobalConnectionCount() });
}, 5000);

app.use(express.static('public'));

module.exports = app;
