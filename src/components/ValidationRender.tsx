import React from "react";
import { Validation, Failing, Passing } from "../unions/Validation";

/**
 * Props for rendering a Validation ADT state.
 * @typeParam T - The type of the data in `Passing` state.
 */
export interface ValidationRenderProps<T> {
  /** The Validation instance to render. */
  validation: Validation<T>;
}

/**
 * Props for the Passing component, used when the Validation is in a Passing state.
 * @typeParam T - The type of the data in `Passing` state.
 */
export interface PassingProps<T> extends ValidationRenderProps<T> {
  /** The validated value from the Passing state. */
  value: T;
}

/**
 * Props for the Failing component, used when the Validation is in a Failing state.
 * @typeParam T - The type of the data in `Passing` state (unused in Failing).
 */
export interface FailingProps<T> extends ValidationRenderProps<T> {
  /** Array of error messages from the Failing state. */
  messages: string[];
}

/**
 * Props for the ValidationRender component, which renders a Validation ADT using provided Passing and Failing components.
 * @typeParam T - The type of the data in `Passing` state.
 */
interface Props<T> {
  /** The Validation instance to render. */
  validation: Validation<T>;
  /** Component to render for the Passing state. */
  Passing: React.FC<PassingProps<T>>;
  /** Component to render for the Failing state. */
  Failing: React.FC<FailingProps<T>>;
}

/**
 * A component that renders a Validation ADT by matching its state to provided Passing or Failing components.
 * @typeParam T - The type of the data in `Passing` state.
 * @param props - The component props, including the Validation instance and rendering components.
 * @returns A React node representing the rendered Validation state.
 *
 * @example
 * const MyPassing: React.FC<PassingProps<number>> = ({ value }) => <p>Valid: {value}</p>;
 * const MyFailing: React.FC<FailingProps<number>> = ({ messages }) => <p>Errors: {messages.join(', ')}</p>;
 * const validation = Validation.Passing(42);
 * <ValidationRender validation={validation} Passing={MyPassing} Failing={MyFailing} />
 */
export const ValidationRender = function <T>(
  props: Props<T>
): React.ReactNode {
  const { validation, Passing, Failing } = props;
  return validation.matchWith({
    Passing(passing: Passing<T>) {
      return <Passing validation={passing} value={passing.value} />;
    },
    Failing(failing: Failing) {
      return (
        <Failing validation={failing} messages={failing.messages} />
      );
    }
  });
};
