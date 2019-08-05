import { reduce } from 'bluebird';

import { IEventShapes, IEventSignatures, Omit } from './';
import { createDebug, createUniqueId } from './debug';
import { ErrorFromCallPoint } from './lib';

/** FIXME: This feels shit */
const primitiveNames = ['Object', 'Array', 'String', 'Number'];

const ValidateMediatorEventName = (from: string) => (name?: string) => {
  if (!name || primitiveNames.includes(name)) {
    throw ErrorFromCallPoint({ fromStackPosition: 3 })(
      `[${from}] Cannot observe event, missing unique 'name' property. Got value: ${name}`,
    );
  }
};

const getNameFromEvent = (event: IEventShapes) => event.name || event.constructor.name;

export type IMediatorEventCallback = (event: any) => any;

export class SimpleMediator<Events extends IEventSignatures> implements IMediator<Events> {
  /** For storing type information */
  Events!: Events;

  observers: Map<any, Array<{ event: any, callback: IMediatorEventCallback }>> = new Map();

  protected debug: ReturnType<typeof createDebug>;

  constructor () {
    this.debug = createDebug(this.constructor.name, createUniqueId());
  }

  /** Add many observers, say, from another mediator */
  mergeObservers (observers: SimpleMediator<any>['observers']) {
    this.observers = new Map([
      ...this.observers.entries(),
      ...observers.entries(),
    ]);
  }

  removeObserver (inputCallback: IMediatorEventCallback) {
    for (const observers of this.observers.values()) {
      const indexMatch = observers.findIndex(({ callback }) => callback === inputCallback);

      if (indexMatch >= 0) {
        this.debug(`Observer removed for event: %o`, observers[indexMatch].event.name);

        // Remove it.
        return observers.splice(indexMatch, 1);
      }
    }
  }

  observe <Es extends this['Events']['observations']> (event: Es, callback: (event: Es) => any) {
    const name = event.name;

    ValidateMediatorEventName(this.constructor.name)(name);

    /** Set default if not defined */
    if (!this.observers.has(name)) { this.observers.set(name, []); }

    const observers = this.observers.get(name)!;

    // TODO: need to be able to add an observe to a specific placement
    this.observers.set(name, [{ event, callback }, ...observers]);

    this.debug(`Observer added for event: %o`, name);
  }

  publish<Es extends this['Events']['publications']> (
    event: Es,
    /** This name thing exists because we are being cheeky with props */
    payload?: Omit<{ [K in keyof typeof event]: typeof event[K] }, 'name'>,
  ): Es | undefined | any {
    const name = getNameFromEvent(event as IEventShapes);

    ValidateMediatorEventName(this.constructor.name)(name);

    this.debug(`Publishing event %o ...`, name);

    if (!this.observers.has(name)) { return; }

    const observers = this.observers.get(name)!;

    if (!observers.length) { return; }

    const firstPayload = observers[0].callback(payload);

    if (observers.length <= 1) { return firstPayload; }

    this.debug(`Published event %o is propagating to observers...`, name);

    const result = observers.slice(1).reduce((prevPayload, { callback }) => callback(prevPayload), firstPayload);

    this.debug(`Published event %o result is %O`, name, result);

    return result;
  }
}

/**
 * SimpleMediator, but publish waits on promises
 */
export class PromisingMediator<Events extends IEventSignatures> extends SimpleMediator<Events> {
  async publish<Es extends this['Events']['publications']> (
    event: Es,
    /** This name thing exists because we are being cheeky with props */
    payload?: Omit<{ [K in keyof typeof event]: typeof event[K] }, 'name'>,
  ): Promise<Es | undefined> {
    const name = getNameFromEvent(event as IEventShapes);

    ValidateMediatorEventName(this.constructor.name)(name);

    this.debug(`Publishing event %o ...`, name);

    if (!this.observers.has(name)) { return; }

    const observers = this.observers.get(name)!;

    if (!observers.length) { return; }

    const firstPayload = await observers[0].callback(payload);

    if (observers.length <= 1) { return firstPayload; }

    this.debug(`Published event %o is propagating to observers...`, name);

    const result = await reduce(observers.slice(1), async (prevPayload, { callback }) => callback(prevPayload), firstPayload);

    this.debug(`Published event %o result is %O`, name, result);

    return result;
  }
}

export interface IMediator<Events extends IEventSignatures> {
  Events: Events;

  observe <Es extends this['Events']['observations']> (event: Es, ...args: any[]): any;
  publish <Es extends this['Events']['publications']> (event: Es, payload?: unknown): any;
}
