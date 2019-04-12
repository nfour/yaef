import './types';

import { map } from 'bluebird';

import { ErrorFromCallPoint } from './lib';

export function Component<E extends IComponentSignature> (
  input: E,
  callback: (mediator: SimpleMediator<EventTuplesToUnion<E>>) => void,
): IComponent<E> {
  const component = <IComponent<E>> ((mediator) => callback(mediator));

  Object.defineProperties(component, {
    name: { value: input.name, writable: false },
    observations: { value: input.observations, writable: false },
    publications: { value: input.publications, writable: false },
    kill: { value: () => { /**/ } },
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

export class SimpleMediator<Events extends IEventSignatures> implements IMediator<Events> {
  _events!: Events;

  private observers: Map<any, Array<{ event: any, callback: (event: any) => any }>> = new Map();

  observe <Es extends this['_events']['observations']> (event: Es, callback: (event: Es) => any) {
    const name = event.name;

    CheckMediatorEventName(this.constructor.name)(name);

    /** Set default if not defined */
    if (!this.observers.has(name)) { this.observers.set(name, []); }

    const observers = this.observers.get(name)!;

    this.observers.set(name, [...observers, { event, callback }]);
  }

  publish<Es extends this['_events']['publications']> (
    event: Es,
    /** This name thing exists because we are being cheeky with props */
    payload?: Omit<{ [K in keyof typeof event]: typeof event[K] }, 'name'>,
  ) {
    const name = getNameFromEvent(event as IEventShapes);

    CheckMediatorEventName(this.constructor.name)(name);

    if (!this.observers.has(name)) {
      return;
    }

    const observers = this.observers.get(name)!;

    return observers.map(({ callback }) => {
      return callback(payload || event);
    });
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

    // Eh?
    add () { /** */ },

    async initialize () {
      // TODO: if anything tries to .publish before this is called, they should get rekt
      // Or it should be buffered, like in `reaco`

      await map(components, (component) => component(mediator));

      return mediator;
    },

    async kill () {
      await map(components, (component) => component.kill());
    },
  };
}

export interface IMediator<Events extends IEventSignatures> {
  _events: Events;

  observe <Es extends this['_events']['observations']> (event: Es, ...args: any[]): any;
  publish <Es extends this['_events']['publications']> (event: Es, payload: unknown): any;
}

export interface MergeComponentEvents<C extends IComponent<any>> {
  observations: C['observations'][number] | C['publications'][number];
  publications: C['observations'][number] | C['publications'][number];
}

export interface EventTuplesToUnion<E extends IComponentEvents> {
  observations: E['observations'][number];
  publications: E['publications'][number];
}

export interface IEventSignature { readonly name?: string; [k: string]: unknown; }

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

export interface IComponent<
  In extends IComponentSignature,
  M = SimpleMediator<EventTuplesToUnion<In>>,
> {
  (mediator: M): void | Promise<void>;

  name: In['name'];

  observations: In['observations'];
  publications: In['publications'];

  kill (): void | Promise<void>;
}
