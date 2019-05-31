import * as Debug from 'debug';
import * as Koa from 'koa';
import * as BodyParser from 'koa-bodyparser';
import * as Router from 'koa-router';
import { Component, EventAwaiter, EventSignature } from 'yaef';

import { HttpRequest, HttpResponse } from './httpEvents';
import { createHttpEventFromKoaContext } from './lib';

export const HttpServerStart = EventSignature('HttpServerStart');
export const HttpServerReady = EventSignature('HttpServerReady');
export const HttpServerAddRoute = EventSignature('HttpServerAddRoute', {} as { methods: string[], path: string });

// TODO: extend from a root debug for yaef.http package
const debug = Debug('HttpServer');

export function HttpServer ({ host, port }: {
  port: number,
  host: string,
}) {
  const router = new Router();
  const koa = new Koa()
    .use(BodyParser())
    .use(router.routes());

  return Component({
    name: 'HttpServer',
    observations: [HttpServerStart, HttpServerAddRoute],
    publications: [HttpServerReady, HttpRequest],
  }, (m) => {
    const waitForEvent = EventAwaiter(m, { timeout: 10000 });

    function addRoute ({ methods, path }: { methods: string[], path: string }) {
      router.register(path, methods, async (ctx, next) => {
        const requestEvent = createHttpEventFromKoaContext(ctx);

        m.publish(HttpRequest, requestEvent);
        debug({ requestEvent });

        try {
          const responseEvent = await waitForEvent(HttpResponse, ({ id }) => id === requestEvent.id);

          debug({ responseEvent });

          ctx.status = responseEvent.statusCode;
          ctx.body = responseEvent.body;
          ctx.set(responseEvent.headers || {});
        } catch {
          debug('failure to get response event');
          ctx.status = 500;
          ctx.body = 'Internal server error'; // TODO: fix this, make better
        }
      });
    }

    m.observe(HttpServerAddRoute, ({ methods, path }) => {
      addRoute({ methods, path });
    });

    m.observe(HttpServerStart, () => {
      koa.listen({ port, host }, () => {
        m.publish(HttpServerReady);
      });
    });
  });
}
