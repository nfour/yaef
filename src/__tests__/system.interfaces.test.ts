import { Component, ComponentMediator } from '../system';

// tslint:disable: no-unused-expression

describe('The interfaces fit together', () => {
  // class Foo { static a: 1; }
  const Foo = { name: 'Foo', a: 1, x: 1 as number } as const;
  class Bar { static b: 3; }

  test('Component', async () => {
    expect(Bar.name).toBe('Bar');

    const component = Component({ name: '1', observations: [Foo], publications: [Bar] }, (m) => {
      m.observe(Foo, (args) => {
        args.a === 1;

        m.publish(Bar, { b: 3 } as any);
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

    const component1 = Component({ name: '1', observations: [Foo], publications: [Bar] }, (m) => {
      m.observe(Foo, (args) => {
        args.a === 1;

        expect(args.a).toBe(1);

        eventFooReceived();

        m.publish(Bar);
      });
    });

    const component2 = Component({ name: '2', observations: [Bar], publications: [] }, (m) => {
      m.observe(Bar, (args) => {
        eventBarReceived();
      });
    });

    const componentMediator = ComponentMediator({ components: [component1, component2] });

    const mediator = await componentMediator.initialize();

    mediator.publish(Foo, { a: 1, x: 999 } as any);
  });
});
