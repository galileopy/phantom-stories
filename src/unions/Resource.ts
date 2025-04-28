export enum ResourceTypes {
  Data = "Data",
  Query = "Query",
  Empty = "Empty",
  Failure = "Failure"
}
export type Resource<T, Q> =
  | Data<T, Q>
  | Query<Q>
  | Empty<Q>
  | Failure<Q>;

export interface ResourcePattern<T, Q, R> {
  Query: (resource: Query<Q>) => R;
  Data: (resource: Data<T, Q>) => R;
  Empty: (resource: Empty<Q>) => R;
  Failure: (resource: Failure<Q>) => R;
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
  getDataOr: (value: T) => T;
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
  public getDataOr(value: any): any {
    return value;
  }
}

// Subtypes constructors
export class Data<T, Q> implements ResourceMethods<T, Q> {
  readonly type = ResourceTypes.Data;
  constructor(
    readonly value: T,
    readonly params: Q
  ) {}
  static of<T, Q>(value: T, params: Q): Data<T, Q> {
    return new Data(value, params);
  }

  public map<R>(fn: (x: T) => R): Data<R, Q> | Failure<Q> {
    try {
      const result = fn(this.value);
      return Data.of(result, this.params);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      return Failure.of([message], this.params); // Pass the derived message string in an array
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
  public getDataOr(): T {
    return this.value;
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
  public getDataOr(value: any): any {
    return value;
  }
}

export class Failure<Q> implements ResourceMethods<any, Q> {
  readonly type = ResourceTypes.Failure;
  constructor(
    readonly messages: string[],
    readonly params: Q
  ) {}
  static of<Q>(messages: string[], params: Q): Failure<Q> {
    return new Failure(messages, params);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public map<R>(_: (x: any) => R): Failure<Q> {
    return this;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public chain<R, P>(_: (x: any) => Resource<R, Q | P>): Failure<Q> {
    return this;
  }
  public matchWith<R>(pattern: ResourcePattern<any, Q, R>): R {
    return pattern.Failure(this);
  }
  public matchWithPartial(pattern: PartialPattern<any, Q>): void {
    if (pattern.Failure) {
      pattern.Failure(this);
    }
  }
  public update(params: Q): Query<Q> {
    return Query.of(params);
  }
  public getDataOr(value: any): any {
    return value;
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
    case ResourceTypes.Failure:
      return pattern.Failure(resource);
  }
};

const isData = <T, Q>(resource: Resource<T, Q>): boolean =>
  resource.type === ResourceTypes.Data;
const isQuery = <T, Q>(resource: Resource<T, Q>): boolean =>
  resource.type === ResourceTypes.Query;
const isFailure = <T, Q>(resource: Resource<T, Q>): boolean =>
  resource.type === ResourceTypes.Failure;
const isEmpty = <T, Q>(resource: Resource<T, Q>): boolean =>
  resource.type === ResourceTypes.Empty;

export const hasInstance = {
  Data: isData,
  Failure: isFailure,
  Query: isQuery,
  Empty: isEmpty
};

export const overPromise = <R, Q>(
  params: Q,
  promise: Promise<R>
): Promise<Data<R, Q> | Failure<Q>> =>
  promise.then(
    (value: R) => Data.of(value, params),
    (error) => {
      // Check if error is an instance of the built-in Error before accessing message
      const message =
        error instanceof globalThis.Error
          ? error.message
          : String(error);
      return Failure.of([message], params); // Pass the derived message string in an array
    }
  );

export const Resource = {
  Data: Data.of,
  Query: Query.of,
  Failure: Failure.of,
  Empty: Empty.of,
  matchWith,
  isData,
  isQuery,
  isFailure,
  isEmpty,
  overPromise,
  hasInstance
};

export default Resource;
