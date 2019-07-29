import { AwsLambdaHttpHandler } from '../AwsLambdaHttpHandler';
import { IInputLambdaHttpEvent } from '../types';

const dumbLambdaEvent: IInputLambdaHttpEvent = {
  body: '',
  headers: {},
  httpMethod: 'GET',
  path: '/',
  pathParameters: {},
  queryStringParameters: {},
  requestContext: {},
};

test('The handler can be invoked in the same way as the AWS Lambda call signatures', async () => {
  const { handler, component } = AwsLambdaHttpHandler((event) => {
    return {
      statusCode: 200,
    };
  });

  const doneFn = jest.fn();

  const response = await handler(dumbLambdaEvent, {}, doneFn);
});
