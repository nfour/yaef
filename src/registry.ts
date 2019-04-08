import { IComponent, IComponentInput } from './system';

export class Registry<C extends IComponent<IComponentInput>> {
  /** TODO: support many components with the same name via proxy wrapper? */
  components: Map<C['name'], C> = new Map();

  add <In extends IComponent<any>> (component: In) {
    this.components.set(component.name, component as any);
  }

  /**
   * TODO: must wrap all of these in a proxy component in order to
   * allow multiple components of the same kind to be registered
   */
  get<In extends IComponentInput> (input: In): IComponent<In> {
    const { name } = input;

    if (this.components.has(name)) {
      return this.components.get(name)!;
    }

    return (() => { /**/ }) as any;
  }
}

/** Intended to abtract many components into a single api */
export class ComponentProxy {

}
