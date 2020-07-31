import React from "react";
import { Validation, Failure, Success } from "../unions/Validation";

export interface ValidationRenderProps<T> {
  validation: Validation<T>;
}

export interface SuccessProps<T> extends ValidationRenderProps<T> {
  value: T;
}
export interface FailureProps<T> extends ValidationRenderProps<T> {
  messages: string[];
}

interface Props<T> {
  validation: Validation<T>;
  Success: React.FC<SuccessProps<T>>;
  Failure: React.FC<FailureProps<T>>;
}

export const ValidationRender = function <P>(
  props: Props<P>
): JSX.Element {
  const { validation, Success, Failure } = props;
  return validation.matchWith({
    Success(success: Success<P>) {
      return <Success validation={success} value={success.value} />;
    },
    Failure(failure: Failure) {
      return (
        <Failure validation={failure} messages={failure.messages} />
      );
    }
  });
};

export default ValidationRender;
