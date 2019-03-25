
export interface IObservations {
  observations: IEvent;
  publications: IEvent;
}
export type AnonComponent<E extends IObservations> = (mediator: Mediator<E>) => void

export interface IComponent<E extends IObservations> {
  (mediator: Mediator<E>): void
  
  observations: E['observations']
  publications: E['publications']
}

export function Component<E extends IObservations> (pubsub: E, cb: (mediator: Mediator<E>) => void) {}

export type IEventReturn<E extends IEvent> = E // TODO: stream

export class Mediator<E extends IObservations> {
  _events!: E;

  observe!: <Es extends this['_events']['observations']> (event: Es, cb: (event: Es) => any) => IEventReturn<Es>
  publish!: <Es extends this['_events']['publications']> (event: Es) => IEventReturn<Es>
}

export class RxJsMediator<E extends IObservations> extends Mediator<E> {
  
}


export type IEvent = unknown;
