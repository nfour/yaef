
export interface IEventInput {
  observations: IEvent[];
  publications: IEvent[];
}

export type RefineEventInput<E extends IEventInput> = (
  {
    observations: E['observations'][number];
    publications: E['publications'][number];
  }
);

export interface IEventDeclaration {
  observations: IEvent;
  publications: IEvent;
}

export type AnonComponent<E extends IEventInput> = (mediator: Mediator<RefineEventInput<E>>) => void;

export interface IComponent<E extends IEventInput> {
  (mediator: Mediator<RefineEventInput<E>>): void;

  observations: E['observations'];
  publications: E['publications'];
}

export function Component<E extends IEventInput> (
  eventInput: E,
  cb: (mediator: Mediator<RefineEventInput<E>>) => void): IComponent<E> {
  // ...

  return {} as any;
}

/** TODO: */
export type IEventReturn<E extends IEvent> = E; // TODO: stream

export class Mediator<E extends IEventDeclaration> {
  _events!: E;

  observe!: <Es extends this['_events']['observations']> (event: Es, cb?: (event: Es) => any) => IEventReturn<Es>;
  publish!: <Es extends this['_events']['publications']> (event: Es) => IEventReturn<Es>;
}

export type IEvent = unknown;
