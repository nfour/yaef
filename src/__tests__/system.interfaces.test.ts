import { Component, Mediator } from '../system';

// tslint:disable: no-unused-expression

describe('The interfaces fit together', () => {
  // class Foo { static a: 1; }
  const Foo = { a: 1 } as const;
  const Bar = { b: 3 } as const;

  test('Component', async () => {

    expect(Foo.constructor.name).toBe('Foo');

    const component = Component({ observations: [Foo], publications: [Bar] }, (m) => {
      m.observe(Foo);
      m.observe(Foo, (args) => {
        args.a === 1;

        m.publish({ b: 3 });
      });
    });

    expect(component.observations[0].a === 1).toBeTruthy();
    expect(component).toBeInstanceOf(Function);
    expect(component.observations).toEqual([Foo]);
    expect(component.publications).toEqual([Bar]);
  });

  test('Mediated Components', async () => {
    const eventBarReceived = jest.fn();
    const eventFooReceived = jest.fn();

    const connect = Mediator(Foo, Bar);

    const component1 = Component({ observations: [Foo], publications: [Bar] }, (m) => {
      m.observe(Foo, (args) => {
        args.a === 1;

        expect(args.a).toBe(1);

        eventFooReceived();

        m.publish({ b: 3 });
      });
    });

    const component2 = Component({ observations: [Bar], publications: [] }, (m) => {
      m.observe(Bar, (args) => {
        eventBarReceived();
      });
    });

    connect(component2, component2);

  });

});
