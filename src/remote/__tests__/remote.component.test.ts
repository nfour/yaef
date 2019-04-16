import { delay, map } from 'bluebird';
import { resolve } from 'path';

import { ComponentMediator, IMediator } from '../../system';
import { RemoteModuleComponent } from '../remote';
import { A, apple, banana, BananaDef, C } from './fixtures/components';

const bananaComponentPath = resolve(__dirname, './fixtures/components');
const bananaMember: keyof typeof import('./fixtures/components') = 'banana';

describe('Running components in a worker process', () => {
  /** Used to clean up after tests */
  const containers: Array<ReturnType<typeof ComponentMediator>> = [];

  afterEach(async () => {
    for (const c of containers) { await c.disconnect(); }

    containers.splice(0, containers.length); // Empty
  });

  test('This tests lifecycle works with regular components', async () => {
    const container = ComponentMediator({ components: [apple, banana] });
    containers.push(container);

    const mediator = await container.connect();

    const eventCCalled = jest.fn();

    mediator.observe(C, eventCCalled);
    mediator.publish(A);

    expect(eventCCalled).toBeCalledTimes(1);
  });

  test('Can send and receive remote events (banana test case)', async () => {
    const { mediator } = await prepareRemoteBananaCase();

    const eventCCalled = jest.fn();

    mediator.observe(C, eventCCalled);
    mediator.publish(A);

    await delay(100);

    expect(eventCCalled).toBeCalledTimes(1);
  });

  test('Can send many events to and from a remote component', async () => {
    const { mediator } = await prepareRemoteBananaCase();

    const eventCCalled = jest.fn();

    mediator.observe(C, eventCCalled);

    // 30x10 == 1.6s, 300x100 == 1.7s, 3000x1000 == 4.5s
    const concurrency = 100;
    const size = 300;

    await map(Array(size).fill(''), () => mediator.publish(A), { concurrency });

    while (eventCCalled.mock.calls.length < size) { await delay(10); }

    expect(eventCCalled).toBeCalledTimes(size);
  });

  test('Can spawn many remote components and exchange many events', async () => {
    const spawnSize = 5;

    const start = Date.now();

    const bananas = Array(spawnSize).fill('').map(() => {
      return RemoteModuleComponent(BananaDef, {
        module: { path: bananaComponentPath, member: bananaMember },
      });
    });

    const container = ComponentMediator({ components: [apple, ...bananas] });

    containers.push(container);

    const mediator = await container.connect();

    console.log(`Took ${Date.now() - start}ms to initialize ${spawnSize} workers`);

    const eventCCalled = jest.fn();

    mediator.observe(C, eventCCalled);

    const eventEmitSize = 10;
    const expectedCallTimes = eventEmitSize * spawnSize;

    await map(Array(eventEmitSize).fill(''), () => mediator.publish(A));

    while (eventCCalled.mock.calls.length < expectedCallTimes) {
      await delay(10);
    }

    expect(eventCCalled).toBeCalledTimes(expectedCallTimes);
  });

  // test('Worker wont kill itself, parent should timeout and terminate');
  // test('Errors when recursive events are defined');
  // test('Infinite loops with recursive events when the checks are disabled');
  // test('Can load balance between multiple workers');

  async function prepareRemoteBananaCase () {
    const remoteBananaComponent = RemoteModuleComponent(BananaDef, {
      module: {
        path: bananaComponentPath,
        member: bananaMember,
      },
    });

    const container = ComponentMediator({ components: [apple, remoteBananaComponent] });

    containers.push(container);

    const mediator = await container.connect();

    return { mediator, container, remoteBananaComponent };
  }
});
