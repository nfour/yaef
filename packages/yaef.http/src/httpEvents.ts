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

export const HttpRequestResponse = EventSignature('HttpResponse', {} as {
  _eventId: string;
  statusCode: number;
  body: any,
  headers: IStringDict,
});
