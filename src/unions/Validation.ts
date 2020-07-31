export enum ValidationTypes {
  Success = "Success",
  Failure = "Failure"
}

export interface ValidationPattern<T, R> {
  Success: (validation: Success<T>) => R;
  Failure: (validation: Failure) => R;
}

type PartialPattern<T> = Partial<ValidationPattern<T, void>>;

export interface ValidationMethods<T> {
  map: <R>(fn: (x: T) => R) => Validation<T | R>;
  chain: <R>(
    fn: (x: Success<T>) => Validation<R>
  ) => Validation<T | R>;
  matchWith: <R>(pattern: ValidationPattern<T, R>) => R;
  matchWithPartial: (pattern: PartialPattern<T>) => void;
  concat: <Q>(validation: Validation<Q>) => Success<T | Q> | Failure;
}

export class Failure implements ValidationMethods<any> {
  readonly type = ValidationTypes.Failure;
  constructor(readonly messages: string[]) {}
  static of(messages: string[]): Failure {
    return new Failure(messages);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public map<R>(_: (x: any) => R): Failure {
    return this;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public chain<R>(_: (x: any) => Validation<R>): Failure {
    return this;
  }
  public matchWith<R>(pattern: ValidationPattern<any, R>): R {
    return pattern.Failure(this);
  }
  public matchWithPartial(pattern: PartialPattern<any>): void {
    if (pattern.Failure) {
      pattern.Failure(this);
    }
  }
  public concat<R>(validation: Validation<R>): Validation<R> {
    return isFailure(validation)
      ? Failure.of(
          (validation as Failure).messages.concat(this.messages)
        )
      : this;
  }
}

export class Success<T> implements ValidationMethods<T> {
  readonly type = ValidationTypes.Success;
  constructor(readonly value: T) {}
  static of<T>(value: T): Success<T> {
    return new Success(value);
  }

  public map<R>(fn: (x: T) => R): Success<R> {
    const result = fn(this.value);
    return Success.of(result);
  }
  public chain<R>(
    fn: (x: Success<T>) => Validation<R>
  ): Validation<R> {
    return fn(this);
  }
  public matchWith(pattern: ValidationPattern<T, any>): any {
    return pattern.Success(this);
  }
  public matchWithPartial(pattern: PartialPattern<T>): void {
    if (pattern.Success) {
      pattern.Success(this);
    }
  }
  public concat<R>(validation: Validation<R>): Validation<R> {
    return validation;
  }
}

export const matchWith = <T, R>(
  resource: Validation<T>,
  pattern: ValidationPattern<T, R>
): R => {
  switch (resource.type) {
    case ValidationTypes.Success:
      return pattern.Success(resource);
    case ValidationTypes.Failure:
      return pattern.Failure(resource);
  }
};
const isSuccess = <T>(resource: Validation<T>): boolean =>
  resource.type === ValidationTypes.Success;
const isFailure = <T>(resource: Validation<T>): boolean =>
  resource.type === ValidationTypes.Failure;

export const hasInstance = {
  Success: isSuccess,
  Failure: isFailure
};

export type Validation<T> = Success<T> | Failure;
export const Validation = {
  Success: Success.of,
  Failure: Failure.of,
  matchWith,
  isSuccess,
  isFailure,
  hasInstance
};

export default Validation;
