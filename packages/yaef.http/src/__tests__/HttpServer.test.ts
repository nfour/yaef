import { ComponentMediator } from 'yaef';

import { HttpServer } from '../HttpServer';

test('Start a server and send a request and get a response', async () => {
  const server = HttpServer({ host: '0.0.0.0', port: 9999 });

  const mediator = await ComponentMediator({ components: [server] }).connect();
});
