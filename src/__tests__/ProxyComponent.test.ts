import { ComponentProxy } from '../registry';
import { Component, EventSignature } from '../system';

test('Can send events to multiple components through a proxy', () => {
  const X = EventSignature('X');
  const Y = EventSignature('Y');
  const Z = EventSignature('Z');

  const xToY = Component({ name: 'xToY', observations: [X], publications: [Y] }, (m) => {
    m.observe(X, () => m.publish(Y));
  });

  const xToZ = Component({ name: 'xToZ', observations: [X], publications: [Z] }, (m) => {
    m.observe(X, () => m.publish(Z));
  });

  const xToZorY = ComponentProxy();

  // mediate only xToZorY

  // expect proxy to emit both Y and Z given X
});
