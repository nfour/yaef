import { MessagePort } from 'worker_threads';

import { IEventInputs } from '../';
import { IEvent } from '../system';

export interface IRemoteModuleConfig {
  module: { path: string, member: string };
}

export interface IMessages {
  'readyMessage': { id: 'ready' };
  'killMessage': { id: 'kill' };
  'portMessage': { id: 'port', port: MessagePort };
  'componentWorkerData': { eventInput: IEventInputs, module: IRemoteModuleConfig['module'] };
  'observationMessage': { id: 'observation', event: IEvent, payload: any };
  'publicationMessage': { id: 'publication', event: IEvent, payload: any };
}
