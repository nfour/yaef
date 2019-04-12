import { Component, ComponentMediator } from '../src';

void (async () => {
  type IFruitTypes = 'Apple' | 'Banana';

  // Create some event signatures

  const ItIsANewDay = { name: 'ItIsANewDay' as const };
  const FruitIsRipe = { name: 'IsRipe' as const, fruit: '' as IFruitTypes };
  const HarvestedFruit = { name: 'HarvestedFruit' as const, fruit: '' as IFruitTypes };

  // Create some component signatures

  const Apple = {
    name: 'Apple' as const,
    observations: [ItIsANewDay],
    publications: [FruitIsRipe],
  };

  const Harvester = {
    name: 'Harvester' as const,
    observations: [FruitIsRipe],
    publications: [HarvestedFruit],
  };

  // Create some components

  const harvester = Component(Harvester, (m) => {
    m.observe(FruitIsRipe, ({ fruit }) => {
      m.publish(HarvestedFruit, { fruit });
    });
  });

  const apple = Component(Apple, (m) => {
    m.observe(ItIsANewDay, () => {
      // tslint:disable-next-line: no-constant-condition
      if (true) { /** pretend this is doing something... */
        m.publish(FruitIsRipe, { fruit: 'Apple' });
      }
    });
  });

  // Initialize the event mediator

  const mediator = await ComponentMediator({ components: [apple, harvester] }).initialize();

  // Emit some events.

  function theEarthRotates () {
    mediator.publish(ItIsANewDay);
  }

  setInterval(theEarthRotates, 1000); // That is a bit fast
})();