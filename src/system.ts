
export type IEvent = unknown;

export interface IComponentEvents {
  observations: IEvent;
  publications: IEvent;
}

export type RefineEventInput<E extends IComponentEvents> = (
  {
    observations: E['observations'][number];
    publications: E['publications'][number];
  }
);

export type AnonComponent<Events extends IComponentEvents> = (mediator: IMediator<RefineEventInput<Events>>) => void;

export interface IComponent<Events extends IComponentEvents> {
  readonly name?: string;
  // configuration: Configuration; ???

  (mediator: IMediator<RefineEventInput<Events>>): void;

  observations: Events['observations'];
  publications: Events['publications'];
}

export function Component<E extends IComponentEvents> (
  eventInput: E,
  cb: (mediator: IMediator<RefineEventInput<E>>) => void): IComponent<E> {
  // ...

  return {} as any;
}

/** TODO: */
export type IEventReturn<E extends IEvent> = E; // TODO: stream

export interface IMediatedEvents {
  observations: IEvent;
  publications: IEvent;
}

export interface IMediator<Events extends IMediatedEvents> {
  _events: Events;

  observe: <Es extends this['_events']['observations']> (event: Es, cb?: (event: Es) => any) => IEventReturn<Es>;
  publish: <Es extends this['_events']['publications']> (event: Es) => IEventReturn<Es>;
}
