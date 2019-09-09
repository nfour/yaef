import { Component, ComponentMediator, EventSignature } from '../';
import { ComponentProxy } from '../registry';

test('Can send events to multiple components through a proxy', async () => {
  const X = EventSignature('X');
  const Y = EventSignature('Y');
  const Z = EventSignature('Z');

  const xToY = Component({ name: 'xToY', observations: [X], publications: [Y] }, (m) => {
    m.observe(X, () => { m.publish(Y); });
  });

  const xToZ = Component({ name: 'xToZ', observations: [X], publications: [Z] }, (m) => {
    m.observe(X, () => { m.publish(Z); });
  });

  const xToZorY = ComponentProxy({ name: 'xToZorY', components: [xToZ, xToY] });

  const { connect, mediator } = ComponentMediator({ components: [xToZorY] });

  await connect();

  const zWasCalled = jest.fn();
  const yWasCalled = jest.fn();

  mediator.observe(Y, yWasCalled);
  mediator.observe(Z, zWasCalled);

  await mediator.publish(X);

  expect(zWasCalled).toBeCalledTimes(1);
  expect(yWasCalled).toBeCalledTimes(1);
});
