import { delay } from 'bluebird';
import { register as tsNodeRegister } from 'ts-node';
import { MessagePort, parentPort, threadId, workerData } from 'worker_threads';

import { ComponentMediator, IComponent } from '../';
import { Component } from '../componentry';
import { createDebug } from '../debug';
import { IMessages } from './types';

const debug = createDebug(`RemoteModule Worker ${threadId}`);

async function earlyExit (code: number) {
  await delay(100);

  process.exit(code);
}

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

  const {
    eventInput,
    module: { path, member },
    tsconfig, plainFunction,
  }: IMessages['componentWorkerData'] = workerData;

  if (tsconfig) {
    debug('Registering ts-node with tsconfig at path %o', tsconfig);
    tsNodeRegister({ transpileOnly: true, project: tsconfig });
  }

  debug('Port acquired');
  debug(`Importing ${path}:${member} ...`);

  const component = await importComponent({ path, member, plainFunction });

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

async function importComponent ({ path, member, plainFunction }: {
  path: string;
  member: string;
  plainFunction?: IMessages['componentWorkerData']['plainFunction'];
}): Promise<IComponent<any>> {
  const importValue = await (async () => {
    try {
      const importedModule = await import(path);
      const moduleMember = importedModule[member];

      if (!moduleMember) {
        debug(`Failure to import member %o from %o`, member, path);
        return earlyExit(1);
      }

      return moduleMember;
    } catch (err) {
      debug(`Failure to import module at path %o`, path);
      return earlyExit(1);
    }
  })();

  if (!plainFunction) {
    debug('Using module import as component');
    return importValue;
  }

  debug('Using module import as wrapper component fn');

  const handlerFn: (...args: any[]) => any = importValue;

  const { eventOnReturn, eventToInvoke, callbackParamIndex, inputEventToParamIndexMap } = plainFunction;

  return Component({
    name: plainFunction.name,
    observations: [eventToInvoke],
    publications: [eventOnReturn],
  }, (m) => {
    m.observe(eventToInvoke, async (inputEvent: typeof eventToInvoke) => {
      const resolveResult = (res: any) => {
        m.publish(eventOnReturn, res); // TODO: add a separate error event? eventOnError?

        return res;
      };

      const params = (() => {
        if (!inputEventToParamIndexMap) {
          return [inputEvent];
        }
        return inputEventToParamIndexMap.map((key) => inputEvent[key]);
      })();

      const callback = callbackParamIndex !== undefined
        ? (err: Error | undefined, res: any) => { resolveResult(err || res); } // TODO: be less vague
        : undefined;

      if (callback) {
        params.splice(callbackParamIndex!, 0, callback);
      }

      const result = await handlerFn(...params);

      return resolveResult(result);
    });
  });
}

