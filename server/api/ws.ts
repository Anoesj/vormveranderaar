import type { Peer } from 'crossws';

const peerPuzzleMap = new Map<Peer, {
  puzzle: PuzzleOptions;
  abortController: AbortController;
}>();

export default defineWebSocketHandler({
  open (peer) {
    console.log('[ws] open:', peer);
  },

  close (peer) {
    console.log('[ws] close:', peer);

    const peerPrevReq = peerPuzzleMap.get(peer);

    if (peerPrevReq) {
      peerPrevReq.abortController.abort();
    }

    peerPuzzleMap.delete(peer);
  },

  error (peer, error) {
    console.error('[ws] error:', { error, peer });
  },

  async message (peer, message) {
    console.log('[ws] message:', { message, peer });

    const peerPrevReq = peerPuzzleMap.get(peer);

    if (peerPrevReq) {
      peerPrevReq.abortController.abort();
    }

    const data = message.text();
    const body = data
      ? JSON.parse(data) as PuzzleOptions
      : PuzzleLibrary.p18;

    const abortController = new AbortController;

    let puzzle: InstanceType<typeof Puzzle>;

    try {
      puzzle = new Puzzle(body, abortController);
      // await puzzle.preparePossibleSolutionStarts();
      await puzzle.bruteForceSolution();
      peer.send(JSON.stringify(puzzle));
    }
    catch (err) {
      throw createError({
        statusCode: 400,
        data: err,
      });
    }
  },
});
