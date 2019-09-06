import 'ts-node/register';

import { MessagePort, parentPort, threadId, workerData } from 'worker_threads';

import { ComponentMediator, IComponent } from '../';
import { Component } from '../componentry';
import { createDebug } from '../debug';
import { IMessages } from './types';

const debug = createDebug(`RemoteModule Worker ${threadId}`);

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
    plainFunction,
  }: IMessages['componentWorkerData'] = workerData;

  debug(`Importing ${path}:${member} ...`);

  // TODO: abstract to fn
  const component: IComponent<any> = await (async () => {
    const imported = (await import(path))[member];

    if (!plainFunction) { return imported; }

    const { eventOnReturn, eventToInvoke, callbackParamIndex, inputEventToParamIndexMap } = plainFunction;

    return Component({
      name: plainFunction.name,
      observations: [eventToInvoke],
      publications: [eventOnReturn],
    }, (m) => {
      m.observe(eventToInvoke, async (inputEvent: any) => {
        const resolveResult = (result: any) => {
          m.publish(eventOnReturn, result); // TODO: add a separate error event? eventOnError?
        };

        const params = (() => {
          if (!inputEventToParamIndexMap) { return [eventToInvoke]; }

          return inputEventToParamIndexMap.map((key) => eventToInvoke[key]);
        })();

        const callback = callbackParamIndex !== undefined
          ? (err: Error | undefined, result: any) => { resolveResult(err || result); } // TODO: be less vague
          : undefined;

        if (callback) {
          params.splice(callbackParamIndex!, 0, callback);

          const result = await imported(...params);
          resolveResult(result);
        } else {
          await imported(...params);
        }
      });
    });
  })();

  debug('Initializing mediator...');

  const { connect, disconnect, mediator } = ComponentMediator({ components: [component] });

  await connect();

  debug('Mediator initialized.');

  port.on('message', async ({ id, event, payload }: IMessages['observationMessage']) => {
    if (id !== 'observation') { return; }

    mediator.publish(event, payload);
  });

  port.on('message', async ({ id }: IMessages['killMessage']) => {
    if (id !== 'kill') { return; }

    debug('Killing');

    await disconnect();

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
