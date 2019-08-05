import { reduce } from 'bluebird';

import { IEventShapes, IEventSignatures, Omit } from './';
import { debug } from './debug';
import { ErrorFromCallPoint } from './lib';

const log = {
  SimpleMediator: debug.extend('SimpleMediator'),
  PromisingMediator: debug.extend('PromisingMediator'),
};

/** This is gay */
const primitiveNames = ['Object', 'Array', 'String', 'Number'];

const CheckMediatorEventName = (from: string) => (name?: string) => {
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

  /** Add many observers, say, from another mediator */
  addObservers (observers: SimpleMediator<any>['observers']) {
    this.observers = new Map([
      ...this.observers.entries(),
      ...observers.entries(),
    ]);
  }

  removeObserver (inputCallback: IMediatorEventCallback) {
    for (const observers of this.observers.values()) {
      const indexMatch = observers.findIndex(({ callback }) => callback === inputCallback);

      if (indexMatch >= 0) {
        // Remove it.
        return observers.splice(indexMatch, 1);
      }
    }
  }

  observe <Es extends this['Events']['observations']> (event: Es, callback: (event: Es) => any) {
    const name = event.name;

    CheckMediatorEventName(this.constructor.name)(name);

    /** Set default if not defined */
    if (!this.observers.has(name)) { this.observers.set(name, []); }

    const observers = this.observers.get(name)!;

    // TODO: need to be able to add an observe to a specific placement
    this.observers.set(name, [{ event, callback }, ...observers]);
  }

  publish<Es extends this['Events']['publications']> (
    event: Es,
    /** This name thing exists because we are being cheeky with props */
    payload?: Omit<{ [K in keyof typeof event]: typeof event[K] }, 'name'>,
  ): Es | undefined | any {
    const name = getNameFromEvent(event as IEventShapes);

    CheckMediatorEventName(this.constructor.name)(name);

    if (!this.observers.has(name)) { return; }

    const observers = this.observers.get(name)!;

    if (!observers.length) { return; }

    const firstEvent = observers[0].callback(event);

    if (observers.length <= 1) { return firstEvent; }

    return observers.slice(1).reduce((prevEvent, { callback }) => callback(prevEvent), firstEvent);
  }
}

export class PromisingMediator<Events extends IEventSignatures> extends SimpleMediator<Events> {
  async publish<Es extends this['Events']['publications']> (
    event: Es,
    /** This name thing exists because we are being cheeky with props */
    payload?: Omit<{ [K in keyof typeof event]: typeof event[K] }, 'name'>,
  ): Promise<Es | undefined> {
    const name = getNameFromEvent(event as IEventShapes);

    CheckMediatorEventName(this.constructor.name)(name);

    if (!this.observers.has(name)) { return; }

    const observers = this.observers.get(name)!;

    if (!observers.length) { return; }

    const firstEvent = await observers[0].callback(event);

    if (observers.length <= 1) { return firstEvent; }

    return reduce(observers.slice(1), async (prevEvent, { callback }) => callback(prevEvent), firstEvent);
  }
}

export interface IMediator<Events extends IEventSignatures> {
  Events: Events;

  observe <Es extends this['Events']['observations']> (event: Es, ...args: any[]): any;
  publish <Es extends this['Events']['publications']> (event: Es, payload?: unknown): any;
}
