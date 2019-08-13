import { flatten, map, uniqBy } from 'lodash';

import { EventTuplesToUnion, IComponent, IComponentSignature, Mediator } from './';

/**
 * The Registry is responsible for abtracting many Components and allowing lookup by name.
 * It does this by abstracting components to a ComponentProxy, which can house many components of the same name.
 *
 * TODO: Add type generics to support strongly typed component signatures
 */
export function Registry<
  Sig extends { components: Array<IComponent<any>> }
> (initialInput: Sig) {

  const components: Map<IComponentProxy['name'], IComponentProxy> = new Map();

  function add <In extends IComponent<any>> (component: In) {
    const { name } = component;

    const lastComponent = components.get(name);

    const nextComponent = lastComponent
      ? ComponentProxy({ name, components: [...lastComponent.components, component] })
      : ComponentProxy({ name, components: [component] });

    components.set(name, nextComponent as IComponentProxy<any>);
  }

  function get<In extends Pick<Sig['components'][number], 'name' | 'observations' | 'publications'>> (sig: In) {
    const { name } = sig;

    return <IComponentProxy<In> | undefined> components.get(name);
  }

  if (initialInput.components) {
    initialInput.components.forEach(add);
  }

  return { get, components };
}

/** Abtract many components to a single component */
export function ComponentProxy<
  C extends IComponent<any>,
  N extends string = string
> ({ name, components }: { name: N, components: C[] }) {
  const component = <IComponentProxy<C>> ((mediator) => {
    components.forEach((subComponent) => subComponent(mediator));
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
  M = Mediator<EventTuplesToUnion<In>>,
> extends IComponent<In, M> {
  components: Array<IComponent<In, M>>;
}
