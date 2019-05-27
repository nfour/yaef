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
