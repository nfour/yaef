interface IEvent {
  message: unknown
  reply?: unknown
}

class Component<E extends {
  sub: IEvent;
  pub: IEvent;
}> {
  _sub!: E['sub']
  _pub!: E['pub']

  sub!: <Es extends E['sub']> (event: Es, cb: (arg: Es['message']) => Promise<Es['reply']>) => this
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
  sub: PostHttpRequestEvent | GetHttpRequestEvent // Join them together here so that it is a subset instead of superset comparison
  // This can be done better with a helper type during the construction of Component, preferebly using unions so to preserver discrimination in TS
  pub: HttpResponseEvent
}> {}

class HttpResponseEvent implements IEvent {
  message!: { body: string, headers: { 'content-length': number } }
}

const httpServer = new HttpServer();
const restApi = new RestApi()

// All events for each component are subset of either  HttpRequestEvent or HttpResponseEvent
const httpEvents = new EventContainer<HttpRequestEvent|HttpResponseEvent>()

httpEvents.connect(httpServer) // PASS
httpEvents.connect(restApi) // PASS

// Failure, only http request events allowed. No components can be connected.
const httpRequestEvents = new EventContainer<HttpRequestEvent>()

httpRequestEvents.connect(httpServer) // FAIL
httpRequestEvents.connect(restApi) // FAIL

// Failure. With a better type inferrence strategy we may make this work
const getHttpEventResponder = new EventContainer<GetHttpRequestEvent|HttpResponseEvent>()

getHttpEventResponder.connect(httpServer) // FAIL
getHttpEventResponder.connect(restApi) // FAIL


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

  const result = await httpEvents.pub(fooBarEvent)

  result.message.body === 'bar'
  result.message.headers['content-length'] === 3;

  result.message.body === 'bars';
  result.message.headers['content-length'] === 4;
})();


