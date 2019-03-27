import { ComponentMediator, IComponent, IMediatedEventInput, IMediator } from './system';

class Boot { static version: 1; }

export interface Thingo<E extends IMediatedEvents = { observations: [Boot], publications: [Boot] }> { // Defining a default that pulls in Boot?
  readonly componentRegistry: ComponentRegistry;
  readonly inversify: Inversify.Container; // would be used to component.bind(container | inversify)
  readonly mediator: IMediator<E>;
}

// this is dumb. I hope something like this can be done.
// export function use<B extends IMediatedEvents, E extends IMediatedEvents>(my: Thingo<B>, comp: IComponent<E>): (comp: IComponent<E extends IMediatedEvents>) => Thingo<B & E> {
//   my.
//   return <B & E, E>(my, comp);
// }
// then after each use(my, comp) the my.mediator types are correct?

export interface ComponentRegistry { // The props could just be on Thingo
  readonly registeredComponents: Map<string | Symbol, IComponent<any>>; // Symbol is probs dumb? ... <any> doesn't work.
  lookup<E extends IMediatedEventInput> (componentName: string): IComponent<E> | undefined; // Have to give E!
  isRegistered (componentName: string | Symbol | IComponent<any>): boolean;
  // ... Don't need it if I don't store the components though, but doing so helps with debugging and sub containering the IoC etc.
}

let my = new Thingo(new InversifyImpl());


const mediator /* or Thingo */ = connect(component1) => ComponentMediator with component1 pubs/subs;
                        (component2) => ComponentMediator with component2 pubs/subs;
                        (component3) => ComponentMediator with component3 pubs/subs;

mediator.pub(Component3Event, () => {});

use(my, my.createComponent(WhateverComp));
my.use(CreateComponent(app.mediator, ExampleComp));
my = use(my, my.CreateComponent(PleaseHelpComp));
my.createComponent(BottleComp);

my.rofl = CreateComponent(RoflComp); // ???

my.mediator.pub(new Boot); // some how Mediator should know about Boot. :O
my.mediator.pub({ Apples: 14 }); // Should tsc error at me, unless a component brings event for this.

my.componentRegistry.isRegistered('bottle');
my.componentRegistry.isRegistered(BottleComp;
my.componentRegistry.isRegistered(BottleComp.name);
my.componentRegistry.isRegistered(BottleComp.symbol);
my.componentRegistry.isRegistered(rofl);

if (my.example) { } // ... if components are probs...

