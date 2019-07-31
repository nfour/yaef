import { delay } from 'bluebird';
import { ComponentMediator } from 'yaef';

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
