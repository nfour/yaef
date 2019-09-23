import { Component, ComponentSignature, EventAwaiter, EventSignature, logging } from '@yaef/core';
import * as Koa from 'koa';
import * as BodyParser from 'koa-bodyparser';
import * as Router from 'koa-router';

import { HttpRequest, HttpRequestResponse } from './httpEvents';
import { createHttpEventFromKoaContext, normalizeUrlPath } from './lib';

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
  const debug = logging.debug.extend(`KoaHttpServer[${logging.shortId()}]`);

  const router = new Router();
  const koa = new Koa()
    .use(BodyParser())
    .use(router.routes());

  let server: import('http').Server | undefined;

  return Component(KoaHttpServerSignature, (m) => {
    const waitFor = EventAwaiter(m, { timeout });

    function addRoute ({ methods, path }: typeof AddRouteToKoaHttpServer) {
      const resource = normalizeUrlPath(path);

      debug(`New Route. %o`, { methods, path: resource });

      router.register(resource, methods, async (ctx, next) => {
        const requestEvent = createHttpEventFromKoaContext(ctx, { resource });

        const waitingForResponsePromise = waitFor(HttpRequestResponse, ({ _eventId }) => _eventId === requestEvent._eventId);

        m.publish(HttpRequest, requestEvent);

        try {
          // Waits for HttpRequestResponse events, and only resolves when the filter matches the id
          const responseEvent = await waitingForResponsePromise;

          ctx.status = responseEvent.statusCode;
          ctx.body = responseEvent.body;
          ctx.set(responseEvent.headers || {});
        } catch (error) {
          debug('Failure to get response. Error: %O', error);
          ctx.throw(500, 'Internal server error');
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
