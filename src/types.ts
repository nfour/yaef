declare type Omit<T, K extends keyof T> = T extends any ? Pick<T, Exclude<keyof T, K>> : never;
declare type TupleToUnion<T extends unknown[]> = T[number];
declare type TupleToUnionList<T extends unknown[]> = Array<T[number]>;
declare type TupleToPartialIntersection<T extends unknown[]> = UnionToPartialIntersection<TupleToUnion<T>>;
declare type TupleToIntersection<T extends unknown[]> = UnionToIntersection<TupleToUnion<T>>;
declare type TupleToIntersectionList<T extends unknown[]> = Array<TupleToIntersection<T>>;
declare type TupleToPartialIntersectionList<T extends unknown[]> = Array<TupleToPartialIntersection<T>>;
declare type UnionToIntersection<U> = (
  (U extends any
    ? (k: U) => void
    : never) extends (k: infer I) => void
      ? I
      : never
);
declare type UnionToPartialIntersection<U> = (
  (U extends any
    ? (k: U) => void
    : never) extends (k: infer I) => void
      ? Partial<I>
      : never
);
