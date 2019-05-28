import * as Koa from 'koa';
import * as BodyParser from 'koa-bodyparser';
import * as Router from 'koa-router';
import { Component, EventSignature } from 'yaef';

export const HttpRequest = EventSignature('HttpRequest');
export const HttpServerStart = EventSignature('HttpServerStart');
export const HttpServerReady = EventSignature('HttpServerReady');
export const HttpServerAddRoute = EventSignature<{ methods: string[], path: string }>('HttpServerAddRoute');

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

      // const { response } = event;

      // if (!response) { return; }

      // ctx.status = response.statusCode;
      // ctx.body = response.body;
      // ctx.set(response.headers || {});
    });
  }

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
