import { delay } from 'bluebird';
import { resolve } from 'path';

import { ComponentMediator } from '../../system';
import { RemoteModuleComponent } from '../remote';
import { A, apple, banana, bananaEvents, C } from './fixtures/components';

const bananaComponentPath = resolve(__dirname, './fixtures/components');
const bananaMember: keyof typeof import('./fixtures/components') = 'banana';

describe('Running components in a worker process', () => {
  test('The component lifecycle works with local components', async () => {
    const mediator = await ComponentMediator({ components: [apple, banana] })
      .initialize();

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

    const mediator = await ComponentMediator({ components: [apple, remoteBananaComponent] })
      .initialize();

    const eventCCalled = jest.fn();

    mediator.observe(C, () => {
      eventCCalled();
    });

    mediator.publish(A);

    await delay(100);

    expect(eventCCalled).toBeCalledTimes(1);
  });
});
