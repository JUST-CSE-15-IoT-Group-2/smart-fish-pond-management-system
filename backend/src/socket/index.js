/**
 * Socket.IO event handlers.
 * The `io` instance is created in src/index.js and passed here.
 *
 * Current events emitted by the SERVER → CLIENT:
 *   sensor:update   — triggered when IoT device POSTs a new reading
 *   motor:update    — triggered when motor/connection state changes
 *
 * Future events could include alerts, feeding triggers, etc.
 */
const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} — ${reason}`);
    });
  });
};

module.exports = { initSocket };
