import { delay } from 'bluebird';
import { resolve } from 'path';
import { MessageChannel, Worker } from 'worker_threads';

import { IComponent, IComponentSignature } from '../';
import { EventSignature } from '../componentry';
import { createDebug } from '../debug';
import { Mediator } from '../mediation';
import { IMessages, IRemoteModuleConfig } from './types';

const workerResolverPath = resolve(__dirname, '../../build/remote/workerComponent.js');

const debug = createDebug(`RemoteModule`);

/** Used to define where in a functions parameters a callback should be inserted */
export const COMPLETION_CALLBACK_SYMBOL = 'YAEF_REMOTE_COMPLETION_CALLBACK_SYMBOL';

export const RestartRemoteModuleWorker = EventSignature('RestartRemoteModuleWorker');

export function RemoteModuleComponent<E extends IComponentSignature> (
  eventInput: E,
  config: IRemoteModuleConfig,
): IComponent<E> {
  const workerData: IMessages['componentWorkerData'] = {
    eventInput: {
      ...eventInput,
      publications: [...eventInput.publications, RestartRemoteModuleWorker],
    },
    ...config,
  };

  function createWorker () {
    const worker = new Worker(workerResolverPath, { workerData });

    debug('Creating worker...');

    const { port1: workerPort, port2: workerParentPort } = new MessageChannel();

    const isReady = new Promise(async (done) => {
      await new Promise((isOnline) => {
        worker.once('online', isOnline);
      });

      debug('Worker online');
      debug(`Establishing connection...`);

      const portMessage: IMessages['portMessage'] = { id: 'port', port: workerParentPort };

      worker.postMessage(portMessage, [workerParentPort]);

      workerPort.on('message', ({ id }: IMessages['readyMessage']) => {
        if (id !== 'ready') { return; }

        workerPort.off('message', done);

        debug('Connection established. Component ready.');

        done();
      });
    });

    return { isReady, worker, workerPort, workerParentPort };
  }

  async function killWorker () {
    debug('Killing worker...');

    /** Make sure after time, terminate */
    const timedExecution = delay(500).then(() => {
      activeWorker.workerPort.close();
      activeWorker.workerParentPort.close();

      return activeWorker.worker.terminate();
    });

    /** Ask the worker to commit soduku */
    await new Promise((r) => {
      activeWorker.workerPort.postMessage({ id: 'kill' });
      activeWorker.workerPort.on('close', r);
    });

    // Just making sure.
    await timedExecution;
  }

  async function connectComponentToWorker (mediator: Mediator<any>) {
    async function restartWorker () {
      // TODO: this is not working
      debug('Restarting Remote Module Worker...');

      await killWorker();

      /** Sets the new worker config by mutating the reference */
      activeWorker = createWorker();

      establishConnectionToWorker();
    }

    async function establishConnectionToWorker () {
      debug('Awaiting component ready...');

      await activeWorker.isReady;

      debug('Mediating component...');

      activeWorker.workerPort.on('message', ({ id, event, payload }: IMessages['publicationMessage']) => {
        if (id !== 'publication') { return; }

        debug(`Worker 'publication' ${event.name}`);

        /** This event is internal so we handle it outside of the `mediator` */
        if (event.name === RestartRemoteModuleWorker.name) {
          return restartWorker();
        }

        mediator.publish(event, payload);
      });
    }

    eventInput.observations.forEach((event) => {
      mediator.observe(event, (payload) => {
        debug(`Sending observation %o`, event.name);

        const message: IMessages['observationMessage'] = { id: 'observation', event, payload };

        activeWorker.workerPort.postMessage(message);
      });
    });

    establishConnectionToWorker();
  }

  /** This is `let` so that configuration and listeners do not have to be reestablished on restart */
  let activeWorker = createWorker();

  const component = <IComponent<E>> (async (mediator) => {
    component.disconnect = () => killWorker();

    connectComponentToWorker(mediator);
  });

  component.observations = eventInput.observations;
  component.publications = eventInput.publications;

  return component;
}
