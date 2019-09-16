import { IRouterContext } from 'koa-router';
import { v4 as uuid } from 'uuid';

import { HttpRequest } from './httpEvents';
import { IHttpMethod, IInputLambdaHttpEvent, ILambdaHandlerInputArgs } from './types';

export function createHttpEventFromKoaContext (
  {
    request: { body, headers, method, path, query },
    params,
  }: IRouterContext,
  { resource }: { resource: string},
) {
  const event: typeof HttpRequest = {
    _eventId: uuid(),
    name: 'HttpRequest',
    method: method as IHttpMethod,
    resource: normalizeUrlPath(resource),
    body, headers,
    path, query, params,
  };

  return event;
}

export function mapHttpRequestEventToLambdaEvent (
  e: typeof HttpRequest,
): IInputLambdaHttpEvent {
  return {
    body: JSON.stringify(e.body),
    headers: e.headers,
    httpMethod: e.method,
    path: e.path,
    pathParameters: e.params,
    queryStringParameters: e.query,
    resource: normalizeUrlPath(e.resource),
    requestContext: {},
  };
}

/** Formats from LambdaHttp's `/foo/{bar}/baz` to Koa router's `/foo/:bar/baz` */
export function normalizeUrlPath (path: string) {
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
