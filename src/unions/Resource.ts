/**
 * A sum type for managing asynchronous data states in a functional programming style.
 * Represents four states: success (`Data`), loading (`Query`), empty (`Empty`), or failure (`Failure`).
 * Supports functor, applicative functor, and monad operations for declarative transformations.
 * Designed for use with Redux Toolkit, Redux Observables, and React.
 *
 * @typeParam T - The type of the data in `Data` state.
 * @typeParam Q - The type of optional parameters (e.g., query params for API calls).
 *
 * @example
 * // Create a Resource for a user fetch
 * const userResource = Resource.Data({ id: '123', name: 'Jane' }, { endpoint: '/users' });
 *
 * // Transform data with map
 * const upperCaseName = userResource.map(user => ({ ...user, name: user.name.toUpperCase() }));
 *
 * // Render in React with matchWith
 * const render = userResource.matchWith({
 *   Data: ({ value }) => <h1>Welcome, {value.name}!</h1>,
 *   Query: () => <p>Loading...</p>,
 *   Empty: () => <p>No user found</p>,
 *   Failure: ({ messages }) => <p>Error: {messages.join(', ')}</p>,
 * });
 */
export enum ResourceTypes {
  Data = "Data",
  Query = "Query",
  Empty = "Empty",
  Failure = "Failure"
}

/**
 * Union type for Resource variants.
 */
export type Resource<T, Q> =
  | Data<T, Q>
  | Query<Q>
  | Empty<Q>
  | Failure<Q>;

/**
 * Pattern for matching Resource states, used with `matchWith`.
 * @typeParam T - The type of the data in `Data` state.
 * @typeParam Q - The type of optional parameters.
 * @typeParam R - The return type of the pattern functions.
 */
export interface ResourcePattern<T, Q, R> {
  Query: (resource: Query<Q>) => R;
  Data: (resource: Data<T, Q>) => R;
  Empty: (resource: Empty<Q>) => R;
  Failure: (resource: Failure<Q>) => R;
}

/**
 * Partial pattern for side-effecting matches.
 */
type PartialPattern<T, Q> = Partial<ResourcePattern<T, Q, void>>;

/**
 * Interface for Resource methods, implementing functor, applicative functor, and monad operations.
 */
export interface ResourceMethods<T, Q> {
  /**
   * Transforms the `Data` value using a function, preserving the Resource structure.
   * Acts as a functor operation, similar to `Array.map`. Non-`Data` variants return unchanged.
   *
   * @param fn - Function to transform the `Data` value.
   * @returns A new Resource with the transformed value (for `Data`) or the same instance (for others).
   *
   * @example
   * const data = Resource.Data(42, { id: '123' });
   * const result = data.map(x => x + 1); // Data<43, { id: '123' }>
   */
  map: <R>(fn: (x: T) => R) => Resource<R, Q>;

  /**
   * Safely transforms the `Data` value, catching errors and returning `Failure` if the function throws.
   * Useful for error-prone operations (e.g., parsing JSON).
   *
   * @param fn - Function to transform the `Data` value.
   * @returns A new `Data` with the transformed value or `Failure` if an error occurs.
   *
   * @example
   * const data = Resource.Data('{"name": "Jane"}', { id: '123' });
   * const result = data.mapSafe(JSON.parse); // Data<{ name: 'Jane' }> or Failure
   */
  mapSafe: <R>(fn: (x: T) => R) => Resource<R, Q>;

  /**
   * Chains a function that returns a Resource, enabling monadic composition.
   * For `Data`, applies the function; for others, returns unchanged.
   *
   * @param fn - Function that takes a `Data` and returns a new Resource.
   * @returns The Resource returned by `fn` (for `Data`) or the same instance (for others).
   *
   * @example
   * const data = Resource.Data(42, { id: '123' });
   * const result = data.chain(d => Resource.Data(d.value * 2, d.params)); // Data<84, { id: '123' }>
   */
  chain: <R, P>(
    fn: (x: Data<T, Q>) => Resource<R, P>
  ) => Resource<R, P>;

