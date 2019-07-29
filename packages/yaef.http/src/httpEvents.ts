import { EventSignature } from 'yaef';

import { IHttpMethod, IStringDict } from './types';

export const HttpRequest = EventSignature('HttpRequest', {} as {
  _eventId: string;
  body: any,
  headers: IStringDict,
  path: string,
  query: IStringDict,
  params: IStringDict,
  method: IHttpMethod,
});

export const PrepareHttpRequest = EventSignature('PrepareHttpRequest', {} as typeof HttpRequest);

export const HttpRequestResponse = EventSignature('HttpResponse', {} as {
  _eventId: string;
  statusCode: number;
  body: unknown,
  headers: IStringDict,
});
