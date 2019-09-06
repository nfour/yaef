import { MessagePort } from 'worker_threads';

import { IComponentSignature, IEventSignature } from '../';

export interface IRemoteModuleConfig {
  module: {
    path: string,
    member: string,
  };
  /** When set, the imported function will be wrapped in a component using this as a config */
  plainFunction?: {
    /** The component name */
    name: string;

    /** The event that this function will listen to, to invoke */
    eventToInvoke: IEventSignature;
    /** Emit this event with the return data when completed */
    eventOnReturn: IEventSignature;

    /** If set, defines the index of the parameter that works as a nodejs-style callback, which is expected to resolve async data */
    callbackParamIndex?: number

    /** When defined, this will map keys from the input event to positions in the function params */
    inputEventToParamIndexMap?: string[];
  };
}

export interface IMessages {
  'readyMessage': { id: 'ready' };
  'killMessage': { id: 'kill' };
  'portMessage': { id: 'port', port: MessagePort };
  'componentWorkerData': {
    eventInput: IComponentSignature,
    module: IRemoteModuleConfig['module'],
    plainFunction?: IRemoteModuleConfig['plainFunction'],
  };
  'observationMessage': { id: 'observation', event: IEventSignature, payload: any };
  'publicationMessage': { id: 'publication', event: IEventSignature, payload: any };
}