  /**
   * Applies a function wrapped in a Resource to the `Data` value, supporting applicative functor operations.
   * For `Data`, applies the function if the input is `Data`; otherwise, returns unchanged.
   *
   * @param resource - Resource containing a function to apply.
   * Applies a function wrapped in this Resource (`Data` variant) to a value wrapped in another Resource.
   * Supports applicative functor operations. `this` must be a `Data` containing a function.
   * Standard definition: `f (a -> b) -> f a -> f b`
   *
   * @param resourceWithValue - Resource containing the value to apply the function to.
   * @returns A new Resource with the applied result or the original non-Data/Failure state.
   *
   * @example
   * const fnRes = Resource.Data((x: number) => x + 1, { id: '123' });
   * const dataRes = Resource.Data(42, { id: '123' });
   * const result = fnRes.ap(dataRes); // Data<43, { id: '123' }>
   *
   * const failureFn = Resource.Failure<(x: number) => number>(['fn error']);
   * const result2 = failureFn.ap(dataRes); // Failure<number> (propagates failure from function resource)
   *
   * const failureVal = Resource.Failure<number>(['val error']);
   * const result3 = fnRes.ap(failureVal); // Failure<number> (propagates failure from value resource)
   */
  // QVal allows the value resource to have a different param type than the function resource (this)
  ap: <A, B, QVal>(
    resourceWithValue: Resource<A, QVal>
  ) => Resource<B, QVal>;

  /**
   * Lifts a value into a `Data` Resource, preserving existing `params` (if any).
   * Acts as the monadic `pure` operation.
   *
   * @param value - Value to lift into `Data`.
   * @returns A new `Data` Resource with the value and existing `params`.
   *
   * @example
   * const data = Resource.Data(42, { id: '123' });
   * const result = data.of(100); // Data<100, { id: '123' }>
   */
  of: <R>(value: R) => Resource<R, Q>;

  /**
   * Matches the Resource state with a pattern, returning a value.
   * Enables declarative state handling, similar to a `switch` statement.
   *
   * @param pattern - Object with functions for each Resource state.
   * @returns The result of the matching function.
   *
   * @example
   * const resource = Resource.Data(42, { id: '123' });
   * const result = resource.matchWith({
   *   Data: ({ value }) => value * 2,
   *   Query: () => 0,
   *   Empty: () => 0,
   *   Failure: () => 0,
   * }); // 84
   */
  matchWith: <R>(pattern: ResourcePattern<T, Q, R>) => R;

  /**
   * Matches the Resource state with a partial pattern, performing side effects.
   *
   * @param pattern - Partial object with functions for some Resource states.
   *
   * @example
   * Resource.Failure(['error']).matchWithPartial({
   *   Failure: ({ messages }) => console.log(messages),
   * });
   */
  matchWithPartial: (pattern: PartialPattern<T, Q>) => void;

  /**
   * Transitions to a `Query` state with new parameters.
   *
   * @param params - New parameters for the `Query`.
   * @returns A new `Query` Resource.
   *
   * @example
   * const data = Resource.Data(42, { id: '123' });
   * const query = data.update({ id: '456' }); // Query<{ id: '456' }>
   */
  // Allows updating to a new parameter type P
  update: <P>(params: P) => Query<P>;

  /**
   * Returns the `Data` value or a fallback value for non-`Data` states.
   *
   * @param value - Fallback value for non-`Data` states.
   * @returns The `Data` value or the fallback.
   *
   * @example
   * const data = Resource.Data(42);
   * const value = data.getDataOr(0); // 42
   * const failure = Resource.Failure(['error']);
   * const fallback = failure.getDataOr(0); // 0
   */
  getDataOr: (value: T) => T;
}

/**
 * Represents a loading state, typically for asynchronous operations.
 */
export class Query<Q> implements ResourceMethods<any, Q> {
  readonly type = ResourceTypes.Query;

  constructor(readonly params?: Q) {}

  /**
   * Creates a new `Query` Resource.
   * @param params - Optional parameters (e.g., query params).
   */
  static of<Q>(params?: Q): Query<Q> {
    return new Query<Q>(params);
  }

  public map<R>(_fn: (x: any) => R): Query<Q> {
    return this;
  }

  public mapSafe<R>(_fn: (x: any) => R): Query<Q> {
    return this;
  }

  public chain<R, P>(
    _fn: (x: Data<any, Q>) => Resource<R, P>
  ): Resource<R, P> {
    // Changed return type
    // Return Query, but cast to the expected return type.
    // This assumes P is compatible with Q or the context handles it.
    return this as unknown as Resource<R, P>;
  }

