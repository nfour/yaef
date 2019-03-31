import 'ts-node/register';

import { MessagePort, parentPort, workerData } from 'worker_threads';

import { ComponentMediator, IComponent } from '../system';
import { IMessages } from './types';

/** TODO: make this use a debug module. */
// tslint:disable-next-line: no-console
const log = (txt: string) => console.log(`... Worker ... ${txt}`);

void (async () => {
  log('Awaiting port...');

  const port: MessagePort = await new Promise((gotPort) => {
    parentPort!.on('message', ({ id, port: portInput }: IMessages['portMessage']) => {
      if (id !== 'port') { return; }

      gotPort(portInput);
    });
  });

  parentPort!.removeAllListeners();
  parentPort!.close();

  log('Port acquired');

  const {
    eventInput,
    module: { path, member },
  }: IMessages['componentWorkerData'] = workerData;

  log(`Importing ${path}:${member} ...`);

  const component: IComponent<any> = (await import(path))[member];

  log('Initializing mediator...');

  const mediator = await ComponentMediator({ components: [component] }).initialize();

  log('Mediator initialized.');

  port.on('message', ({ id, event, payload }: IMessages['observationMessage']) => {
    if (id !== 'observation') { return; }

    mediator.publish(event, payload);
  });

  port.on('message', ({ id }: IMessages['killMessage']) => {
    if (id !== 'kill') { return; }

    log('Killing');
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

  log('Ready');
  log(`Observing events: ${eventInput.observations.map(({ name }) => name)}`);
  log(`Publishing events: ${eventInput.publications.map(({ name }) => name)}`);
})();
