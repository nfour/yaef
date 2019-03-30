import { resolve } from 'path';
import { MessageChannel, Worker } from 'worker_threads';

import { IComponent, IEventInputs } from '../';
import { IMessages, IRemoteModuleConfig } from './types';

const workerResolverPath = resolve(__dirname, '../../build/remote/workerComponent.js');

// tslint:disable-next-line: no-console
const log = (txt: string) => console.log(`... Master ... ${txt}`);

export function RemoteModuleComponent<E extends IEventInputs> (
  eventInput: E,
  config: IRemoteModuleConfig,
): IComponent<E> {
  const workerData: IMessages['componentWorkerData'] = { eventInput, module: config.module };
  const worker = new Worker(workerResolverPath, { workerData });

  const { port1: workerPort, port2: workerParentPort } = new MessageChannel();

  const isReady = new Promise(async (done) => {
    log('Awaiting worker online...');

    await new Promise((isOnline) => {
      worker.once('online', isOnline);
    });

    log('Worker online');
    log(`Emitting 'port'...`);

    const portMessage: IMessages['portMessage'] = { id: 'port', port: workerParentPort };

    worker.postMessage(portMessage, [workerParentPort]);

    workerPort.on('message', ({ id }: IMessages['readyMessage']) => {
      if (id !== 'ready') { return; }

      workerPort.off('message', done);

      log('Component ready');

      done();
    });
  });

  const component = <IComponent<E>> (async (mediator) => {
    component.kill = async () => {
      await new Promise((r) => worker.terminate(r));
    };

    log('Awaiting component ready...');
    await isReady;
    log('Mediating component...');

    eventInput.observations.forEach((event) => {
      mediator.observe(event, (payload) => {
        log(`Sending 'observation' ${event.name}`);

        const message: IMessages['observationMessage'] = { id: 'observation', event, payload };

        workerPort.postMessage(message);
      });
    });

    workerPort.on('message', ({ id, event, payload }: IMessages['publicationMessage']) => {
      if (id !== 'publication') { return; }

      log(`Worker 'publication' ${event.name}`);

      mediator.publish(event, payload);
    });

  });

  component.observations = eventInput.observations;
  component.publications = eventInput.publications;

  return component;
}
