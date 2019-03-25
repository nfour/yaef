import { Component, Mediator } from './src';

interface IEvent {
  message: unknown
  reply?: unknown
}

class Event implements IEvent {
  message: unknown
  reply?: unknown
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
  subs: HttpResponseEvent
  pubs: GetHttpRequestEvent | PostHttpRequestEvent,
}> {}

HttpServer.prototype._pub;

class RestApi extends Component<{
  // Join them together here so that it is a subset instead of superset comparison
  // This can be done better with a helper type during the construction of Component, preferebly using unions so to preserver discrimination in TS
  subs: PostHttpRequestEvent | GetHttpRequestEvent
  // sub: PostHttpRequestEvent | GetHttpRequestEvent | typeof GetHttpRequestEvent | typeof PostHttpRequestEvent
  pubs: HttpResponseEvent
}> {
  constructor() {
    
  }
}

class HttpResponseEvent implements IEvent {
  message!: { body: string, headers: { 'content-length': number } }
}

const httpServer = new HttpServer();
const restApi = new RestApi()

// Failure, only http request events allowed. No components can be connected.
const httpRequestMediator = new Mediator<HttpRequestEvent>()

httpRequestMediator.connect(httpServer) // FAIL
httpRequestMediator.connect(restApi) // FAIL

// Failure.
// With a better type inferrence strategy we may make this work, but basic unions will not work for comparisons.
// May be able to create a type which can discriminate without the inaccuracy of an intersection.
const getHttpMediator = new Mediator<GetHttpRequestEvent|HttpResponseEvent>()

getHttpMediator.connect(httpServer) // FAIL but should PASS
getHttpMediator.connect(restApi) // FAIL but should PASS

// All events for each component are subset of either  HttpRequestEvent or HttpResponseEvent
const httpMediator = new Mediator<HttpRequestEvent|HttpResponseEvent>()

httpMediator.connect(httpServer) // PASS
httpMediator.connect(restApi) // PASS


void (async () => {
  const responseEvent = {
    message: { headers: {'content-length': 3 }, body: 'bar' }
  } as const;
  
  const fooBarEvent = {
    message: { method: 'GET', resource: '/foo' },
    reply: responseEvent
  } as const
  
  /** Using an exactly typed object literal as the sub symbol */
  restApi.sub(fooBarEvent, async ({ method, resource }) => {
    const isGet: typeof method = 'GET'
    const isFooxx: typeof resource = '/fooxx'
    const isPost: typeof method = 'POST'
  
    // return { message: { body: 'baz', headers: { "content-length": 3 } } }
    return responseEvent
  });

  /** Using a event class as the subscription symbol */
  restApi.sub(GetHttpRequestEvent, async (arg) => {
    arg.asdsa // Here the `arg` type is `unknown` because we are not correctly infer lambda checking inside .sub()
  })

  /** Await the reply here */
  /**
   * Not sure if this is good. May be better to ditch reply's as its not clear
   * how the logic would follow when multiple events attempt to reply
   * 
   * - Might just mean we return stream interface instead of a singular result
   */
  const reply = await httpMediator.publish(fooBarEvent)

  reply.message.body === 'bar'
  reply.message.headers['content-length'] === 3;

  reply.message.body === 'bars';
  reply.message.headers['content-length'] === 4;
})();



// Alternative container:
// Alternative container:
// Alternative container:
// Alternative container:

// TODO: need a way to auto-extract all of the types from the provided arguments and construct a
// Mediator from that
const MediatorFactory = (
  ...components: Component<{ sub: IEvent, pub: IEvent }>[]
): Mediator<typeof components[0]['_pub']> => undefined as any

// Ideally should infer all pub/sub from httpServer and restApi
const httpEventAlt = MediatorFactory(httpServer, restApi)

httpServer._pub
httpEventAlt.subs._pub


// Dependency injection?
// Dependency injection?
// Dependency injection?
// Dependency injection?

class Walk implements IEvent { message!: { a: 1 } }
class Sit implements IEvent { message!: { a: 2 } }
class Die implements IEvent { message!: { a: 3 } }

/** Inject the events from an abitrary Mediator ??? */
class Person extends Component<{ subs: typeof Walk|typeof Sit|Walk|Sit, pubs: Die }> {
  connect(mediator) {
    // Subbing using the event class
    mediator.sub(Walk, async (arg) => {
      arg.a === 2; // Here the `arg` type is `unknown` because we are not correctly infer lambda checking inside .sub()
      arg.a === 1;
    });
    


    mediator.sub({ message: { a: 3 } }, async () => {})

    mediator.sub(new Walk(), async (arg) => {
      arg.a === 2;
      arg.a === 1;

      mediator.pub(new Die())
    })
  }
}


const mediator = new Mediator();

// Should already be subbed to Walk and Sit from the injected mediator
const person = new Person()
const server = new HttpServer()

class HttpServerStartEvent {}

ConnectToMediator(mediator)(person)(server)

mediator.publish(HttpServerStartEvent)




