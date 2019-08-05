import { map } from 'bluebird';

import { IEventSignature, IEventSignatures, Omit } from './';
import { createDebug, createUniqueId } from './debug';
import { SimpleMediator } from './mediation';

export function Component<
  E extends IComponentSignature
> (
  input: E,
  callback: (mediator: SimpleMediator<EventTuplesToUnion<E>>) => void,
): IComponent<E> {
  const debug = createDebug('Component', createUniqueId());

  const component = <IComponent<E>> ((mediator) => callback(mediator));

  type ComponentPropConstraints = { [K in keyof IComponent<any>]: any };

  Object.defineProperties(component, <ComponentPropConstraints> {
    name: { value: input.name, writable: false },
    observations: { value: input.observations, writable: false },
    publications: { value: input.publications, writable: false },
    disconnect: { value: () => { /**/ } }, // TODO: make this useful?
  });

  debug(`New %o`, component.name);

  return component;
}

/**
 * TODO: Support `Mediator` property, so one can construct from arbitrary IMediator conformant interfaces
 */
export function ComponentMediator<C extends IComponent<any>> ({ components }: { components: C[] }) {
  const debug = createDebug(`ComponentMediator`, createUniqueId());

  debug(`New with components: %o`, components.map(({ name }) => name));

  /** This should be part of the input as well */
  const mediator = new SimpleMediator<MergeComponentEvents<C>>();

  return {
    mediator,
    async connect () {
      // TODO: if anything tries to .publish before this is called, they should get rekt
      // Or it should be buffered, like in `reaco`
      debug(`Connecting...`);

      await map(components, (component) => component(mediator));

      debug(`Connected`);
      return mediator;
    },
    async disconnect () {
      debug(`Disconnecting...`);
      await map(components, (component) => component.disconnect());
      debug(`Disconnected`);
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

export interface MergeComponentEvents<C extends IComponent<any>> {
  observations: C['observations'][number] | C['publications'][number];
  publications: C['observations'][number] | C['publications'][number];
}

export interface EventTuplesToUnion<E extends IComponentEvents> {
  observations: E['observations'][number];
  publications: E['publications'][number];
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
