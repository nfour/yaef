import { Component, ComponentMediator, RemoteModuleComponent } from '../src';

// tslint:disable:no-console

const storage: Map<string, any> = new Map();

/**
 * Lets make a simple storage api!
 */

void (async () => {
  /**
   * Events
   */

  const SaveObjectRequest = {
    name: <const> 'SaveObjectRequest',
    id: <string> '',
    payload: <any> {},
  };

  const ObjectSaved = {
    name: <const> 'ObjectSaved',
    id: <string> '',
  };

  const ObjectLoaded = {
    name: <const> 'ObjectLoaded',
    id: <string> '',
    payload: <any> {},
  };

  const LoadObjectRequest = {
    name: <const> 'LoadObjectRequest',
    id: <string> '',
  };

  /**
   * Components
   */

  const objectSaver = Component({
    name: 'ObjectSaver',
    observations: [SaveObjectRequest],
    publications: [ObjectSaved],
  }, (m) => {
    m.observe(SaveObjectRequest, ({ id, payload }) => {
      storage.set(id, payload);

      m.publish(ObjectSaved, { id });
    });
  });

  const objectLoader = Component({
    name: 'ObjectLoader',
    observations: [LoadObjectRequest],
    publications: [ObjectLoaded],
  }, (m) => {
    m.observe(LoadObjectRequest, ({ id }) => {
      const payload = storage.get(id);

      m.publish(ObjectLoaded, { id, payload });
    });
  });

  const mediator = await ComponentMediator({ components: [objectLoader, objectSaver] })
    .connect();

  /**
   * Lets save an object and make sure we know when objects are saved.
   */

  mediator.observe(ObjectSaved, ({ id }) => console.log(`Saved object: ${id}`));

  mediator.publish(SaveObjectRequest, { id: 'foo', payload: 'bar' });

  /**
   * Ok, lets retrieve the object we saved now.
   * Considering everything is synchronous, for now, we can just request it right away.
   */

  mediator.observe(ObjectLoaded, ({ id, payload }) => console.log(`Loaded object: ${id}: ${payload}`));

  mediator.publish(LoadObjectRequest, { id: 'foo' });

  /**
   * We will see it logged to the console, but we cant access it in this particular synchronous workflow.
   * This is the nature of simplistic evented systems.
   *
   * More advanced control flow will follow, later.
   *
   * Lets continue creating components.
   */

  /**
   * Spawns a remote worker process for the component located at the
   * provided module path:member location.
   */
  const remoteObjectLoader = RemoteModuleComponent({
    name: 'RemoteObjectLoader',
    observations: [LoadObjectRequest],
    publications: [ObjectLoaded],
  }, { module: { path: './objects', member: 'objectLoader' } });

  /**
   * Mediators cannot be mutated, so we need to redefine it with our new components.
   */

  const mediator2 = await ComponentMediator({ components: [remoteObjectLoader, objectSaver] }).connect();

  /**
   * Because we are lazy, we can bring the logging observers to the new mediator
   *
   * Analgous to calling `mediator2.observe(Event, callback)` for each observer
   */
  mediator2.addObservers(mediator.observers);

  // TODO: this loader wont be able to read the same storage instance - need stateless components for
  //   this example to make sense. probably use a json store or some shit!

  // TODO: make registry and proxy components real
  //   so that a test can pass where
  //     one can declaratively spawn many components in arbitrary remote locations in >1 quantity

  // Document the registry being used here

  // tidy up files, rdy to alpha release to test within higher level project
})();

