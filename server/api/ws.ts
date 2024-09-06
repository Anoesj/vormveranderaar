export default defineWebSocketHandler({
  open (peer) {
    console.log('[ws] open:', peer);
  },

  close (peer) {
    console.log('[ws] close:', peer);
  },

  error (peer, error) {
    console.error('[ws] error:', { error, peer });
  },

  message (peer, message) {
    console.log('[ws] message:', { message, peer });

    peer.send('Hello from the server!');
  },
});
