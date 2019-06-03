import * as QueryString from 'qs';
import { v4 as uuid } from 'uuid';
import { Component, ComponentSignature, EventAwaiter } from 'yaef';

import { HttpRequest, HttpRequestResponse } from './httpEvents';
import { normalizeHttpHeaders } from './lib';
import { IHttpBody, IInputLambdaHttpEvent, ILambdaHttpHandler } from './types';

export const AwsLambdaHttpHandlerSignature = ComponentSignature('AwsLambdaHttpLambda', {
  observations: [HttpRequestResponse],
  publications: [HttpRequest],
});

export function AwsLambdaHttpHandler (handler) {

  return Component(AwsLambdaHttpHandlerSignature, (m) => {
    const waitFor = EventAwaiter(m, { timeout: 10000 });

    const handler: ILambdaHttpHandler = async (inputEvent, context, done) => {
      const requestEvent = createHttpRequestEventFromAwsLambdaEvent(inputEvent);

      m.publish(requestEvent);

      /**
       * TODO: need to call the handler, use its response as responseEvent, publish that, wait for it?
       */

      const responseEvent = await waitFor(
        HttpRequestResponse,
        ({ _eventId }) => _eventId === requestEvent._eventId,
      );

      done(null, {
        statusCode: responseEvent.statusCode,
        body: responseEvent.body,
        headers: responseEvent.headers,
      });

      return responseEvent;
    };
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
