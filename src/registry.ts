import { flatten, flow, map, uniqBy } from 'lodash';

import { IComponent, IComponentSignature, IEventSignature } from './system';

export class Registry<C extends IComponent<IComponentSignature>> {
  /** TODO: support many components with the same name via proxy wrapper? */
  components: Map<C['name'], C> = new Map();

  add <In extends IComponent<any>> (component: In) {
    this.components.set(component.name, component as any);
  }

  /**
   * TODO: must wrap all of these in a proxy component in order to
   * allow multiple components of the same kind to be registered
   */
  get<In extends IComponentSignature> (input: In): IComponent<In> {
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
> ({ name, components }: { name: N, components: C[] }): IComponent<any> {
  const component = <IComponent<C>> ((mediator) => {
    components.map((c) => c(mediator));
  });

  const publications = flatten(uniqBy(map(components, 'publications'), 'name'));
  const observations = flatten(uniqBy(map(components, 'observations'), 'name'));

  Object.defineProperties(component, {
    name: { value: name, writable: false },
    observations: { value: observations, writable: false },
    publications: { value: publications, writable: false },
    kill: { value: () => { /**/ } }, // TODO: make this useful?
  });

  return component;
}
