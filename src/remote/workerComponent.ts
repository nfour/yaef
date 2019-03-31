import 'ts-node/register';

import Debug from 'debug';
import { MessagePort, parentPort, threadId, workerData } from 'worker_threads';

import { ComponentMediator, IComponent } from '../system';
import { IMessages } from './types';

const debug = Debug(`Worker ${threadId}`);

void (async () => {
  debug('Awaiting port...');

  const port: MessagePort = await new Promise((gotPort) => {
    parentPort!.on('message', ({ id, port: portInput }: IMessages['portMessage']) => {
      if (id !== 'port') { return; }

      gotPort(portInput);
    });
  });

  parentPort!.removeAllListeners();
  parentPort!.close();

  debug('Port acquired');

  const {
    eventInput,
    module: { path, member },
  }: IMessages['componentWorkerData'] = workerData;

  debug(`Importing ${path}:${member} ...`);

  const component: IComponent<any> = (await import(path))[member];

  debug('Initializing mediator...');

  const mediator = await ComponentMediator({ components: [component] }).initialize();

  debug('Mediator initialized.');

  port.on('message', ({ id, event, payload }: IMessages['observationMessage']) => {
    if (id !== 'observation') { return; }

    mediator.publish(event, payload);
  });

  port.on('message', ({ id }: IMessages['killMessage']) => {
    if (id !== 'kill') { return; }

    debug('Killing');
    process.exit(0);
  });

  eventInput.publications.forEach((event) => {
    mediator.observe(event, (payload) => {
      const publicationMessage: IMessages['publicationMessage'] = {
        event, payload,
        id: 'publication',
      };

      port.postMessage(publicationMessage);
    });
  });

  const readyMessage: IMessages['readyMessage'] = { id: 'ready' };
  port.postMessage(readyMessage);

  debug('Ready');
  debug(`Observing events: ${eventInput.observations.map(({ name }) => name)}`);
  debug(`Publishing events: ${eventInput.publications.map(({ name }) => name)}`);
})();
