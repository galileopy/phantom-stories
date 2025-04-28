import React from "react";
import { mergeDeepRight } from "ramda";
import {
  Resource,
  Query,
  Empty,
  Data,
  Failure
} from "../unions/Resource";

/**
 * Base props for rendering a Resource ADT state.
 * @typeParam T - The type of the data in `Data` state.
 * @typeParam Q - The type of optional parameters.
 */
export interface ResourceRendererProps<T, Q> {
  /** The Resource instance to render. */
  resource: Resource<T, Q>;
}

/**
 * Props for the Data component, used when the Resource is in a Data state.
 * @typeParam T - The type of the data in `Data` state.
 * @typeParam Q - The type of optional parameters.
 */
export interface ResourceDataProps<T, Q> extends ResourceRendererProps<T, Q> {
  /** The data value from the Data state. */
  value: T;
  /** Optional parameters associated with the Data state. */
  params?: Q;
}

/**
 * Props for the Query component, used when the Resource is in a Query state.
 * @typeParam T - The type of the data in `Data` state (unused in Query).
 * @typeParam Q - The type of optional parameters.
 */
export interface ResourceQueryProps<T, Q>
  extends ResourceRendererProps<T, Q> {
  /** Optional parameters associated with the Query state. */
  params?: Q;
}

/**
 * Props for the Empty component, used when the Resource is in an Empty state.
 * @typeParam T - The type of the data in `Data` state (unused in Empty).
 * @typeParam Q - The type of optional parameters.
 */
export interface ResourceEmptyProps<T, Q>
  extends ResourceRendererProps<T, Q> {
  /** Optional parameters associated with the Empty state. */
  params?: Q;
}

/**
 * Props for the Failure component, used when the Resource is in a Failure state.
 * @typeParam T - The type of the data in `Data` state (unused in Failure).
 * @typeParam Q - The type of optional parameters.
 */
export interface ResourceFailureProps<T, Q>
  extends ResourceRendererProps<T, Q> {
  /** Optional parameters associated with the Failure state. */
  params?: Q;
  /** Array of error messages from the Failure state. */
  messages: string[];
}

/**
 * Props for the ResourceRender component, which renders a Resource ADT using provided state components.
 * @typeParam T - The type of the data in `Data` state.
 * @typeParam Q - The type of optional parameters.
 */
interface Props<T, Q> {
  /** The Resource instance to render. */
  resource: Resource<T, Q>;
  /** Component to render for the Data state. */
  Data: React.FC<ResourceDataProps<T, Q>>;
  /** Component to render for the Query state. */
  Query: React.FC<ResourceQueryProps<T, Q>>;
  /** Component to render for the Empty state. */
  Empty: React.FC<ResourceEmptyProps<T, Q>>;
  /** Component to render for the Failure state. */
  Failure: React.FC<ResourceFailureProps<T, Q>>;
  /** Common props to pass to all state components. */
  commonProps?: any;
  /** State-specific props to merge with commonProps for each state. */
  matchingProps?: {
    Data?: any;
    Query?: any;
    Empty?: any;
    Failure?: any;
  };
}

/**
 * A component that renders a Resource ADT by matching its state to provided Data, Query, Empty, or Failure components.
 * Supports merging common and state-specific props for flexible rendering.
 * @typeParam T - The type of the data in `Data` state.
 * @typeParam Q - The type of optional parameters.
 * @param props - The component props, including the Resource instance, rendering components, and optional props.
 * @returns A React node representing the rendered Resource state.
 *
 * @example
 * const MyData: React.FC<DataProps<number, { id: string }>> = ({ value, params }) => <p>Data: {value}</p>;
 * const MyQuery: React.FC<QueryProps<number, { id: string }>> = () => <p>Loading...</p>;
 * const MyEmpty: React.FC<EmptyProps<number, { id: string }>> = () => <p>Empty</p>;
 * const MyFailure: React.FC<FailureProps<number, { id: string }>> = ({ messages }) => <p>Errors: {messages.join(', ')}</p>;
 * const resource = Resource.Data(42, { id: 'test' });
 * <ResourceRender
 *   resource={resource}
 *   Data={MyData}
 *   Query={MyQuery}
 *   Empty={MyEmpty}
 *   Failure={MyFailure}
 *   commonProps={{ className: 'resource' }}
 *   matchingProps={{ Data: { style: { color: 'blue' } } }}
 * />
 */
export const ResourceRender = <T, Q>(
  props: Props<T, Q>
): React.ReactNode => {
  const {
    resource,
    Data,
    Query,
    Empty,
    Failure,
    commonProps,
    matchingProps
  } = props;

  const specific = mergeDeepRight(
    {
      Data: {},
      Query: {},
      Empty: {},
      Failure: {}
    },
    matchingProps || {}
  );

  return resource.matchWith({
    Query({ params }: Query<Q>) {
      return (
        <Query
          resource={resource}
          params={params}
          {...mergeDeepRight(commonProps || {}, specific.Query)}
        />
      );
    },
    Empty({ params }: Empty<Q>) {
      return (
        <Empty
          resource={resource}
          params={params}
          {...mergeDeepRight(commonProps || {}, specific.Empty)}
        />
      );
    },
    Data({ value, params }: Data<T, Q>) {
      return (
        <Data
          resource={resource}
          value={value}
          params={params}
          {...mergeDeepRight(commonProps || {}, specific.Data)}
        />
      );
    },
    Failure({ messages, params }: Failure<Q>) {
      return (
        <Failure
          resource={resource}
          messages={messages}
          params={params}
          {...mergeDeepRight(commonProps || {}, specific.Failure)}
        />
      );
    }
  });
};

export default ResourceRender;
