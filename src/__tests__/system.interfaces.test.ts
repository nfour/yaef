import { Component } from '../system';

describe('The interfaces fit together', () => {

  test('Component', async () => {
    class Foo { static a: 1; }
    const Bar = <const> { b: 3 };

    const component = Component({ observations: [Foo], publications: [Bar] }, (m) => {
      m.observe(Foo);
      m.observe(Foo, (args) => {
        args.a;

        m.publish({ b: 3 });
      });
    });

    expect(component.observations[0].a === 1).toBeTruthy();

    expect(component).toBeInstanceOf(Function);
    expect(component.observations).toEqual([Foo]);
    expect(component.publications).toEqual([Bar]);
  });

  test('Mediator', async () => {

  });

});
