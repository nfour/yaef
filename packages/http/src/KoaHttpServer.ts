import { Component, ComponentSignature, createDebug, createUniqueId, EventAwaiter, EventSignature } from '@yaef/core';
import * as Koa from 'koa';
import * as BodyParser from 'koa-bodyparser';
import * as Router from 'koa-router';

import { HttpRequest, HttpRequestResponse } from './httpEvents';
import { createHttpEventFromKoaContext, formatUrlPath } from './lib';

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

export const KoaHttpServerSignature = ComponentSignature('KoaHttpServer', {
  observations: [
    StartKoaHttpServer, StopKoaHttpServer,
    AddRouteToKoaHttpServer,
    HttpRequestResponse,
  ],
  publications: [
    KoaHttpServerReady, KoaHttpServerStopped,
    HttpRequest,
  ],
});

// TODO: support inpt for a Router and Koa instance
export function KoaHttpServer ({ host, port, timeout = 60000 }: {
  port: number,
  host: string,
  /** In `ms`, duration to wait before timing out a request */
  timeout?: number;
}) {
  const debug = createDebug('yaef', 'KoaHttpServer', createUniqueId());

  const router = new Router();
  const koa = new Koa()
    .use(BodyParser())
    .use(router.routes());

  let server: import('http').Server | undefined;

  return Component(KoaHttpServerSignature, (m) => {
    const waitFor = EventAwaiter(m, { timeout });

    function addRoute ({ methods, path }: typeof AddRouteToKoaHttpServer) {
      const formattedPath = formatUrlPath(path);

      debug(`New Route. %o`, { methods, path: formattedPath });

      router.register(formattedPath, methods, async (ctx, next) => {
        const requestEvent = createHttpEventFromKoaContext(ctx);

        const waitingForResponsePromise = waitFor(HttpRequestResponse, ({ _eventId }) => _eventId === requestEvent._eventId);

        m.publish(HttpRequest, requestEvent);

        debug({ requestEvent });

        try {
          // Waits for HttpRequestResponse events, and only resolves when the filter matches the id
          const responseEvent = await waitingForResponsePromise;

          debug({ responseEvent });

          ctx.status = responseEvent.statusCode;
          ctx.body = responseEvent.body;
          ctx.set(responseEvent.headers || {});
        } catch (error) {
          debug('Failure to get response. Error: %O', error);
          ctx.status = 500;
          ctx.body = 'Internal server error'; // TODO: fix this, make better?
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
