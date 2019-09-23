import Debug from 'debug';
import * as shortId from 'shortid';

// tslint:disable-next-line: no-console
Debug.log = console.info.bind(console); // Enables this in the debug console in chrome/vscode etc.

export const logger = Debug('yaef');

// Log levels, as per https://tools.ietf.org/html/rfc5424#section-6.2.1

/** system is unusable */
export const emergency = logger.extend('emergency');
/** action must be taken immediately */
export const alert = logger.extend('alert');
/** critical conditions */
export const critical = logger.extend('critical');
/** error conditions */
export const error = logger.extend('error');
/** warning conditions */
export const warn = logger.extend('warn');
/** normal but significant condition */
export const notice = logger.extend('notice');
/** informational messages */
export const info = logger.extend('info');
/** debug-level messages */
export const debug = logger.extend('debug');

export { shortId };
