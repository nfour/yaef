import { delay } from 'bluebird';
import * as findUp from 'findup-sync';
import { get } from 'lodash';
import { MessagePort, parentPort, threadId, workerData } from 'worker_threads';

import { COMPLETE_CALLBACK_SYMBOL, ComponentMediator, IComponent } from '../';
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

  await configureTsNodeRegister({ tsconfig, fromPath: path });

  debug('Port acquired');
  debug(`Importing ${path}:${member} ...`);

  const component = await importComponent({
    path, member, plainFunction,
    name: eventInput.name,
  });

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

async function importComponent ({ name, path, member, plainFunction }: {
  name: string;
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

  const { events: { ExceptionEvent, RequestEvent, ResponseEvent } } = plainFunction;

  return Component({
    name,
    observations: [RequestEvent],
    publications: [ExceptionEvent, ResponseEvent],
  }, (m) => {
    m.observe(RequestEvent, async (inputEvent: typeof RequestEvent) => {
      function resolveResponse (result: any) { m.publish(ResponseEvent, { result }); }
      function resolveException (error: Error) { m.publish(ExceptionEvent, { error }); }

      const { params } = inputEvent;

      const hasCallbackInParams = params.indexOf(COMPLETE_CALLBACK_SYMBOL) > -1;

      if (hasCallbackInParams) {
        // Resolving using the result of the callback

        const callback = (err: Error | undefined, res: any) => {
          if (err) { resolveException(err); } else { resolveResponse(res); }
        };

        const inputParams = params.map((value) =>
          value === COMPLETE_CALLBACK_SYMBOL
            ? callback
            : value,
        );

        await handlerFn(...inputParams);
      } else {
        // Resolving using the return value

        await Promise.resolve(handlerFn(...params))
          .then(resolveResponse)
          .catch(resolveException);
      }
    });
  });
}

async function configureTsNodeRegister ({ tsconfig, fromPath }: {
  tsconfig: IMessages['componentWorkerData']['tsconfig'];
  fromPath: string;
}) {
  if (!tsconfig) { return; }

  debug('Registering ts-node with tsconfig at path %o', tsconfig);

  const tsNodeRegister = await (async () => {
    try {
      // tslint:disable-next-line: no-implicit-dependencies
      return (await import('ts-node')).register;
    } catch { /**/ }
  })();

  if (!tsNodeRegister) {
    debug('Could not resolve `ts-node` dependency');
    return;
  }

  const project = get(tsconfig, 'autoDiscover') === true
    ? findUp(`tsconfig.json`, { cwd: fromPath }) || undefined
    : tsconfig as string;

  tsNodeRegister({ transpileOnly: true, project });
}
