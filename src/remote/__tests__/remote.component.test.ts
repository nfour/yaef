import { delay } from 'bluebird';
import { resolve } from 'path';

import { ComponentMediator, IMediator } from '../../system';
import { RemoteModuleComponent } from '../remote';
import { A, apple, banana, bananaEvents, C } from './fixtures/components';

const bananaComponentPath = resolve(__dirname, './fixtures/components');
const bananaMember: keyof typeof import('./fixtures/components') = 'banana';

describe('Running components in a worker process', () => {
  const containers: Array<ReturnType<typeof ComponentMediator>> = [];

  afterEach(async () => {
    for (const c of containers) { await c.kill(); }
  });

  test('The component lifecycle works with local components', async () => {
    const container = ComponentMediator({ components: [apple, banana] });

    containers.push(container);

    const mediator = await container.initialize();

    const eventCCalled = jest.fn();

    mediator.observe(C, () => {
      eventCCalled();
    });

    mediator.publish(A);

    expect(eventCCalled).toBeCalledTimes(1);
  });

  test('Can send and receive an event in a worker component', async () => {
    const remoteBananaComponent = RemoteModuleComponent(bananaEvents, {
      module: {
        path: bananaComponentPath,
        member: bananaMember,
      },
    });

    const container = ComponentMediator({ components: [apple, remoteBananaComponent] });

    containers.push(container);

    const mediator = await container.initialize();

    const eventCCalled = jest.fn();

    mediator.observe(C, () => {
      eventCCalled();
    });

    mediator.publish(A);

    await delay(100);

    expect(eventCCalled).toBeCalledTimes(1);
  });
});
