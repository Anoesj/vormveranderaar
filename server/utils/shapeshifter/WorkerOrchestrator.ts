/* eslint-disable -- Not using this file right now */
// @ts-nocheck

// import ShapeshifterIteratorWorker from '@/utils/shapeshifterWorker?worker';

/**
 * "Workers may themselves spawn new workers, as long as those workers are hosted at the same origin as the parent page."
 * See: https://developer.mozilla.org/en-US/docs/Web/API/Worker
 */
export class WorkerOrchestrator {
  workers: Array<InstanceType<typeof ShapeshifterIteratorWorker>> = [];

  // NOTE: Temporarily 1, until we find a way to distribute the work between workers.
  maxWorkers = 1;
  // maxWorkers = globalThis.navigator.hardwareConcurrency || 1;

  start () {
    for (let i = 0; i < this.maxWorkers; i++) {
      this.workers.push(new ShapeshifterIteratorWorker);
    }
  }

  stop () {
    this.workers.forEach(worker => worker.terminate());
    this.workers.length = 0;
  }
}