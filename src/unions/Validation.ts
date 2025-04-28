
/**
 * A sum type for validating data in a functional programming style.
 * Represents two states: passing (`Passing`) with a value, or failing (`Failing`) with error messages.
 * Supports functor (`map`), monad (`chain`, `of`), and semigroup (`concat`) operations for declarative validation.
 * Designed for use with Redux Toolkit, Redux Observables, and React.
 *
 * @typeParam T - The type of the data in `Passing` state.
 *
 * @example
 * // Create a Validation for a passing value
 * const passing = Validation.Passing(42);
 *
 * // Map the value
 * const doubled = passing.map(x => x * 2); // Passing<84>
 *
 * // Render in React with matchWith
 * const render = passing.matchWith({
 *   Passing: ({ value }) => <p>Valid: {value}</p>,
 *   Failing: ({ messages }) => <p>Errors: {messages.join(', ')}</p>,
 * });
 */
export enum ValidationTypes {
  Passing = "Passing",
  Failing = "Failing"
}

/**
 * Union type for Validation variants.
 */
export type Validation<T> = Passing<T> | Failing;

/**
 * Pattern for matching Validation states, used with `matchWith`.
 * @typeParam T - The type of the data in `Passing` state.
 * @typeParam R - The return type of the pattern functions.
 */
export interface ValidationPattern<T, R> {
  Passing: (validation: Passing<T>) => R;
  Failing: (validation: Failing) => R;
}

/**
 * Partial pattern for side-effecting matches.
 */
type PartialPattern<T> = Partial<ValidationPattern<T, void>>;

/**
 * Interface for Validation methods, implementing functor, monad, and semigroup operations.
 */
export interface ValidationMethods<T> {
  /**
   * Transforms the `Passing` value using a function, preserving the Validation structure.
   * Acts as a functor operation, similar to `Array.map`. `Failing` returns unchanged.
   *
   * @param fn - Function to transform the `Passing` value.
   * @returns A new Validation with the transformed value (for `Passing`) or the same instance (for `Failing`).
   *
   * @example
   * const passing = Validation.Passing(42);
   * const result = passing.map(x => x + 1); // Passing<43>
   */
  map: <R>(fn: (x: T) => R) => Validation<R>;

  /**
   * Chains a function that returns a Validation, enabling monadic composition.
   * For `Passing`, applies the function; for `Failing`, returns unchanged.
   *
   * @param fn - Function that takes a `Passing` and returns a new Validation.
   * @returns The Validation returned by `fn` (for `Passing`) or the same instance (for `Failing`).
   *
   * @example
   * const passing = Validation.Passing(42);
   * const result = passing.chain(v => Validation.Passing(v.value * 2)); // Passing<84>
   */
  chain: <R>(fn: (x: Passing<T>) => Validation<R>) => Validation<R>;

  /**
   * Matches the Validation state with a pattern, returning a value.
   * Enables declarative state handling, similar to a `switch` statement.
   *
   * @param pattern - Object with functions for each Validation state.
   * @returns The result of the matching function.
   *
   * @example
   * const validation = Validation.Passing(42);
   * const result = validation.matchWith({
   *   Passing: ({ value }) => value * 2,
   *   Failing: () => 0,
   * }); // 84
   */
  matchWith: <R>(pattern: ValidationPattern<T, R>) => R;

  /**
   * Matches the Validation state with a partial pattern, performing side effects.
   *
   * @param pattern - Partial object with functions for some Validation states.
   *
   * @example
   * Validation.Failing(['error']).matchWithPartial({
   *   Failing: ({ messages }) => console.log(messages),
   * });
   */
  matchWithPartial: (pattern: PartialPattern<T>) => void;

  /**
   * Combines this Validation with another, following semigroup rules.
   * Returns `Passing` if both are `Passing`, otherwise returns a `Failing` with concatenated messages.
   *
   * @param validation - Another Validation to combine with.
   * @returns A new Validation combining the states.
   *
   * @example
   * const passing = Validation.Passing(42);
   * const failing = Validation.Failing(['error']);
   * const result = passing.concat(failing); // Failing<['error']>
   */
  concat: <R>(validation: Validation<R>) => Validation<T | R>;
}

/**
 * Represents a failing validation state with error messages.
 */
export class Failing implements ValidationMethods<never> {
  readonly type = ValidationTypes.Failing;

  constructor(readonly messages: string[]) {}

  /**
   * Creates a new `Failing` Validation.
   * @param messages - Array of error messages.
   */
  static of(messages: string[]): Failing {
    return new Failing(messages);
  }

  public map<R>(_fn: (x: never) => R): Failing {
    return this;
  }

  public chain<R>(_fn: (x: Passing<never>) => Validation<R>): Failing {
    return this;
  }

  public matchWith<R>(pattern: ValidationPattern<never, R>): R {
    return pattern.Failing(this);
  }

  public matchWithPartial(pattern: PartialPattern<never>): void {
    if (pattern.Failing) {
      pattern.Failing(this);
    }
  }

  public concat<R>(validation: Validation<R>): Validation<R> {
    return isFailing(validation)
      ? Failing.of([...this.messages, ...validation.messages])
      : this;
  }
}

/**
 * Represents a passing validation state with a value.
 * @typeParam T - The type of the data.
 */
export class Passing<T> implements ValidationMethods<T> {
  readonly type = ValidationTypes.Passing;

  constructor(readonly value: T) {}

  /**
   * Creates a new `Passing` Validation.
   * @param value - The validated value.
   */
  static of<T>(value: T): Passing<T> {
    return new Passing(value);
  }

  public map<R>(fn: (x: T) => R): Passing<R> {
    const result = fn(this.value);
    return Passing.of(result);
  }

  public chain<R>(fn: (x: Passing<T>) => Validation<R>): Validation<R> {
    return fn(this);
  }

  public matchWith<R>(pattern: ValidationPattern<T, R>): R {
    return pattern.Passing(this);
  }

  public matchWithPartial(pattern: PartialPattern<T>): void {
    if (pattern.Passing) {
      pattern.Passing(this);
    }
  }

  public concat<R>(validation: Validation<R>): Validation<R> {
    return validation;
  }
}

/**
 * Matches a Validation with a pattern, returning a value.
 * @param validation - The Validation to match.
 * @param pattern - Pattern object with functions for each state.
 */
export const matchWith = <T, R>(
  validation: Validation<T>,
  pattern: ValidationPattern<T, R>
): R => {
  switch (validation.type) {
    case ValidationTypes.Passing:
      return pattern.Passing(validation);
    case ValidationTypes.Failing:
      return pattern.Failing(validation);
  }
};

/**
 * Type predicates for Validation variants.
 */
export const isPassing = <T>(validation: Validation<T>): validation is Passing<T> =>
  validation.type === ValidationTypes.Passing;
export const isFailing = <T>(validation: Validation<T>): validation is Failing =>
  validation.type === ValidationTypes.Failing;

/**
 * Validation utilities and constructors.
 */
export const hasInstance = {
  Passing: isPassing,
  Failing: isFailing
};

/**
 * Validation utilities and constructors.
 */
export const Validation = {
  Passing: Passing.of,
  Failing: Failing.of,
  matchWith,
  isPassing,
  isFailing,
  hasInstance
};

export default Validation;
