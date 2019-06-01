import * as Debug from 'debug';
import * as Koa from 'koa';
import * as BodyParser from 'koa-bodyparser';
import * as Router from 'koa-router';
import { Component, ComponentSignature, EventAwaiter, EventSignature } from 'yaef';

import { HttpRequest, HttpRequestResponse } from './httpEvents';
import { createHttpEventFromKoaContext } from './lib';

// State changes:
export const KoaHttpServerReady = EventSignature('KoaHttpServerReady');
export const KoaHttpServerStopped = EventSignature('KoaHttpServerStopped');

// Actions:
export const StartKoaHttpServer = EventSignature('StartKoaHttpServer');
export const StopKoaHttpServer = EventSignature('StopKoaHttpServer');
export const AddRouteToKoaHttpServer = EventSignature('AddRouteToKoaHttpServer', {} as {
  methods: string[],
  path: string,
});

// TODO: extend from a root debug for yaef.http package
const debug = Debug('KoaHttpServer');

export const KoaHttpServerSignature = ComponentSignature('KoaHttpServer', {
  observations: [StartKoaHttpServer, AddRouteToKoaHttpServer, HttpRequestResponse, StopKoaHttpServer],
  publications: [KoaHttpServerReady, KoaHttpServerStopped, HttpRequest],
});

export function KoaHttpServer ({ host, port }: {
  port: number,
  host: string,
}) {
  const router = new Router();
  const koa = new Koa()
    .use(BodyParser())
    .use(router.routes());

  let server: import('http').Server | undefined;

  return Component(KoaHttpServerSignature, (m) => {
    const waitForEvent = EventAwaiter(m, { timeout: 10000 });

    function addRoute ({ methods, path }: { methods: string[], path: string }) {
      router.register(path, methods, async (ctx, next) => {
        const requestEvent = createHttpEventFromKoaContext(ctx);

        m.publish(HttpRequest, requestEvent);
        debug({ requestEvent });

        try {
          // Waits for HttpRequestResponse events, and only resolves when the filter matches the id
          const responseEvent = await waitForEvent(
            HttpRequestResponse,
            ({ _eventId: id }) => id === requestEvent._eventId,
          );

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

    function stopServer () {
      if (!server) { return; }

      server.close(() => {
        m.publish(KoaHttpServerStopped);
      });
    }

    function startServer () {
      server = koa.listen({ port, host }, () => {
        m.publish(KoaHttpServerReady);
      });
    }

    m.observe(AddRouteToKoaHttpServer, addRoute);
    m.observe(StopKoaHttpServer, stopServer);
    m.observe(StartKoaHttpServer, startServer);
  });
}
