import { delay } from 'bluebird';

import { Component } from '../';
import { Registry } from '../registry';
import { ComponentMediator } from '../system';

const Foo = { name: 'Foo', a: 1, x: 9 as number } as const;
class Bar { static b: 1; }
class Baz { static x: 1; }

test('Can add and retrieve a component to a Registry', async () => {
  const BananaDefinition = { name: 'Banana' as const, observations: [Foo], publications: [Bar] };
  const banana = Component(BananaDefinition, (m) => {
    m.observe(Foo, () => {
      m.publish(Bar);
    });
  });

  const registry = new Registry({ components: [banana] });

  const reggedBanana = registry.get(BananaDefinition)!;

  const mediator = await ComponentMediator({ components: [reggedBanana] }).connect();

  const barEventCalled = jest.fn();

  mediator.observe(Bar, barEventCalled);
  mediator.publish(Foo);

  await delay(5);

  expect(barEventCalled).toBeCalledTimes(1);
});

// test('Can retrieve a component from a Registry');
