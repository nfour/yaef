import { AnonComponent, Component, IObservations, Mediator } from '../system';

test('interfaes', () => {
  class Walk { message!: { a: 1 } }
  class Sit { message!: { a: 2 } }
  class Die { message!: { a: 3 } }
  
  const Person2: AnonComponent<{ observations: Walk|Sit, pubs: Die }> = (med) => {
    med.publish(new Die())
  }


  /**
   * http://reactivex.io/rxjs/manual/overview.html#introduction
   * 
   */
  const Person4 = Component({ observations: [Walk, Sit], publications: [Die] }, (med) => {
    med.publish(new Die())
  });
  const Person5 = Component({ observations: [Sit], publications: [Die] }, (med) => {
    med.observe(Sit, () => {
      med.publish(new Die())
    })

    med.observe(Sit)
      .on(() => {

      })
  });
  const PersonController = Component({ observations: [], publications: [Walk, Sit] }, (med) => {
    med.publish(new Walk())
    med.publish(new Sit())
  });

  await validateDependencies(Person4, Person5, PersonController);



})