import { flatten, map, uniqBy } from 'lodash';

import { EventTuplesToUnion, IComponent, IComponentSignature, SimpleMediator } from './system';

/**
 * The Registry is responsible for abtracting many Components and allowing lookup by name.
 * It does this by abstracting components to a ComponentProxy, which can house many components of the same name.
 *
 * TODO: Add type generics to support strongly typed component signatures
 */
export class Registry {
  components: Map<IComponentProxy['name'], IComponentProxy> = new Map();

  constructor ({ components }: { components?: Array<IComponent<any>> } = {}) {
    if (components) {
      components.forEach((c) => this.add(c));
    }
  }

  add <In extends IComponent<any>> (component: In) {
    const { name } = component;

    const lastComponent = this.components.get(name);

    const nextComponent = lastComponent
      ? ComponentProxy({ name, components: [...lastComponent.components, component] })
      : ComponentProxy({ name, components: [component] });

    this.components.set(name, nextComponent as IComponentProxy<any>);
  }

  get<In extends IComponentSignature> (input: In) {
    const { name } = input;

    return <IComponentProxy<In> | undefined> this.components.get(name);
  }
}

/** Abtract many components to a single component */
export function ComponentProxy<
  C extends IComponent<any>,
  N extends string = string
> ({ name, components }: { name: N, components: C[] }) {
  const component = <IComponentProxy<C>> ((mediator) => {
    components.map((c) => c(mediator));
  });

  const publications = flatten(uniqBy(map(components, 'publications'), 'name'));
  const observations = flatten(uniqBy(map(components, 'observations'), 'name'));

  type ComponentPropConstraints = { [K in keyof IComponent<any>]: any };

  Object.defineProperties(component, <ComponentPropConstraints> {
    name: { value: name, writable: false },
    observations: { value: observations, writable: false },
    publications: { value: publications, writable: false },
    components: { value: components, writable: false },
    disconnect: { value: () => { /**/ } }, // TODO: make this useful?
  });

  return component;
}

export interface IComponentProxy<
  In extends IComponentSignature = IComponentSignature,
  M = SimpleMediator<EventTuplesToUnion<In>>,
> extends IComponent<In, M> {
  components: Array<IComponent<In, M>>;
}
