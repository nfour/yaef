import { Component } from '../../../';

export const A = { name: 'A' };
export const B = { name: 'B' };
export const C = { name: 'C' };

export const AppleDef = {
  name: 'Apple',
  observations: [A],
  publications: [B],
};

export const BananaDef = {
  name: 'Banana',
  observations: [B],
  publications: [C],
};

export const apple = Component(AppleDef, (mediator) => {
  mediator.observe(A, () => {
    mediator.publish(B);
  });
});

export const banana = Component(BananaDef, (mediator) => {
  mediator.observe(B, () => {
    mediator.publish(C);
  });
});
