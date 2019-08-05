import { delay } from 'bluebird';

import { Component, ComponentMediator, SimpleMediator } from '../';
import { EventAwaiter } from '../lib';

test('Can observe published events', () => {
  const { mediator } = ComponentMediator<any>({ components: [] });

  expect(() => mediator.publish({}, {})).toThrowErrorMatchingSnapshot();
  expect(() => mediator.observe({}, () => { /** */})).toThrowErrorMatchingSnapshot();
  expect(() => mediator.publish({ name: 'foo' })).not.toThrowError();
  expect(() => mediator.publish(class Foo {})).not.toThrowError();

  const xEventReceived = jest.fn();

  mediator.observe({ name: 'x' }, () => xEventReceived());
  mediator.publish({ name: 'x' });

  expect(xEventReceived).toBeCalledTimes(1);
});

test('Can mediate events within components', async () => {
  const Foo = { name: 'Foo', a: 1, x: 9 as number } as const;
  class Bar { static b: 1; }

  const eventBarReceived = jest.fn();
  const eventFooReceived = jest.fn();

  const component1 = Component({ name: '1', observations: [Foo], publications: [Bar] }, (m) => {
    m.observe(Foo, (args) => {
      expect(args.a === 1).toBe(true);

      eventFooReceived();

      m.publish(Bar, { b: 3 } as any);
    });
  });

  const component2 = Component({ name: '2', observations: [Bar], publications: [] }, (m) => {
    m.observe(Bar, (args) => {
      eventBarReceived();
    });
  });

  const componentMediator = ComponentMediator({ components: [component1, component2] });

  const mediator = await componentMediator.connect();

  mediator.publish(Foo, { a: 1, x: 999 });

  expect(eventBarReceived).toBeCalledTimes(1);
  expect(eventFooReceived).toBeCalledTimes(1);
});

describe('SimpleMediator', () => {
  test('Can remove listeners based on callback', async () => {
    const mediator = new SimpleMediator();

    const FooEvent = { name: <const> 'foo' };

    const fooEventCb = jest.fn();

    mediator.observe(FooEvent, fooEventCb);
    mediator.publish(FooEvent);
    mediator.removeObserver(fooEventCb);
    mediator.publish(FooEvent);

    expect(fooEventCb).toBeCalledTimes(1);
    expect(mediator.observers).toMatchSnapshot();
  });

  test('Can use EventAwaiter to wait for events with promises', async () => {
    const mediator = new SimpleMediator();

    const FooEvent = { name: <const> 'foo', foo: <number> 0 };

    const waitForEvent = EventAwaiter(mediator);

    delay(50).then(() => {
      mediator.publish(FooEvent, { foo: 999 });
    });

    const result = await waitForEvent(FooEvent);

    expect(mediator.observers).toMatchSnapshot();
    expect(result).toEqual({ foo: 999 });
  });
});
