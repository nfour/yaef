export type Omit<T, K extends keyof T> = T extends any ? Pick<T, Exclude<keyof T, K>> : never;
export type TupleToUnion<T extends unknown[]> = T[number];
export type TupleToUnionList<T extends unknown[]> = Array<T[number]>;
export type TupleToPartialIntersection<T extends unknown[]> = UnionToPartialIntersection<TupleToUnion<T>>;
export type TupleToIntersection<T extends unknown[]> = UnionToIntersection<TupleToUnion<T>>;
export type TupleToIntersectionList<T extends unknown[]> = Array<TupleToIntersection<T>>;
export type TupleToPartialIntersectionList<T extends unknown[]> = Array<TupleToPartialIntersection<T>>;
export type UnionToIntersection<U> = (
  (U extends any
    ? (k: U) => void
    : never) extends (k: infer I) => void
      ? I
      : never
);
export type UnionToPartialIntersection<U> = (
  (U extends any
    ? (k: U) => void
    : never) extends (k: infer I) => void
      ? Partial<I>
      : never
);
