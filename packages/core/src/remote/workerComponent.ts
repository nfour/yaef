import { delay } from 'bluebird';
import * as findUp from 'findup-sync';
import { get } from 'lodash';
import { MessagePort, parentPort, threadId, workerData } from 'worker_threads';

import { COMPLETION_CALLBACK_SYMBOL, ComponentMediator, IComponent, RestartRemoteModuleWorker } from '../';
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

  const {
    eventInput, tsconfig, plainFunction, reloadOnFileChanges,
    module: { path, member },
  }: IMessages['componentWorkerData'] = workerData;

  await configureTsNodeRegister({ tsconfig, fromPath: path });

  debug('Port acquired');
  debug(`Importing ${path}:${member} ...`);

  /** This restarts the worker on file changes if configured to do so. */
  const onFileChange = (() => {
    if (!reloadOnFileChanges) { return; }

    /** To prevent multiple events */
    let isBeingRestarted = false;

    return async (filePath: string) => {
      if (isBeingRestarted) { return; }

      isBeingRestarted = true;

      debug('Change detected in file, restarting worker... %o', filePath);

      await mediator.publish(RestartRemoteModuleWorker);
    };
  })();

  const component = await importComponent({
    path, member, plainFunction, onFileChange,
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
      const message: IMessages['publicationMessage'] = {
        event, payload,
        id: 'publication',
      };

      debug('Sending message %O', message);

      port.postMessage(message);
    });
  });

  const readyMessage: IMessages['readyMessage'] = { id: 'ready' };

  port.postMessage(readyMessage);

  debug('Ready');
  debug(`Observing events: ${eventInput.observations.map(({ name }) => name).join(', ')}`);
  debug(`Publishing events: ${eventInput.publications.map(({ name }) => name).join(', ')}`);
})();

async function importComponent ({ name, path, member, plainFunction, onFileChange }: {
  name: string;
  path: string;
  member: string;
  plainFunction?: IMessages['componentWorkerData']['plainFunction'];
  onFileChange?: (filePath: string) => void
}): Promise<IComponent<any>> {
  async function getImport () {
    try {
      const importedModule = await import(path);
      const moduleMember = importedModule[member];

      if (!moduleMember) {
        debug(`Failure to import member %o from %o`, member, path);
        return earlyExit(1);
      }

      if (onFileChange) {
        const FileWatcher = await import('filewatcher');

        const loadedFiles = Object.keys(require.cache);

        const watcher = FileWatcher({ debounce: 500 });

        // TODO: add an option to provide `excludes`, an array of regex patterns to filter the watch list down to.
        debug('Will reload when loaded files change');

        watcher.on('change', (filePath) => {
          onFileChange(filePath);
          watcher.removeAll();
        });

        loadedFiles.forEach((filePath) => { watcher.add(filePath); });
      }

      return moduleMember;
    } catch (err) {
      debug(`Failure to import module at path %o`, path);
      debug(err);
      return earlyExit(1);
    }
  }

  if (!plainFunction) {
    debug('Using module import as component');
    return getImport();
  }

  debug('Using module import as wrapper component fn');

  const handlerFn: (...args: any[]) => Promise<any> = plainFunction.preload
    ? await getImport()
    : (...args: any[]) => getImport().then((fn) => fn(...args));

  const { events: { ExceptionEvent, RequestEvent, ResponseEvent } } = plainFunction;

  return Component({
    name,
    observations: [RequestEvent],
    publications: [ExceptionEvent, ResponseEvent],
  }, (m) => {
    m.observe(RequestEvent, async (inputEvent: typeof RequestEvent) => {
      const { params, _eventId } = inputEvent;

      const resolveResponse = (result: any) => m.publish(ResponseEvent, { _eventId, result });
      const resolveException = (error: Error) => m.publish(ExceptionEvent, { _eventId, error });

      const hasCallbackInParams = params.indexOf(COMPLETION_CALLBACK_SYMBOL) > -1;

      if (hasCallbackInParams) {
        // Resolving using the result of the callback

        const callback = (err: Error | undefined, res: any) => {
          return err
            ? resolveException(err)
            : resolveResponse(res);
        };

        const inputParams = params.map((value) =>
          value === COMPLETION_CALLBACK_SYMBOL
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

  const tsNodeRegister = await (async () => {
    try {
      // tslint:disable-next-line: no-implicit-dependencies
      return (await import('ts-node')).register;
    } catch { /**/ }
  })();

  if (!tsNodeRegister) {
    debug('Exception while registering ts-node: Could not find `ts-node` dependency');
    return;
  }

  const project = get(tsconfig, 'autoDiscover') === true
    ? findUp(`tsconfig.json`, { cwd: fromPath }) || undefined
    : tsconfig as string;

  tsNodeRegister({ transpileOnly: true, project });
}

/** TODO: a more graceful exit would be nice */
async function earlyExit (code: number) {
  await delay(100);

  process.exit(code);
}
