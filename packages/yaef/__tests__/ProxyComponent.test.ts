import { ComponentProxy } from '../registry';
import { Component, ComponentMediator, EventSignature } from '../system';

test('Can send events to multiple components through a proxy', async () => {
  const X = EventSignature('X');
  const Y = EventSignature('Y');
  const Z = EventSignature('Z');

  // TODO: SHould we actually have `name` seperate so that obs/pubs can be considered the immutable signature?
  const xToY = Component({ name: 'xToY', observations: [X], publications: [Y] }, (m) => {
    m.observe(X, () => m.publish(Y));
  });

  const xToZ = Component({ name: 'xToZ', observations: [X], publications: [Z] }, (m) => {
    m.observe(X, () => m.publish(Z));
  });

  const xToZorY = ComponentProxy({ name: 'xToZorY', components: [xToZ, xToY] });

  const mediator = await ComponentMediator({ components: [xToZorY] }).connect();

  const zWasCalled = jest.fn();
  const yWasCalled = jest.fn();

  mediator.observe(Z, zWasCalled);
  mediator.observe(Y, yWasCalled);

  mediator.publish(X);

  expect(zWasCalled).toBeCalledTimes(1);
  expect(yWasCalled).toBeCalledTimes(1);
});
