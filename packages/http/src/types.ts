//
// Misc
//

export interface IStringDict { [key: string]: string; }

//
// Event
//

export interface IRequestEvent {
  /**
   * @format uuid
   */
  id: string;
  error: Error | undefined;
}

//
// HTTP
//

export type IHttpMethod = (
  'GET' | 'PUT' | 'POST' | 'DELETE' | 'PATCH' | 'HEAD'
);

export type IHttpBody = string | {};

export interface IHttpRequest {
  headers: IStringDict;
  query: IStringDict;
  params: IStringDict;
  method: IHttpMethod;
  path: string;
  body: IHttpBody;
}

export interface IHttpRequestResponse {
  statusCode: number;
  headers?: IStringDict;
  body?: IHttpBody;
}

export interface IHttpRequestEvent extends IRequestEvent {
  request: IHttpRequest;
  response: IHttpRequestResponse;
}

//
// Lambda
//

export interface IInputLambdaHttpEvent {
  headers: IStringDict;
  pathParameters: IStringDict;
  httpMethod: IHttpMethod;
  queryStringParameters: IStringDict;
  requestContext: { [key: string]: any };
  body: string;
  path: string;
  resource: string;
}

export interface IInputLambdaHttpContext {
  [key: string]: any;
}

export type ILambdaCompleter<E = Error, R = any> = (error: E | null | undefined, response?: R) => void;

export interface ILambdaHandlerGenerics {
  event: {};
  context?: {};
  response: {};
  error?: {};
}

export type ILambdaHandler<G extends ILambdaHandlerGenerics> = (
  event: G['event'],
  context: G['context'],
  done: ILambdaCompleter<G['error'], G['response']>,
) => Promise<G['response']>;

export type IGetLambdaHandlerInputArgs<G extends ILambdaHandlerGenerics> = [
  G['event'],
  G['context'],
  ILambdaCompleter<G['error'], G['response']>
];

export interface ILambdaHttpDefinition {
  event: IInputLambdaHttpEvent;
  context: IInputLambdaHttpContext;
  response: IHttpRequestResponse;
  error: Error;
}

export type ILambdaHttpHandler = ILambdaHandler<ILambdaHttpDefinition>;
export type ILambdaHandlerInputArgs = IGetLambdaHandlerInputArgs<ILambdaHttpDefinition>;
