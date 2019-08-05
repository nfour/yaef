import { MessagePort } from 'worker_threads';

import { IComponentSignature, IEventSignature } from '../';

export interface IRemoteModuleConfig {
  module: { path: string, member: string };
}

export interface IMessages {
  'readyMessage': { id: 'ready' };
  'killMessage': { id: 'kill' };
  'portMessage': { id: 'port', port: MessagePort };
  'componentWorkerData': { eventInput: IComponentSignature, module: IRemoteModuleConfig['module'] };
  'observationMessage': { id: 'observation', event: IEventSignature, payload: any };
  'publicationMessage': { id: 'publication', event: IEventSignature, payload: any };
}
