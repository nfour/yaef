import * as QueryString from 'qs';
import { v4 as uuid } from 'uuid';
import { Component, ComponentSignature, EventAwaiter } from 'yaef';

import { HttpRequest, HttpRequestResponse, PrepareHttpRequest } from './httpEvents';
import { normalizeHttpHeaders } from './lib';
import { IHttpBody, IInputLambdaHttpEvent, ILambdaHttpHandler } from './types';

export const AwsLambdaHttpHandlerSignature = ComponentSignature('AwsLambdaHttpLambda', {
  observations: [HttpRequestResponse, HttpRequest],
  publications: [PrepareHttpRequest, HttpRequestResponse, HttpRequest],
});

export type IAwsLambdaHttpResponse = (
  Partial<Pick<typeof HttpRequestResponse, 'body' | 'headers'>>
  & Pick<typeof HttpRequestResponse, 'statusCode'>
);

export type IAwsLambdaHttpHandlerCb = (event: typeof HttpRequest) => Promise<IAwsLambdaHttpResponse> | IAwsLambdaHttpResponse;

/**
 * todo:
 * - make a wrapper for existing handler funcs to wrap with this component
 */
export function AwsLambdaHttpHandler (userCallback: IAwsLambdaHttpHandlerCb) {
  let invoke: ILambdaHttpHandler | undefined;

  const component = Component(AwsLambdaHttpHandlerSignature, (m) => {
    const waitFor = EventAwaiter(m, { timeout: 10000 });

    async function onHttpRequest (requestEvent: typeof HttpRequest) {
      const responseObject = await userCallback(requestEvent);

      const { _eventId } = requestEvent;

      m.publish(HttpRequestResponse, {
        body: undefined,
        headers: {},
        ...responseObject,
        _eventId,
      });

      return requestEvent;
    }

    m.observe(HttpRequest, onHttpRequest);

    invoke = async (inputEvent, context, done) => {
      const requestEvent = createHttpRequestEventFromAwsLambdaEvent(inputEvent);

      const responsePromise = waitFor(HttpRequestResponse, ({ _eventId }) => _eventId === requestEvent._eventId);

      m.publish(HttpRequest, requestEvent);

      const responseEvent = await responsePromise;

      const headers = normalizeHttpHeaders(responseEvent.headers);
      const body = serializeBodyByContentType(responseEvent.body, headers['content-type'] || requestEvent.headers.accept);

      done(null, {
        body, headers,
        statusCode: responseEvent.statusCode,
      });

      return responseEvent as any;
    };

  });

  const handler: ILambdaHttpHandler = (...args) => {
    if (!invoke) {
      // TODO: set the callstack on this error to where the handler is defined
      throw new Error('AwsLambdaHttpHandler component must be initialized before the handler is invoked');
    }

    return invoke(...args);
  };

  return { handler, component };
}

function createHttpRequestEventFromAwsLambdaEvent (event: IInputLambdaHttpEvent) {
  const {
    pathParameters: params,
    httpMethod: method,
    path,
  } = event;

  const query = QueryString.parse(
    QueryString.stringify(event.pathParameters || {}, { encode: false }),
  );

  const headers = normalizeHttpHeaders(event.headers);

  const body: IHttpBody = deserializeBodyByContentType(event.body, headers['content-type']);

  const httpRequestEvent: typeof HttpRequest = {
    name: 'HttpRequest',
    _eventId: uuid(),
    headers, query, params,
    body, method, path,
  };

  return httpRequestEvent;
}

function deserializeBodyByContentType (body: any, contentType?: string) {
  if (body && contentType && /\bapplication\/.*json\b/.test(contentType)) {
    try {
      return JSON.parse(body);
    } catch (err) {
      throw new Error('Malformed JSON body');
    }
  }

  return body;
}

function serializeBodyByContentType (body: any, contentType?: string) {
  if (body && contentType && /\bapplication\/.*json\b/.test(contentType)) {
    return JSON.stringify(body);
  }

  return body;
}
