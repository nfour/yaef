import { map, reduce } from 'bluebird';

import { ErrorFromCallPoint } from './lib';
import { Omit, UnionToIntersection } from './types';

export function Component<
  E extends IComponentSignature
> (
  input: E,
  callback: (mediator: SimpleMediator<EventTuplesToUnion<E>>) => void,
): IComponent<E> {
  const component = <IComponent<E>> ((mediator) => callback(mediator));

  type ComponentPropConstraints = { [K in keyof IComponent<any>]: any };

  Object.defineProperties(component, <ComponentPropConstraints> {
    name: { value: input.name, writable: false },
    observations: { value: input.observations, writable: false },
    publications: { value: input.publications, writable: false },
    disconnect: { value: () => { /**/ } }, // TODO: make this useful?
  });

  return component;
}

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

/**
 * TODO: Support `Mediator` property, so one can construct from arbitrary IMediator conformant interfaces
 */
export function ComponentMediator<C extends IComponent<any>> ({ components }: { components: C[] }) {
  /** This should be part of the input as well */
  const mediator = new SimpleMediator<MergeComponentEvents<C>>();

  return {
    mediator,
    async connect () {
      // TODO: if anything tries to .publish before this is called, they should get rekt
      // Or it should be buffered, like in `reaco`

      await map(components, (component) => component(mediator));

      return mediator;
    },
    async disconnect () {
      await map(components, (component) => component.disconnect());
    },
  };
}

export function ComponentSignature<
  In extends Omit<IComponentSignature<any>, 'name'>,
  N extends string = string
> (name: N, input?: In) {
  return { name, ...input || {} } as { name: N } & In;
}

export function EventSignature<In extends Omit<IEventSignature, 'name'>, N extends string = string> (name: N, input?: In) {
  return { name, ...input || {} } as Omit<In, 'name'> & { name: N };
}

export interface IMediator<Events extends IEventSignatures> {
  Events: Events;

  observe <Es extends this['Events']['observations']> (event: Es, ...args: any[]): any;
  publish <Es extends this['Events']['publications']> (event: Es, payload?: unknown): any;
}

export interface MergeComponentEvents<C extends IComponent<any>> {
  observations: C['observations'][number] | C['publications'][number];
  publications: C['observations'][number] | C['publications'][number];
}

export interface EventTuplesToUnion<E extends IComponentEvents> {
  observations: E['observations'][number];
  publications: E['publications'][number];
}

// tslint:disable-next-line: interface-over-type-literal
export type IEventSignature = { readonly name?: string, [k: string]: unknown };

export type IEventShapes = UnionToIntersection<IEventSignature>;

export interface IEventSignatures {
  observations: IEventSignature;
  publications: IEventSignature;
}

export interface IComponentSignature<E extends IEventSignature = IEventSignature> {
  name: string;
  observations: E[];
  publications: E[];
}

export interface IComponentEvents<Event extends IEventSignature = IEventSignature> {
  observations: Event[];
  publications: Event[];
}

export type AnonComponent<Events extends IEventSignatures> = (mediator: SimpleMediator<Events>) => void;

/**
 * TODO: Need `In['name']` to actually be a literal instead of `string`
 */
export interface IComponent<
  In extends IComponentSignature = IComponentSignature,
  M = SimpleMediator<EventTuplesToUnion<In>>, // TODO: support arbitrary mediator signatures, dont couple to Simple
> {
  (mediator: M): void | Promise<void>;

  name: In['name'];

  observations: In['observations'];
  publications: In['publications'];

  disconnect (): void | Promise<void>;
}
