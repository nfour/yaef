import { Component, IEventInputs } from '../../../system';

export const A = { name: 'A' };
export const B = { name: 'B' };
export const C = { name: 'C' };

export const appleEvents = {
  observations: [A],
  publications: [B],
};

export const bananaEvents = {
  observations: [B],
  publications: [C],
};

export const apple = Component(appleEvents, (mediator) => {
  mediator.observe(A, () => {
    mediator.publish(B);
  });
});

export const banana = Component(bananaEvents, (mediator) => {
  mediator.observe(B, () => {
    mediator.publish(C);
  });
});
