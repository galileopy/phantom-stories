export enum ResourceTypes {
  Data = "Data",
  Query = "Query",
  Empty = "Empty",
  Error = "Error"
}
export type Resource<T, Q> =
  | Data<T, Q>
  | Query<Q>
  | Empty<Q>
  | Error<Q>;

export interface ResourcePattern<T, Q, R> {
  Query: (resource: Query<Q>) => R;
  Data: (resource: Data<T, Q>) => R;
  Empty: (resource: Empty<Q>) => R;
  Error: (resource: Error<Q>) => R;
}
type PartialPattern<T, Q> = Partial<ResourcePattern<T, Q, void>>;
export interface ResourceMethods<T, Q> {
  map: <R>(fn: (x: T) => R) => Resource<T | R, Q>;
  chain: <R, P>(
    fn: (x: Data<T, Q>) => Resource<R, P>
  ) => Resource<T | R, Q | P>;
  matchWith: <R>(pattern: ResourcePattern<T, Q, R>) => R;
  matchWithPartial: (pattern: PartialPattern<T, Q>) => void;
  update: (params: Q) => Query<Q>;
}

export class Query<Q> implements ResourceMethods<any, Q> {
  readonly type = ResourceTypes.Query;
  constructor(readonly params: Q) {}
  static of<Q>(params: Q): Query<Q> {
    return new Query<Q>(params);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public map<R>(_: (x: any) => R): Query<Q> {
    return this;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public chain<R, P>(_: (x: any) => Resource<R, Q | P>): Query<Q> {
    return this;
  }
  public matchWith<R>(pattern: ResourcePattern<any, Q, R>): R {
    return pattern.Query(this);
  }
  public matchWithPartial(pattern: PartialPattern<any, Q>): void {
    if (pattern.Query) {
      pattern.Query(this);
    }
  }
  public update(params: Q): Query<Q> {
    return Query.of(params);
  }
}

// Subtypes constructors
export class Data<T, Q> implements ResourceMethods<T, Q> {
  readonly type = ResourceTypes.Data;
  constructor(readonly value: T, readonly params: Q) {}
  static of<T, Q>(value: T, params: Q): Data<T, Q> {
    return new Data(value, params);
  }

  public map<R>(fn: (x: T) => R): Data<R, Q> | Error<Q> {
    try {
      const result = fn(this.value);
      return Data.of(result, this.params);
    } catch (e) {
      return Error.of([e.message as string], this.params);
    }
  }
  public chain<R, P>(
    fn: (x: Data<T, Q>) => Resource<R, P>
  ): Resource<R, Q | P> {
    return fn(this);
  }
  public matchWith<R>(pattern: ResourcePattern<any, Q, R>): R {
    return pattern.Data(this);
  }
  public matchWithPartial(pattern: PartialPattern<any, Q>): void {
    if (pattern.Data) {
      pattern.Data(this);
    }
  }
  public update(params: Q): Query<Q> {
    return Query.of(params);
  }
}

export class Empty<Q> implements ResourceMethods<any, Q> {
  readonly type = ResourceTypes.Empty;
  constructor(readonly params: Q) {}
  static of<Q>(params: Q): Empty<Q> {
    return new Empty<Q>(params);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public map<R>(_: (x: any) => R): Empty<Q> {
    return this;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public chain<R, P>(_: (x: any) => Resource<R, Q | P>): Empty<Q> {
    return this;
  }
  public matchWith<R>(pattern: ResourcePattern<any, Q, R>): R {
    return pattern.Empty(this);
  }
  public matchWithPartial(pattern: PartialPattern<any, Q>): void {
    if (pattern.Empty) {
      pattern.Empty(this);
    }
  }
  public update(params: Q): Query<Q> {
    return Query.of(params);
  }
}

export class Error<Q> implements ResourceMethods<any, Q> {
  readonly type = ResourceTypes.Error;
  constructor(readonly messages: string[], readonly params: Q) {}
  static of<Q>(messages: string[], params: Q): Error<Q> {
    return new Error(messages, params);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public map<R>(_: (x: any) => R): Error<Q> {
    return this;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public chain<R, P>(_: (x: any) => Resource<R, Q | P>): Error<Q> {
    return this;
  }
  public matchWith<R>(pattern: ResourcePattern<any, Q, R>): R {
    return pattern.Error(this);
  }
  public matchWithPartial(pattern: PartialPattern<any, Q>): void {
    if (pattern.Error) {
      pattern.Error(this);
    }
  }
  public update(params: Q): Query<Q> {
    return Query.of(params);
  }
}

export const matchWith = <T, Q, R>(
  resource: Resource<T, Q>,
  pattern: ResourcePattern<T, Q, R>
): R => {
  switch (resource.type) {
    case ResourceTypes.Data:
      return pattern.Data(resource);
    case ResourceTypes.Query:
      return pattern.Query(resource);
    case ResourceTypes.Empty:
      return pattern.Empty(resource);
    case ResourceTypes.Error:
      return pattern.Error(resource);
  }
};

const isData = <T, Q>(resource: Resource<T, Q>): boolean =>
  resource.type === ResourceTypes.Data;
const isQuery = <T, Q>(resource: Resource<T, Q>): boolean =>
  resource.type === ResourceTypes.Query;
const isError = <T, Q>(resource: Resource<T, Q>): boolean =>
  resource.type === ResourceTypes.Error;
const isEmpty = <T, Q>(resource: Resource<T, Q>): boolean =>
  resource.type === ResourceTypes.Empty;

export const hasInstance = {
  Data: isData,
  Error: isError,
  Query: isQuery,
  Empty: isEmpty
};

export const overPromise = <R, Q>(
  params: Q,
  promise: Promise<R>
): Promise<Data<R, Q> | Error<Q>> =>
  promise.then(
    (value: R) => Data.of(value, params),
    (error) => Error.of([error.message as string], params)
  );

export const Resource = {
  Data: Data.of,
  Query: Query.of,
  Error: Error.of,
  Empty: Empty.of,
  matchWith,
  isData,
  isQuery,
  isError,
  isEmpty,
  overPromise,
  hasInstance
};

export default Resource;
