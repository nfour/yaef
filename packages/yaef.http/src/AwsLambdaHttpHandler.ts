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

export type IAwsLambdaHttpResponse = Pick<typeof HttpRequestResponse, 'body' | 'headers' | 'statusCode'>;
export type IAwsLambdaHttpHandlerCb = (event: typeof HttpRequest) => Promise<IAwsLambdaHttpResponse> | IAwsLambdaHttpResponse;

export function AwsLambdaHttpHandler (userCallback: IAwsLambdaHttpHandlerCb) {
  return Component(AwsLambdaHttpHandlerSignature, (m) => {
    const waitFor = EventAwaiter(m, { timeout: 10000 });

    async function useHttpRequest (requestEvent: typeof HttpRequest) {
      const responseObject = await userCallback(requestEvent);

      const { _eventId } = requestEvent;

      return m.publish(HttpRequestResponse, { ...responseObject, _eventId });
    }

    m.observe(HttpRequest, useHttpRequest);

    const handler: ILambdaHttpHandler = async (inputEvent, context, done) => {
      const requestEvent = createHttpRequestEventFromAwsLambdaEvent(inputEvent);

      const matchEventIdOnEvent = ({ _eventId }: Pick<typeof HttpRequest, '_eventId'>) => _eventId === requestEvent._eventId;
      const responseEvent = await waitFor(HttpRequestResponse, matchEventIdOnEvent);

      /**
       * TODO:
       * - need to be able to hook into the request event somehow...
       *   - create a new mediator which can `await` events?
       *   - create a new mediator that can queue event listeners based on declared priority?
       */

      done(null, {
        statusCode: responseEvent.statusCode,
        body: responseEvent.body,
        headers: responseEvent.headers,
      });

      return responseEvent;
    };

    return handler;
  });
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

  const body: IHttpBody = (() => {
    // If content-type is JSON, try to parse it
    if (event.body && /\bapplication\/.*json\b/.test(headers['content-type'] || '')) {
      try {
        return JSON.parse(event.body);
      } catch (err) {
        throw new Error('Malformed JSON body');
      }
    }

    return event.body;
  })();

  const httpRequestEvent: typeof HttpRequest = {
    name: 'HttpRequest',
    _eventId: uuid(),
    headers, query, params,
    body, method, path,
  };

  return httpRequestEvent;
}
