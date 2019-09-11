import { IRouterContext } from 'koa-router';
import { v4 as uuid } from 'uuid';

import { HttpRequest } from './httpEvents';
import { IHttpMethod, IInputLambdaHttpEvent, ILambdaHandlerInputArgs } from './types';

export function createHttpEventFromKoaContext ({
  request: {
    body, headers, method, path, query,
  },
  params,
}: IRouterContext) {
  const event: typeof HttpRequest = {
    _eventId: uuid(),
    name: 'HttpRequest',
    body, headers,
    path, query, params,
    method: method as IHttpMethod,
  };

  return event;
}

export function mapHttpRequestEventToLambdaEvent (
  event: typeof HttpRequest,
): IInputLambdaHttpEvent {
  return {
    body: JSON.stringify(event.body),
    headers: event.headers,
    httpMethod: event.method,
    path: event.path,
    pathParameters: event.params,
    queryStringParameters: event.query,
    requestContext: {},
  };
}

/**
 * Converts /foo/{bar}/baz to /foo/:bar/baz
 */
export function formatRoutePathParams (path: string) {
  return path.replace(/\{(\w+)\}/g, ':$1');
}

export function formatUrlPath (path: string) {
  return `/${path}`
    .replace(/\{(\w+)\}/g, ':$1') // From {foo} to :foo for koa-router
    .replace(/^\/\//, '/'); // Changes // to / at start
}

export function normalizeHttpHeaders (input: { [k: string]: string } = {}) {
  return Object.keys(input).reduce((obj, key) => {
    obj[key.toLowerCase()] = input[key];
    return obj;
  }, {} as { [k: string]: string });
}
