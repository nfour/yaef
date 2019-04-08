# strict-events

TODO:
- Redefine "definition" interfaces as "signatures" or "sig/sigs"
  - Seems like the better word to describe both event & component identifying configurations
- Create a ComponentSignature function which should serve to merely type-check input and emit that same output in the form of a type that can feed the first arg of `Component(sig, fn)`

## Documented example

- [./examples/overview.ts](./examples/overview.ts)