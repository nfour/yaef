import Debug from 'debug';
import * as createUniqueId from 'uniqid';

export const debug = Debug('yaef');

export const createDebug = (...scopes: string[]) =>
  scopes.reduce((debugFn, scope) => debugFn.extend(scope), debug);

export { createUniqueId };
