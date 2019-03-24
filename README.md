# strict-events

## reaco

> reaco is a project that only serves as a base to argue for event arch'ed frameworks and what the difference is/lessons to be learned.

### Things that reaco got wrong:

- Components define events as strings.
  - They are typed - but are not completely enforced,
    and are difficult to maintain (3 places)
- Components connect wildly between each other
  - Although this is a more flexible implementation, it means one can not track event propagation between components in a clear manner
- 
### Possible improvements:

- Events are defined as interfaces
  - These interfaces, likely implemented as Classes, should define the call signature of the messages and a serializable identifier to facilitate message passing
- Components connect via containers instead of each component being glued to each other
- Components, on construction, define the events they consume and publish, through dependency injection

With that said, we could just do something entirely different to meet the goals.

## Goals:

- Produce new iteration of an evented framework
- Must be simple in both api and concept, within the limits of soundness
- Must not have complex rules or logic, only glue
- Must provide support for arbitrary event passing layers, eg. remote components, IPC etc. ensuring event lifecycles are easy to reason about

## Research

- Entity component system (eg. unreal engine)
  - https://github.com/Xan0C/curbl-ecs#readme
    - New project, based on ECS
    - Typescript
    - Dependency injection
    - Classes & decorators
  - https://github.com/ianpaschal/aurora#readme
    - Game engine basis
