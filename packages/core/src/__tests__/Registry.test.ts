import { delay } from 'bluebird';

import { Component, ComponentMediator } from '../';
import { EventSignature } from '../componentry';
import { Registry } from '../registry';

const Foo = { name: 'Foo', a: 1, x: 9 as number } as const;
const Bar = EventSignature('Bar', { b: 1 } as const);

test('Can add and retrieve a component to a Registry', async () => {
  const BananaDefinition = { name: 'Banana' as const, observations: [Foo], publications: [Bar] };
  const banana = Component(BananaDefinition, (m) => {
    m.observe(Foo, () => {
      m.publish(Bar);
    });
  });

  const registry = Registry({ components: [banana] });

  const reggedBanana = registry.get(BananaDefinition)!;
  // const diffBanana = registry.get({ name: 'DifferentBanana' as const, observations: [], publications: [Bar] })!; // Should TS error

  const mediator = await ComponentMediator({ components: [reggedBanana] }).connect();

  const barEventCalled = jest.fn();

  mediator.observe(Bar, barEventCalled);
  mediator.publish(Foo);

  await delay(5);

  expect(barEventCalled).toBeCalledTimes(1);
});

// test('Can retrieve a component from a Registry');
