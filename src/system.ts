
export type IEvent = unknown;

export interface IEvents {
  observations: IEvent;
  publications: IEvent;
}

export interface IEventInputs {
  observations: IEvent[];
  publications: IEvent[];
}

export interface EventTuplesToUnion<E extends IEventInputs> {
  observations: E['observations'][number];
  publications: E['publications'][number];
}

export type TupleToUnion<T extends unknown[]> = T[number];
export type TupleToUnionList<T extends unknown[]> = Array<T[number]>;
export type TupleToPartialIntersection<T extends unknown[]> = UnionToPartialIntersection<TupleToUnion<T>>;
export type TupleToIntersection<T extends unknown[]> = UnionToIntersection<TupleToUnion<T>>;
export type TupleToIntersectionList<T extends unknown[]> = Array<TupleToIntersection<T>>;
export type TupleToPartialIntersectionList<T extends unknown[]> = Array<TupleToPartialIntersection<T>>;
export type UnionToIntersection<U> = (
  (U extends any
    ? (k: U) => void
    : never) extends (k: infer I) => void
      ? I
      : never
);
export type UnionToPartialIntersection<U> = (
  (U extends any
    ? (k: U) => void
    : never) extends (k: infer I) => void
      ? Partial<I>
      : never
);

export type AnonComponent<Events extends IEvents> = (mediator: IMediator<Events>) => void;

export interface IComponent<Events extends IEventInputs> {
  readonly name?: string;
  // configuration: Configuration; ???

  (mediator: IMediator<EventTuplesToUnion<Events>>): void;

  observations: Events['observations'];
  publications: Events['publications'];
}

export function Component<E extends IEventInputs> (
  eventInput: E,
  callback: (mediator: IMediator<EventTuplesToUnion<E>>) => void,
): IComponent<E> {
  // ...

  return {} as any;
}

/** TODO: */
export type IEventReturn<E extends IEvent> = E; // TODO: stream

export interface IMediator<Events extends IEvents> {
  _events: Events;

  observe: <Es extends this['_events']['observations']> (event: Es, cb?: (event: Es) => any) => IEventReturn<Es>;
  publish: <Es extends this['_events']['publications']> (event: Es) => IEventReturn<Es>;
}

export type IMediatedEventInput = IEvent[];
export function Mediator<E extends IMediatedEventInput> (...events: E) {
  type C = Array<IComponent<{
    observations: TupleToIntersectionList<E>,
    publications: TupleToIntersectionList<E>,
  }>>;

  const fn = (...component: C) => {
    return fn;
  };

  return fn;
}
