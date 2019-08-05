import { AnonComponent } from '../';

test('Component', () => {
  const dumbComponent: AnonComponent<{ observations: [], publications: [] }> = () => { /** */};

  expect(dumbComponent).toBeTruthy(); // FIXME:
});
