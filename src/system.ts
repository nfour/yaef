import './types';

import { map } from 'bluebird';

import { ErrorFromCallPoint } from './lib';

export interface IEvent { readonly name?: string; [k: string]: unknown; }

export type IEventShapes = UnionToIntersection<IEvent>;

export interface IEvents {
  observations: IEvent;
  publications: IEvent;
}

export interface IEventInputs<V extends any = IEvent> {
  observations: V[];
  publications: V[];
}

export type AnonComponent<Events extends IEvents> = (mediator: SimpleMediator<Events>) => void;

export interface IComponent<Events extends IEventInputs, M = SimpleMediator<EventTuplesToUnion<Events>>> {
  // configuration: Configuration; ???

  (mediator: M): void | Promise<void>;
  readonly name?: string;

  observations: Events['observations'];
  publications: Events['publications'];

  kill (): void | Promise<void>;
}

export function Component<E extends IEventInputs> (
  eventInput: E,
  callback: (mediator: SimpleMediator<EventTuplesToUnion<E>>) => void,
): IComponent<E> {
  const component = <IComponent<E>> ((mediator) => callback(mediator));

  component.observations = eventInput.observations;
  component.publications = eventInput.publications;

  /** TODO: Need a way to un-listen */
  component.kill = () => { /**/ };

  return component;
}

export interface IMediator<Events extends IEvents> {
  _events: Events;

  observe <Es extends this['_events']['observations']> (event: Es, ...args: any[]): any;
  publish <Es extends this['_events']['publications']> (event: Es, payload: unknown): any;
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

export class SimpleMediator<Events extends IEvents> implements IMediator<Events> {
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
export function ComponentMediator<C extends IComponent<any>> ({ components }: {
  components: C[],
}) {
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

interface MergeComponentEvents<C extends IComponent<any>> {
  observations: C['observations'][number];
  publications: C['observations'][number];
}

// Helpers. Move to ./types.ts later if any are necessary

export interface EventTuplesToUnion<E extends IEventInputs> {
  observations: E['observations'][number];
  publications: E['publications'][number];
}