  // Query contains no function, so ap returns Query, preserving QVal but changing T to B
  public ap<A, B, QVal>(
    _resourceWithValue: Resource<A, QVal>
  ): Resource<B, QVal> {
    // Returns Query with the params from the *value* resource
    return Query.of(_resourceWithValue.params);
  }

  public of<R>(value: R): Data<R, Q> {
    return Data.of(value, this.params);
  }

  public matchWith<R>(pattern: ResourcePattern<any, Q, R>): R {
    return pattern.Query(this);
  }

  public matchWithPartial(pattern: PartialPattern<any, Q>): void {
    if (pattern.Query) {
      pattern.Query(this);
    }
  }

  public update<P>(params: P): Query<P> {
    // Matches new interface signature
    return Query.of(params);
  }

  public getDataOr(value: any): any {
    return value;
  }
}

/**
 * Represents a successful state with data.
 */
export class Data<T, Q> implements ResourceMethods<T, Q> {
  readonly type = ResourceTypes.Data;

  constructor(
    readonly value: T,
    readonly params?: Q
  ) {}

  /**
   * Creates a new `Data` Resource.
   * @param value - The data value.
   * @param params - Optional parameters.
   */
  static of<T, Q>(value: T, params?: Q): Data<T, Q> {
    return new Data(value, params);
  }

  public map<R>(fn: (x: T) => R): Data<R, Q> {
    const result = fn(this.value);
    return Data.of(result, this.params);
  }

  public mapSafe<R>(fn: (x: T) => R): Data<R, Q> | Failure<Q> {
    try {
      const result = fn(this.value);
      return Data.of(result, this.params);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      return Failure.of([message], this.params);
    }
  }

  public chain<R, P>(
    fn: (x: Data<T, Q>) => Resource<R, P>
  ): Resource<R, P> {
    return fn(this);
  }

  // Standard applicative ap: Applies the function in `this` (if Data) to the value in `resourceWithValue`
  public ap<A, B, QVal>(
    resourceWithValue: Resource<A, QVal>
  ): Resource<B, QVal> {
    // Matches new interface signature
    // Runtime check to ensure 'this' actually holds a function
    if (typeof this.value !== "function") {
      // This case should ideally not happen if used correctly, but handle defensively
      // Return Failure with the params from the *value* resource
      return Failure.of(
        [
          `Resource.ap called on Data variant that does not contain a function`
        ],
        resourceWithValue.params
      );
    }
    const fn = this.value as (a: A) => B; // Cast after check

    // If the value resource is not Data, propagate its state (Query, Empty, Failure)
    // Re-wrap the non-data state with the correct type param B and params from value resource
    if (resourceWithValue.type !== ResourceTypes.Data) {
      switch (resourceWithValue.type) {
        // Return the non-data state with its original QVal params
        case ResourceTypes.Query:
          return Query.of(resourceWithValue.params);
        case ResourceTypes.Empty:
          return Empty.of(resourceWithValue.params);
        case ResourceTypes.Failure:
          return Failure.of(
            resourceWithValue.messages,
            resourceWithValue.params
          );
      }
    }
    // Both are Data, apply the function (map the value resource with our function)
    // The result will have the params from the value resource (QVal)
    return resourceWithValue.map(fn);
  }

  public of<R>(value: R): Data<R, Q> {
    return Data.of(value, this.params);
  }

  public matchWith<R>(pattern: ResourcePattern<T, Q, R>): R {
    return pattern.Data(this);
  }

  public matchWithPartial(pattern: PartialPattern<T, Q>): void {
    if (pattern.Data) {
      pattern.Data(this);
    }
  }

  public update<P>(params: P): Query<P> {
    // Matches new interface signature
    return Query.of(params);
  }

  public getDataOr(_ingore: unknown): T {
    return this.value;
  }
}

/**
 * Represents an empty state (e.g., no data returned).
 */
export class Empty<Q> implements ResourceMethods<any, Q> {
  readonly type = ResourceTypes.Empty;

  constructor(readonly params?: Q) {}

  /**
   * Creates a new `Empty` Resource.
   * @param params - Optional parameters.
   */
  static of<Q>(params?: Q): Empty<Q> {
    return new Empty<Q>(params);
  }

  public map<R>(_fn: (x: any) => R): Empty<Q> {
    return this;
  }

