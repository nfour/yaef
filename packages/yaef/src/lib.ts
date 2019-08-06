import { config, delay } from 'bluebird';

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
 * const payload = await waitForEvent(MySingularEvent)
 */
export function EventAwaiter<M extends Mediator<any>> (mediator: M, { timeout = 5000 }: { timeout?: number } = {}) {
  return function waitForEvent<E extends IEventSignature> (event: E, filterCb?: ((event: E) => boolean)): Promise<E> {
    return new Promise<E>((resolve, reject) => {
      /**
       * This code is probably way more verbose than necessary but whatever, find a lib later.
       */
      let isCompleted = false;

      const complete = () => {
        isCompleted = true;

        mediator.removeObserver(observeCb);
      };

      const observeCb = (payload: any) => {
        const isFilteredIn = filterCb
          ? filterCb(payload)
          : true;

        if (isCompleted || !isFilteredIn) { return; }

        complete();
        timeoutPromise.cancel();
        resolve(payload);
      };

      mediator.observe(event, observeCb);

      const timeoutPromise = delay(timeout).then(() => {
        if (isCompleted) { return; }

        complete();
        reject(new Error(`Timed out waiting for event: ${JSON.stringify(event, null, 2)}`));
      });
    });
  };
}

// TODO: add generic types
export const CheckEventId = (id: string) => ({ _eventId }: { _eventId: string }) => _eventId === id;
