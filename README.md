# strict-events


## To solve:

- Components do not define events as strings
- Events are defined as interfaces
  - These interfaces should define the call signature of `component.emit` or `component.on` and solve the subscriptions/declarations
- Components connect via containers instead of each component being glued to each other
- 