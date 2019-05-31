import { EventSignature } from 'yaef';

import { IHttpMethod, IStringDict } from './types';

export const HttpRequest = EventSignature('HttpRequest', {} as {
  id: string;
  body: any,
  headers: IStringDict,
  path: string,
  query: IStringDict,
  params: IStringDict,
  method: IHttpMethod,
});

export const HttpResponse = EventSignature('HttpResponse', {} as {
  id: string;
  statusCode: number;
  body: any,
  headers: IStringDict,
});
