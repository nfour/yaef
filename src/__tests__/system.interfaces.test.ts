import { Component, Connector, Mediator } from '../system';

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

    /**
     * TODO: Is this right?
     * Or should it take no event args and be built from extracting what is
     * in connected components?
     */
    const mediate = Mediator(Foo, Bar);

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

    /** Errors here because the type we produce is too strict -
     * required that observations and publications contain ALL events, not just a subset
     */
    mediate(component2, component2);

    const connect = Connector()(component1, component2);

  });

});
