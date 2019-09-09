import { reduce } from 'bluebird';

import { IEventShapes, IEventSignatures, Omit } from './';
import { createDebug, createUniqueId } from './debug';
import { ErrorFromCallPoint } from './lib';

/** FIXME: This feels shit */
const primitiveNames = ['Object', 'Array', 'String', 'Number'];

const ValidateMediatorEventName = (from: string) => (name?: string) => {
  if (!name || primitiveNames.includes(name)) {
    throw ErrorFromCallPoint({ fromStackPosition: 3 })(
      `[${from}] Cannot observe event, invalid 'name' property: ${name}`,
    );
  }
};

const getNameFromEvent = (event: IEventShapes) => event.name || event.constructor.name;

export type IMediatorEventCallback = (event: any) => any;

export class Mediator<Events extends IEventSignatures> implements IMediator<Events> {
  /** For storing type information */
  Events!: Events;

  observers: IMediator<Events>['observers'] = new Map();

  private debug: ReturnType<typeof createDebug>;
  private validateEventNames: ReturnType<typeof ValidateMediatorEventName>;

  constructor () {
    this.debug = createDebug(this.constructor.name, createUniqueId());
    this.validateEventNames = ValidateMediatorEventName(this.constructor.name);

    this.debug('New');
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

  // TODO: need to be able to add an observe to a specific placement based on priority
  observe <Es extends this['Events']['observations']> (
    event: Es,
    callback: (payload: typeof event) => typeof payload | void | Promise<typeof payload | void>,
  ): void {
    const name = event.name;

    this.validateEventNames(name);

    /** Set default if not defined */
    if (!this.observers.has(name)) { this.observers.set(name, []); }

    const observers = this.observers.get(name)!;

    this.observers.set(name, [{ event, callback }, ...observers]);

    this.debug(`Observer added for event %o`, name);
  }

  async publish<Es extends this['Events']['publications']> (
    event: Es,
    /** The event type, without the `name` */
    payload?: OptionalEventName<typeof event>,
  ): Promise<typeof event | undefined> {
    const name = getNameFromEvent(event as IEventShapes);

    this.validateEventNames(name);

    const observers = this.observers.get(name);

    if (!observers || !observers.length) {
      this.debug(`Publishing event %o ignored, no observers`, name);
      return;
    }

    this.debug(`Publishing event %o to %o observers...`, name, observers.length);

    const result = await reduceObservers(observers, { name, ...payload })
      .catch((error) => this.debug(`Uncaught exception from event %o! %o\n %O`, name, error.message, error));

    this.debug(`Published event %o. Result is %O`, name, result);

    return result;
  }
}

/**
 * Skips `undefined` results, using the previous value instead
 * to finally reduce to the same type (and possibly exact value) as the input payload.
 */
async function reduceObservers (observers: IObserverList, payload: any) {
  for (const { callback } of observers) {
    const nextResult = await callback(payload);

    payload = nextResult === undefined ? payload : nextResult;
  }

  return payload;
}

type OptionalEventName<T extends { name?: any }> = Omit<T, 'name'> & { name?: T['name'] extends string ? T['name'] : string };
type IObserverList = Array<{ event: any, callback: IMediatorEventCallback }>;

export interface IMediator<Events extends IEventSignatures> {
  Events: Events;
  observers: Map<any, IObserverList>;

  removeObserver (inputCallback: IMediatorEventCallback): void;
  observe <Es extends this['Events']['observations']> (event: Es, ...args: any[]): any;
  publish <Es extends this['Events']['publications']> (event: Es, payload?: unknown): any;
}
