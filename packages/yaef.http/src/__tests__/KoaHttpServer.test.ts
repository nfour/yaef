import { delay } from 'bluebird';
import fetch from 'cross-fetch';
import { ComponentMediator, EventAwaiter } from 'yaef';

import { HttpRequest, HttpRequestResponse } from '../httpEvents';
import {
  AddRouteToKoaHttpServer, KoaHttpServer, KoaHttpServerReady, KoaHttpServerStopped, StartKoaHttpServer,
  StopKoaHttpServer,
} from '../KoaHttpServer';

test('Start a server and send a request and get a response then stop the server', async () => {
  const server = KoaHttpServer({ host: '0.0.0.0', port: 9119 });

  const { connect, mediator } = ComponentMediator({ components: [server] });

  const waitFor = EventAwaiter(mediator);

  await connect();

  // Tell the server to start
  mediator.publish(AddRouteToKoaHttpServer, { methods: ['POST'], path: '/baz' });
  mediator.publish(StartKoaHttpServer);

  await waitFor(KoaHttpServerReady);

  // Hit the server
  const fetchRequestPromise = fetch(`http://0.0.0.0:9119/baz`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'accept': 'application/json' },
    body: JSON.stringify({ n: 20 }),
  }).then((res) => res.json());

  mediator.observe(HttpRequest, async (request) => {
    await delay(50); // Take some time to build that response

    expect(request).toMatchSnapshot({
      _eventId: expect.any(String),
    });

    mediator.publish(HttpRequestResponse, {
      body: { nTimes2: request.body.n * 2 },
      headers: { 'content-type': request.headers.accept },
      statusCode: 200,
      _eventId: request._eventId,
    });
  });

  const response = await fetchRequestPromise;

  mediator.publish(StopKoaHttpServer);

  await waitFor(KoaHttpServerStopped);

  expect(response).toMatchSnapshot();
});
