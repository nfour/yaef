import { config, delay, Promise as BluebirdPromise } from 'bluebird';
import { every, isFunction } from 'lodash';

import { IEventSignature } from './';
import { Mediator } from './mediation';

/** TODO: test me */
export function ErrorFromCallPoint ({ fromStackPosition }: { fromStackPosition: number }) {
  return (message?: string) => {
    const error = new Error(message);

    /** Add one position, because of this function call */
    const nextPosition = fromStackPosition + 1;

    const stackLines = (error.stack || '').split('\n');

    const nextStack = [
      stackLines[0],
      ...stackLines.slice(nextPosition),
    ].join('\n');

    error.stack = nextStack;

    return error;
  };
}

config({ cancellation: true });

type IEventFilter<E extends IEventSignature> = (
  Partial<{ [K in keyof E]: string | number | symbol }> |
  ((event: E) => boolean)
);

export { BluebirdPromise };

/**
 * A factory which produces a function that can wait for an event to complete, once.
 *
 * - Set `timeout` to `Infinity` to remove the timeout error.
 *
 * The factory returns a function which when called, returns a promise with resolves with the event.
 * - Use the `filterCb` to filter an event
 *
 * @example
 *
 * const waitForEvent = EventAwait(mediator);
 * const payload = await waitForEvent(MyEvent, (payload) => payload._id === someId)
 * const payload = await waitForEvent(MyEvent, { _id: someId })
 * const payload = await waitForEvent(MySingularEvent)
 */
export function EventAwaiter<M extends Mediator<any>> (mediator: M, { timeout = 5000 }: { timeout?: number } = {}) {
  return function waitForEvent<E extends IEventSignature> (event: E, filter?: IEventFilter<E>) {
    /** This type is used to prevent bluebird type export issues in TypeScript */
    type ICancelablePromise = Promise<E> & { cancel (): void };

    return <ICancelablePromise> <unknown> new BluebirdPromise<E>((resolve, reject, onCancel) => {

      const cancel = () => {
        if (isCompleted) { return; }

        complete();
        timeoutPromise.cancel();
      };

      // This gets called whenever someone calls `resultPromise.cancel()`
      onCancel!(cancel);

      /**
       * This code is probably way more verbose than necessary but whatever, find a lib later.
       */
      let isCompleted = false;

      const filterFn = (() => {
        if (!filter) { return; }

        return isFunction(filter)
          ? filter
          : (e: E) => every(filter, (val, key) => e[key] === val);
      })();

      const complete = () => {
        isCompleted = true;

        mediator.removeObserver(observeCb);
      };

      const observeCb = (payload: any) => {
        if (isCompleted) { return; }

        const passesFilterCheck = filterFn
          ? filterFn(payload)
          : true;

        if (!passesFilterCheck) { return; }

        cancel();
        resolve(payload);
      };

      mediator.observe(event, observeCb);

      const timeoutPromise = delay(timeout)
        .then(() => {
          if (isCompleted) { return; }

          complete();
          reject(new Error(`EventAwaiter timed out waiting for event: ${JSON.stringify(event, null, 2)}`));
        });
    });
  };
}
