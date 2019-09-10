import { delay } from 'bluebird';
import { resolve } from 'path';
import { MessageChannel, Worker } from 'worker_threads';

import { IComponent, IComponentSignature } from '../';
import { createDebug } from '../debug';
import { IMessages, IRemoteModuleConfig } from './types';

const workerResolverPath = resolve(__dirname, '../../build/remote/workerComponent.js');

const debug = createDebug(`RemoteModule`);

/** Used to define where in a functions parameters a callback should be inserted */
export const COMPLETION_CALLBACK = 'YAEF_REMOTE_COMPLETE_CALLBACK_SYMBOL';

export function RemoteModuleComponent<E extends IComponentSignature> (
  eventInput: E,
  config: IRemoteModuleConfig,
): IComponent<E> {
  const workerData: IMessages['componentWorkerData'] = { eventInput, ...config };

  const worker = new Worker(workerResolverPath, { workerData });

  const { port1: workerPort, port2: workerParentPort } = new MessageChannel();

  const isReady = new Promise(async (done) => {
    debug('Awaiting worker online...');

    await new Promise((isOnline) => {
      worker.once('online', isOnline);
    });

    debug('Worker online');
    debug(`Emitting 'port'...`);

    const portMessage: IMessages['portMessage'] = { id: 'port', port: workerParentPort };

    worker.postMessage(portMessage, [workerParentPort]);

    workerPort.on('message', ({ id }: IMessages['readyMessage']) => {
      if (id !== 'ready') { return; }

      workerPort.off('message', done);

      debug('Component ready');

      done();
    });
  });

  const component = <IComponent<E>> (async (mediator) => {
    component.disconnect = async () => {
      /** Make sure after time, terminate */
      const timedExecution = delay(500).then(() => {
        workerPort.close();
        workerParentPort.close();

        worker.terminate();
      });

      /** Ask the worker to commit soduku */
      await new Promise((r) => {
        workerPort.postMessage({ id: 'kill' });
        workerPort.on('close', r);
      });

      // Just making sure.
      await timedExecution;
    };

    debug('Awaiting component ready...');
    await isReady;
    debug('Mediating component...');

    eventInput.observations.forEach((event) => {
      mediator.observe(event, (payload) => {
        debug(`Sending observation %o`, event.name);

        const message: IMessages['observationMessage'] = { id: 'observation', event, payload };

        workerPort.postMessage(message);
      });
    });

    workerPort.on('message', ({ id, event, payload }: IMessages['publicationMessage']) => {
      if (id !== 'publication') { return; }

      debug(`Worker 'publication' ${event.name}`);

      mediator.publish(event, payload);
    });

  });

  component.observations = eventInput.observations;
  component.publications = eventInput.publications;

  return component;
}
