import * as Koa from 'koa';
import * as BodyParser from 'koa-bodyparser';
import * as Router from 'koa-router';
import { Component, EventSignature } from 'yaef';

import { HttpRequest } from './httpEvents';

export const HttpServerStart = EventSignature('HttpServerStart');
export const HttpServerReady = EventSignature('HttpServerReady');
export const HttpServerAddRoute = EventSignature('HttpServerAddRoute', {} as { methods: string[], path: string });

export function HttpServer ({ host, port }: {
  port: number,
  host: string,
}) {
  const router = new Router();
  const koa = new Koa()
    .use(BodyParser())
    .use(router.routes());

  function addRoute ({ methods, path }: { methods: string[], path: string }) {
    router.register(path, methods, async (ctx, next) => {

      // TODO: write a `waitForEvent` which takes an event sig and returns a promise, has a timeout etc. and callback

      // const { response } = event;

      // if (!response) { return; }

      // ctx.status = response.statusCode;
      // ctx.body = response.body;
      // ctx.set(response.headers || {});
    });
  }

  /**
   * TODO:
   * - How is the best way to do the Route -> Request -> Response lifecycle with events?
   * - Request `id` ?
   * - A more complex mediator with replying ?
   */

  return Component({
    name: 'HttpServer',
    observations: [HttpServerStart, HttpServerAddRoute],
    publications: [HttpServerReady, HttpRequest],
  }, (m) => {
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
