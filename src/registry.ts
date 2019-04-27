import { flatten, map, uniqBy } from 'lodash';

import { EventTuplesToUnion, IComponent, IComponentSignature, IEventSignature, SimpleMediator } from './system';

export class Registry<C extends IComponent<IComponentSignature>> {
  /** TODO: support many components with the same name via proxy wrapper? */
  components: Map<C['name'], IComponentProxy<C>> = new Map();

  add <In extends IComponent<any>> (component: In) {
    const { name } = component;
    const existing = this.components.has(name);

    // FIXME: the `any` casting is bad mkay
    if (!existing) {
      const oldProxy = this.components.get(name)!;

      this.components.set(name, ComponentProxy({ name, components: [...oldProxy.components, component] as any }));
    } else {
      this.components.set(name, component as any);

    }
  }

  /**
   * TODO: must wrap all of these in a proxy component in order to
   * allow multiple components of the same kind to be registered
   */
  get<In extends IComponentSignature> (input: In): IComponentProxy<In> {
    const { name } = input;

    if (this.components.has(name)) {
      return this.components.get(name)!;
    }

    return (() => { /**/ }) as any;
  }
}

/** Intended to abtract many components into a single api */
export function ComponentProxy<
  C extends IComponent,
  N extends string = string
> ({ name, components }: { name: N, components: C[] }) {
  const component = <IComponentProxy<C>> ((mediator) => {
    components.map((c) => c(mediator));
  });

  const publications = flatten(uniqBy(map(components, 'publications'), 'name'));
  const observations = flatten(uniqBy(map(components, 'observations'), 'name'));

  Object.defineProperties(component, {
    name: { value: name, writable: false },
    observations: { value: observations, writable: false },
    publications: { value: publications, writable: false },
    components: { value: components, writable: false },
    kill: { value: () => { /**/ } }, // TODO: make this useful?
  });

  return component;
}

export interface IComponentProxy<
  In extends IComponentSignature = IComponentSignature,
  M = SimpleMediator<EventTuplesToUnion<In>>,
> extends IComponent<In, M> {
  components: Array<IComponent<In, M>>;
}
