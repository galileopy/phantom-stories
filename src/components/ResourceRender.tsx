import React from "react";
import { merge } from "remeda";
import {
  Resource,
  Query,
  Empty,
  Data,
  Error
} from "../unions/Resource";

export interface ResourcerRendererProps<T, Q> {
  resource: Resource<T, Q>;
}

export interface DataProps<T, Q>
  extends ResourcerRendererProps<T, Q> {
  value: T;
  params: Q;
}
export interface QueryProps<T, Q>
  extends ResourcerRendererProps<T, Q> {
  params: Q;
}
export interface ErrorProps<T, Q>
  extends ResourcerRendererProps<T, Q> {
  params: Q;
  messages: string[];
}
export interface EmptyProps<T, Q>
  extends ResourcerRendererProps<T, Q> {
  params: Q;
}

interface Props<T, Q> {
  resource: Resource<T, Q>;
  Data: React.FC<DataProps<T, Q>>;
  Query: React.FC<QueryProps<T, Q>>;
  Empty: React.FC<EmptyProps<T, Q>>;
  Error: React.FC<ErrorProps<T, Q>>;
  commonProps?: any;
  matchingProps?: {
    Data?: any;
    Query?: any;
    Empty?: any;
    Error?: any;
  };
}

export const ResourceRender = <T, Q>(
  props: Props<T, Q>
): JSX.Element => {
  const { resource, Data, Query, Empty, Error } = props;
  const { commonProps, matchingProps } = props;

  const specific = merge(
    {
      Data: {},
      Query: {},
      Empty: {},
      Error: {}
    },
    matchingProps || {}
  );

  return resource.matchWith({
    Query({ params }: Query<Q>) {
      return (
        <Query
          resource={resource}
          params={params}
          {...merge(commonProps || {}, specific.Query)}
        />
      );
    },
    Empty({ params }: Empty<Q>) {
      return (
        <Empty
          resource={resource}
          params={params}
          {...merge(commonProps || {}, specific.Empty)}
        />
      );
    },
    Data({ value, params }: Data<T, Q>) {
      return (
        <Data
          resource={resource}
          value={value}
          params={params}
          {...merge(commonProps || {}, specific.Data)}
        />
      );
    },
    Error({ messages, params }: Error<Q>) {
      return (
        <Error
          resource={resource}
          messages={messages}
          params={params}
          {...merge(commonProps || {}, specific.Error)}
        />
      );
    }
  });
};

export default ResourceRender;
