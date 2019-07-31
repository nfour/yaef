import { delay } from 'bluebird';
import { Component, ComponentMediator } from 'yaef';

import { HttpRequest } from '../';
import { AwsLambdaHttpHandler } from '../AwsLambdaHttpHandler';
import { IInputLambdaHttpEvent, ILambdaHandler } from '../types';

const dumbLambdaEvent: IInputLambdaHttpEvent = {
  body: '',
  headers: {},
  httpMethod: 'GET',
  path: '/',
  pathParameters: {},
  queryStringParameters: {},
  requestContext: {},
};

function invokeHandler (handler: ILambdaHandler<any>, event: any) {
  return new Promise((resolve, reject) => handler(event, {}, (err, response) => {
    if (err) { return reject(err); }
    resolve(response);
  }));
}

test('The handler can be invoked in the same way as the AWS Lambda call signatures', async () => {
  const { handler, component } = AwsLambdaHttpHandler(async () => {
    await delay(5);

    return {
      statusCode: 214,
      body: { foo: 'bar' },
      headers: { 'content-type': 'application/json' },
    };
  });

  await ComponentMediator({ components: [component] }).connect();

  const response = await invokeHandler(handler, dumbLambdaEvent);

  expect(response).toEqual(<typeof response> {
    statusCode: 214,
    body: JSON.stringify({ foo: 'bar' }),
    headers: { 'content-type': 'application/json' },
  });
});

test('Errors when the component has not been initialized yet handler is called anyway', async () => {
  const { handler } = AwsLambdaHttpHandler(async () => ({} as any));

  await expect(invokeHandler(handler, dumbLambdaEvent))
    .rejects
    .toThrow('AwsLambdaHttpHandler component must be initialized before the handler is invoked');
});

test('Can hook into the flow, adding middlewares before and after certain events', async () => {
  const { handler, component: handlerComponent } = AwsLambdaHttpHandler((event) => {
    // Sends the request headers to the response so we can check them.
    return { statusCode: 200, headers: event.headers };
  });

  const addFooHeader = Component({ name: 'AddFooHeader', observations: [HttpRequest], publications: [] }, (m) => {
    m.observe(HttpRequest, (event) => {
      return {
        ...event,
        headers: {
          ...event.headers,
          foo: 'bar',
        },
      };
    });
  });

  await ComponentMediator({ components: [handlerComponent, addFooHeader] }).connect();

  const response = await invokeHandler(handler, dumbLambdaEvent);

  expect(response).toEqual(<typeof response> {
    statusCode: 200,
    body: undefined,
    headers: { foo: 'bar' },
  });
});

// test('Concurrent events are not affected by each other')
// test('Many sequential events do not interact with each other or middlewares')

// TODO: refine concept of atomic event handlers. Should mutation be unnecessary?
