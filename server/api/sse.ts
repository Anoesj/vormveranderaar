export default defineEventHandler(async (event) => {
  // Variant 1 (https://h3.unjs.io/guide/websocket#server-sent-events-sse):
  // const eventStream = createEventStream(event);

  // // Send a message every second
  // const interval = setInterval(async () => {
  //   await eventStream.push('Hello world');
  // }, 1000);

  // // Cleanup the interval when the connection is terminated or the writer is closed
  // eventStream.onClosed(() => {
  //   clearInterval(interval);
  // });

  // return eventStream.send();

  // Variant 2 (https://gist.github.com/Atinux/05836469acca9649fa2b9e865df898a2):
  setHeader(event, 'cache-control', 'no-cache')
  setHeader(event, 'connection', 'keep-alive')
  setHeader(event, 'content-type', 'text/event-stream')
  setResponseStatus(event, 200);

  function sendEvent (data: unknown) {
    event.node.res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  // Send a message every second
  const interval = setInterval(() => {
    sendEvent('Hello world');
  }, 1000);

  // Cleanup the interval when the connection is terminated or the writer is closed
  event.node.res.on('close', () => {
    clearInterval(interval);
  });

  // Let the connection opened
  event._handled = true;
});