  public mapSafe<R>(_fn: (x: any) => R): Empty<Q> {
    return this;
  }

  public chain<R, P>(
    _fn: (x: Data<any, Q>) => Resource<R, P>
  ): Resource<R, P> {
    // Changed return type
    return this as unknown as Resource<R, P>;
  }

  // Empty contains no function, so ap returns Empty, preserving QVal but changing T to B
  public ap<A, B, QVal>(
    _resourceWithValue: Resource<A, QVal>
  ): Resource<B, QVal> {
    // Returns Empty with the params from the *value* resource
    return Empty.of(_resourceWithValue.params);
  }

  public of<R>(value: R): Data<R, Q> {
    return Data.of(value, this.params);
  }

  public matchWith<R>(pattern: ResourcePattern<any, Q, R>): R {
    return pattern.Empty(this);
  }

  public matchWithPartial(pattern: PartialPattern<any, Q>): void {
    if (pattern.Empty) {
      pattern.Empty(this);
    }
  }

  public update<P>(params: P): Query<P> {
    // Matches new interface signature
    return Query.of(params);
  }

  public getDataOr(value: any): any {
    return value;
  }
}

/**
 * Represents a failed state with error messages.
 */
export class Failure<Q> implements ResourceMethods<any, Q> {
  readonly type = ResourceTypes.Failure;

  constructor(
    readonly messages: string[],
    readonly params?: Q
  ) {}

  /**
   * Creates a new `Failure` Resource.
   * @param messages - Array of error messages.
   * @param params - Optional parameters.
   */
  static of<Q>(messages: string[], params?: Q): Failure<Q> {
    return new Failure(messages, params);
  }

  public map<R>(_fn: (x: any) => R): Failure<Q> {
    return this;
  }

  public mapSafe<R>(_fn: (x: any) => R): Failure<Q> {
    return this;
  }

  public chain<R, P>(
    _fn: (x: Data<any, Q>) => Resource<R, P>
  ): Resource<R, P> {
    // Changed return type
    return this as unknown as Resource<R, P>;
  }

  // Failure contains no function, so ap returns Failure, preserving QVal but changing T to B
  public ap<A, B, QVal>(
    _resourceWithValue: Resource<A, QVal>
  ): Resource<B, QVal> {
    // Returns Failure with the params from the *value* resource
    return Failure.of(this.messages, _resourceWithValue.params);
  }

  public of<R>(value: R): Data<R, Q> {
    return Data.of(value, this.params);
  }

  public matchWith<R>(pattern: ResourcePattern<any, Q, R>): R {
    return pattern.Failure(this);
  }

  public matchWithPartial(pattern: PartialPattern<any, Q>): void {
    if (pattern.Failure) {
      pattern.Failure(this);
    }
  }

  public update<P>(params: P): Query<P> {
    // Matches new interface signature
    return Query.of(params);
  }

  public getDataOr(value: any): any {
    return value;
  }
}

/**
 * Matches a Resource with a pattern, returning a value.
 * @param resource - The Resource to match.
 * @param pattern - Pattern object with functions for each state.
 */
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

/**
 * Type predicates for Resource variants.
 */
export const isData = <T, Q>(resource: Resource<T, Q>): boolean =>
  resource.type === ResourceTypes.Data;
export const isQuery = <T, Q>(resource: Resource<T, Q>): boolean =>
  resource.type === ResourceTypes.Query;
export const isFailure = <T, Q>(resource: Resource<T, Q>): boolean =>
  resource.type === ResourceTypes.Failure;
export const isEmpty = <T, Q>(resource: Resource<T, Q>): boolean =>
  resource.type === ResourceTypes.Empty;

export const hasInstance = {
  Data: isData,
  Failure: isFailure,
  Query: isQuery,
  Empty: isEmpty
};

/**
 * Wraps a Promise in a Resource, resolving to `Data` or `Failure`.
 * @param params - Optional parameters.
 * @param promise - The Promise to wrap.
 */
export const overPromise = <R, Q>(
  params: Q | undefined,
  promise: Promise<R>
): Promise<Data<R, Q> | Failure<Q>> =>
  promise.then(
    (value: R) => Data.of(value, params),
    (error) => {
      const message =
        error instanceof globalThis.Error
          ? error.message
          : String(error);
      return Failure.of([message], params);
    }
  );

/**
 * Resource utilities and constructors.
 */
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
