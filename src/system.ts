
export class Component<E extends {
  sub: IEvent;
  pub: IEvent;
}> {
  /** These are defined so the input can be inspected */
  _sub!: E['sub']
  _pub!: E['pub']

  /**
   * Subscribe to an event from a connected Mediator.
   * 
   * The `EventInterface` object is not accessed, it serves as type constraints
   * 
   * TODO: infer type so that we can support both sub event shapes
   * 
   * @example this.sub(EventInterface, (message) => reply)
   */
  sub: <Es extends E['sub']> (event: Es, cb: (message: Es['message']) => Promise<Es['reply']>) => this = () => {
    return {} as any
  }

  /**
   * Publish an event (as an event object) to an attached Mediator.
   * 
   * @example const reply = await this.pub(eventObject)
   */
  pub: <Es extends E['pub']> (event: Es) => Promise<Es['reply']> = () => {
    return {} as any
  }
}

export class Mediator<E extends IEvent> {
  _components!: Component<{ sub: E, pub: E }>;

  connect(component: this['_components']) {}
  sub!: <Es extends E> (event: Es, cb: (arg: Es['message']) => Promise<Es['reply']>) => this
  pub!: <Es extends E> (event: Es) => Promise<Es['reply']>
}

export interface IEvent {
  message: unknown
  reply?: unknown
}

export class Event implements IEvent {
  message: unknown
  reply?: unknown
}

