interface IEvent {
  message: unknown
  reply?: unknown
}

class Event implements IEvent {
  message: unknown
  reply?: unknown
}

class Component<E extends {
  sub: IEvent|typeof Event;
  pub: IEvent;
}> {
  /** These are defined so the input can be inspected */
  _sub!: E['sub']
  _pub!: E['pub']

  /**
   * Subscribe to an event from a connected EventContainer.
   * 
   * The `EventInterface` object is not accessed, it serves as type constraints
   * 
   * @example this.sub(EventInterface, (message) => reply)
   */
  sub!: <Es extends E['sub']> (event: Es, cb: (message: Es['message']) => Promise<Es['reply']>) => this

  /**
   * Publish an event (as an event object) to an attached EventContainer.
   * 
   * @example const reply = await this.pub(eventObject)
   */
  pub!: <Es extends E['pub']> (event: Es) => Promise<Es['reply']>

}
class EventContainer<E extends IEvent> {
  _components!: Component<{ sub: E, pub: E }>;

  connect(component: this['_components']) {}
  sub!: <Es extends E> (event: Es, cb: (arg: Es['message']) => Promise<Es['reply']>) => this
  pub!: <Es extends E> (event: Es) => Promise<Es['reply']>
}

class HttpRequestEvent implements IEvent {
  message!: { method: string, resource: string }

  /** In this example, all HttpRequestEvent's must be replied to with a the shape of a HttpResponseEvent */
  reply!: HttpResponseEvent
}

class PostHttpRequestEvent implements HttpRequestEvent {
  message!: { method: "POST", resource: string, body: string }
  reply!: HttpResponseEvent

}

class GetHttpRequestEvent implements HttpRequestEvent {
  message!: { method: "GET", resource: string }
  reply!: HttpResponseEvent
}

class HttpServer extends Component<{
  sub: HttpResponseEvent
  pub: GetHttpRequestEvent | PostHttpRequestEvent,
}> {}

class RestApi extends Component<{
  // Join them together here so that it is a subset instead of superset comparison
  // This can be done better with a helper type during the construction of Component, preferebly using unions so to preserver discrimination in TS
  sub: PostHttpRequestEvent | GetHttpRequestEvent | typeof GetHttpRequestEvent | typeof PostHttpRequestEvent
  pub: HttpResponseEvent
}> {}

class HttpResponseEvent implements IEvent {
  message!: { body: string, headers: { 'content-length': number } }
}

const httpServer = new HttpServer();
const restApi = new RestApi()

// Failure, only http request events allowed. No components can be connected.
const httpRequestEvents = new EventContainer<HttpRequestEvent>()

httpRequestEvents.connect(httpServer) // FAIL
httpRequestEvents.connect(restApi) // FAIL

// Failure.
// With a better type inferrence strategy we may make this work, but basic unions will not work for comparisons.
// May be able to create a type which can discriminate without the inaccuracy of an intersection.
const getHttpEventResponder = new EventContainer<GetHttpRequestEvent|HttpResponseEvent>()

getHttpEventResponder.connect(httpServer) // FAIL
getHttpEventResponder.connect(restApi) // FAIL

// All events for each component are subset of either  HttpRequestEvent or HttpResponseEvent
const httpEvents = new EventContainer<HttpRequestEvent|HttpResponseEvent>()

httpEvents.connect(httpServer) // PASS
httpEvents.connect(restApi) // PASS


void (async () => {
  const responseEvent = {
    message: { headers: {'content-length': 3 }, body: 'bar' }
  } as const;
  
  const fooBarEvent = {
    message: { method: 'GET', resource: '/foo' },
    reply: responseEvent
  } as const
  
  restApi.sub(fooBarEvent, async ({ method, resource }) => {
    const isGet: typeof method = 'GET'
    const isFooxx: typeof resource = '/fooxx'
    const isPost: typeof method = 'POST'
  
    // return { message: { body: 'baz', headers: { "content-length": 3 } } }
    return responseEvent
  });

  restApi.sub(GetHttpRequestEvent, () => {

  })

  const result = await httpEvents.pub(fooBarEvent)

  result.message.body === 'bar'
  result.message.headers['content-length'] === 3;

  result.message.body === 'bars';
  result.message.headers['content-length'] === 4;
})();



// Alternative container:
// Alternative container:
// Alternative container:
// Alternative container:

// TODO: need a way to auto-extract all of the types from the provided arguments and construct a
// EventContainer from that
const EventContainerFactory = (
  ...components: Component<{ sub: IEvent, pub: IEvent }>[]
): EventContainer<typeof components[0]['_pub']> => undefined as any

// Ideally should infer all pub/sub from httpServer and restApi
const httpEventAlt = EventContainerFactory(httpServer, restApi)

httpServer._pub
httpEventAlt._components._pub


// Dependency injection?
// Dependency injection?
// Dependency injection?
// Dependency injection?

class Walk implements IEvent { message!: { a: 1 } }
class Sit implements IEvent { message!: { a: 2} }
class Die implements IEvent { message!: { a: 3 } }

/** Inject the events from a EventLib's EventContainer ??? */
@EventLib.Event(Walk, Sit)
class Person extends Component<{ sub: typeof Walk|typeof Sit|Walk|Sit, pub: Die }> {
  constructor() {
    super();

    // Subbing using the event class
    this.sub(Walk, async (arg) => {
      arg.a === 2; // Here the `arg` type is `unknown` because we are not correctly infer lambda checking inside .sub()
      arg.a === 1;
    });

    this.sub({ message: { a: 3 } }, async () => {})

    this.sub({ message: { a: 2 } }, async (arg) => {
      arg.a === 2;
      arg.a === 1;
    })
  }
}

const person = new Person()

