import { Resource, Data, Query, Empty, Failure } from "./Resource";

// Utility functions
const id = <T>(x: T): T => x;
const compose =
  <A, B, C>(f: (b: B) => C, g: (a: A) => B) =>
  (x: A): C =>
    f(g(x));

// Helper to compare Resource instances with deep equality for params
const resourceEquals = <T, Q>(
  a: Resource<T, Q>,
  b: Resource<T, Q>
): boolean => {
  return a.matchWith({
    Data: (d1: Data<T, Q>) =>
      b.matchWith({
        Data: (d2: Data<T, Q>) =>
          d1.value === d2.value &&
          JSON.stringify(d1.params) === JSON.stringify(d2.params),
        Query: () => false,
        Empty: () => false,
        Failure: () => false
      }),
    Query: (q1: Query<Q>) =>
      b.matchWith({
        Data: () => false,
        Query: (q2: Query<Q>) =>
          JSON.stringify(q1.params) === JSON.stringify(q2.params),
        Empty: () => false,
        Failure: () => false
      }),
    Empty: (e1: Empty<Q>) =>
      b.matchWith({
        Data: () => false,
        Query: () => false,
        Empty: (e2: Empty<Q>) =>
          JSON.stringify(e1.params) === JSON.stringify(e2.params),
        Failure: () => false
      }),
    Failure: (f1: Failure<Q>) =>
      b.matchWith({
        Data: () => false,
        Query: () => false,
        Empty: () => false,
        Failure: (f2: Failure<Q>) =>
          f1.messages.join() === f2.messages.join() &&
          JSON.stringify(f1.params) === JSON.stringify(f2.params)
      })
  });
};

describe("Resource", () => {
  const params = { id: "123" };
  const data = Data.of(42, params);
  const query = Query.of(params);
  const empty = Empty.of(params);
  const failure = Failure.of(["error"], params);

  describe("Functor Laws", () => {
    test("Identity: map(id) === id", () => {
      expect(resourceEquals(data.map(id), data)).toBe(true);
      expect(resourceEquals(query.map(id), query)).toBe(true);
      expect(resourceEquals(empty.map(id), empty)).toBe(true);
      expect(resourceEquals(failure.map(id), failure)).toBe(true);
    });

    test("Composition: map(f ∘ g) === map(f) ∘ map(g)", () => {
      const f = (x: number) => x + 1;
      const g = (x: number) => x * 2;
      expect(
        resourceEquals(data.map(compose(f, g)), data.map(g).map(f))
      ).toBe(true);
      expect(
        resourceEquals(query.map(compose(f, g)), query.map(g).map(f))
      ).toBe(true);
      expect(
        resourceEquals(empty.map(compose(f, g)), empty.map(g).map(f))
      ).toBe(true);
      expect(
        resourceEquals(
          failure.map(compose(f, g)),
          failure.map(g).map(f)
        )
      ).toBe(true);
    });
  });

  describe("Applicative Functor Laws", () => {
    test("Identity: pure(id).ap(v) === v", () => {
      const pureId = Data.of(id, params);
      expect(resourceEquals(pureId.ap(data), data)).toBe(true);
      expect(resourceEquals(pureId.ap(query), query)).toBe(true);
      expect(resourceEquals(pureId.ap(empty), empty)).toBe(true);
      expect(resourceEquals(pureId.ap(failure), failure)).toBe(true);
      expect(resourceEquals(query.ap(data), query)).toBe(true);
      expect(resourceEquals(empty.ap(data), empty)).toBe(true);
      expect(resourceEquals(failure.ap(data), failure)).toBe(true);
    });

    test("Homomorphism: ap(pure(f))(pure(x)) === pure(f(x))", () => {
      const f = (x: number) => x + 1;
      const x = 42;
      const pureF = Data.of(f, params);
      const pureX = Data.of(x, params);
      const left = pureF.ap(pureX);
      const right = Data.of(f(x), params);
      expect(resourceEquals(left, right)).toBe(true);
    });

    test("Interchange: u <*> pure y === pure ($ y) <*> u", () => {
      const u = Data.of((x: number) => x + 1, params);
      const y = 42;
      const pureY = Data.of(y, params);
      const left = u.ap(pureY);
      const pureApplyY = Data.of(
        (fn: (y: number) => number) => fn(y),
        params
      );
      const right = pureApplyY.ap(u);
      expect(resourceEquals(left, right)).toBe(true);
    });

    test("Composition: ap(ap(pure(compose))(u))(v) === ap(u)(ap(v))", () => {
      const u = Data.of((x: number) => x + 1, params);
      const v = Data.of((x: number) => x * 2, params);
      const w = Data.of(42, params);
      const left = w.ap(v.ap(u.ap(Data.of(compose, params))));
      const right = w.ap(u).ap(v);
      expect(resourceEquals(left, right)).toBe(true);
    });
  });

  describe("Monad Laws", () => {
    test("Left Identity: of(a).chain(f) === f(a)", () => {
      const a = 42;
      const f = (d: Data<number, { id: string }>) =>
        Data.of(d.value + 1, d.params);
      const left = Data.of(a, params).chain(f);
      const right = f(Data.of(a, params));
      expect(resourceEquals(left, right)).toBe(true);
    });

    test("Right Identity: m.chain(of) === m", () => {
      expect(
        resourceEquals(
          data.chain((d: Data<number, { id: string }>) =>
            d.of(d.value)
          ),
          data
        )
      ).toBe(true);
      expect(
        resourceEquals(
          query.chain((d: Data<any, { id: string }>) =>
            d.of(d.value)
          ),
          query
        )
      ).toBe(true);
      expect(
        resourceEquals(
          empty.chain((d: Data<any, { id: string }>) =>
            d.of(d.value)
          ),
          empty
        )
      ).toBe(true);
      expect(
        resourceEquals(
          failure.chain((d: Data<any, { id: string }>) =>
            d.of(d.value)
          ),
          failure
        )
      ).toBe(true);
    });

    test("Associativity: m.chain(f).chain(g) === m.chain(x => f(x).chain(g))", () => {
      const f = (d: Data<number, { id: string }>) =>
        Data.of(d.value + 1, d.params);
      const g = (d: Data<number, { id: string }>) =>
        Data.of(d.value * 2, d.params);
      const left = data.chain(f).chain(g);
      const right = data.chain((x: Data<number, { id: string }>) =>
        f(x).chain(g)
      );
      expect(resourceEquals(left, right)).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    test("mapSafe handles errors correctly", () => {
      const fn = () => {
        throw new Error("Test error");
      };
      const result = data.mapSafe(fn);
      expect(result).toBeInstanceOf(Failure);
      expect(
        result.matchWith({
          Data: () => false,
          Query: () => false,
          Empty: () => false,
          Failure: (f: Failure<{ id: string }>) =>
            f.messages.includes("Test error")
        })
      ).toBe(true);
    });

    test("map is pure and throws errors", () => {
      const fn = () => {
        throw new Error("Test error");
      };
      expect(() => data.map(fn)).toThrow("Test error");
    });

    test("Non-Data variants ignore map, chain, ap", () => {
      const fn = (x: number) => x + 1;
      expect(query.map(fn)).toBe(query);
      expect(empty.map(fn)).toBe(empty);
      expect(failure.map(fn)).toBe(failure);

      const chainFn = (d: Data<number, { id: string }>) =>
        Data.of(d.value + 1, d.params);
      expect(query.chain(chainFn)).toBe(query);
      expect(empty.chain(chainFn)).toBe(empty);
      expect(failure.chain(chainFn)).toBe(failure);

      const apFnResource = Data.of(fn, params);
      const dataResource = Data.of(10, params);
      expect(resourceEquals(query.ap(dataResource), query)).toBe(
        true
      );
      expect(resourceEquals(empty.ap(dataResource), empty)).toBe(
        true
      );
      expect(resourceEquals(failure.ap(dataResource), failure)).toBe(
        true
      );

      const queryVal = Query.of(params);
      const emptyVal = Empty.of(params);
      const failureVal = Failure.of(["val error"], params);
      expect(
        resourceEquals(apFnResource.ap(queryVal), queryVal)
      ).toBe(true);
      expect(
        resourceEquals(apFnResource.ap(emptyVal), emptyVal)
      ).toBe(true);
      expect(
        resourceEquals(apFnResource.ap(failureVal), failureVal)
      ).toBe(true);
    });

    // Legacy test: getDataOr extracts value or returns fallback
    test("getDataOr extracts current value or returns fallback", () => {
      const fallback = "some string";
      expect(data.getDataOr(fallback)).toEqual(42);
      expect(query.getDataOr(fallback)).toEqual(fallback);
      expect(empty.getDataOr(fallback)).toEqual(fallback);
      expect(failure.getDataOr(fallback)).toEqual(fallback);
    });

    // Legacy-inspired test: mapSafe handles errors like run/validate
    test("mapSafe handles transformation errors", () => {
      const message = "This should be an error message";
      const fn = () => {
        throw new Error(message);
      };
      const result = data.mapSafe(fn);
      expect(result).toBeInstanceOf(Failure);
      if (result instanceof Failure) {
        expect(result.params).toEqual(params);
        expect(result.messages).toContain(message);
      }
    });

    // Legacy-inspired test: overPromise handles promise resolution like runPromise
    test("overPromise resolves to Data or Failure", async () => {
      const value = { foo: "bar" };
      const message = "This should be an error message";
      const success = await Resource.overPromise(
        params,
        Promise.resolve(value)
      );
      expect(success).toBeInstanceOf(Data);
      if (success instanceof Data) {
        expect(success.value).toEqual(value);
        expect(success.params).toEqual(params);
      }
      const error = await Resource.overPromise(
        params,
        Promise.reject(new Error(message))
      );
      expect(error).toBeInstanceOf(Failure);
      if (error instanceof Failure) {
        expect(error.messages).toContain(message);
        expect(error.params).toEqual(params);
      }
    });
  });

  describe("Optional Parameters Handling", () => {
    const dataNoParams = Data.of<number, undefined>(100);
    const queryNoParams = Query.of<undefined>();
    const emptyNoParams = Empty.of<undefined>();
    const failureNoParams = Failure.of<undefined>([
      "no params error"
    ]);
    const addOne = (x: number) => x + 1;
    const dataFnNoParams = Data.of<typeof addOne, undefined>(addOne);

    // Legacy test: Constructors handle params
    test("Constructors handle defined and undefined params", () => {
      expect(data.params).toEqual(params);
      expect(query.params).toEqual(params);
      expect(empty.params).toEqual(params);
      expect(failure.params).toEqual(params);
      expect(dataNoParams.params).toBeUndefined();
      expect(queryNoParams.params).toBeUndefined();
      expect(emptyNoParams.params).toBeUndefined();
      expect(failureNoParams.params).toBeUndefined();
    });

    test("map preserves undefined params", () => {
      expect(dataNoParams.map(addOne).params).toBeUndefined();
      expect(queryNoParams.map(addOne).params).toBeUndefined();
      expect(emptyNoParams.map(addOne).params).toBeUndefined();
      expect(failureNoParams.map(addOne).params).toBeUndefined();
    });

    test("mapSafe preserves undefined params", () => {
      expect(dataNoParams.mapSafe(addOne).params).toBeUndefined();
      const safeFail = dataNoParams.mapSafe(() => {
        throw new Error("fail");
      });
      expect(safeFail.params).toBeUndefined();
      expect(queryNoParams.mapSafe(addOne).params).toBeUndefined();
      expect(emptyNoParams.mapSafe(addOne).params).toBeUndefined();
      expect(failureNoParams.mapSafe(addOne).params).toBeUndefined();
    });

    test("ap preserves undefined params where appropriate", () => {
      expect(dataFnNoParams.ap(dataNoParams).params).toBeUndefined();
      const dataFnWithParams = Data.of<typeof addOne, { id: string }>(
        addOne,
        { id: "func" }
      );
      expect(
        dataFnWithParams.ap(dataNoParams).params
      ).toBeUndefined();
      const dataWithParams = Data.of<number, { id: string }>(50, {
        id: "val"
      });
      const result = dataFnNoParams.ap(dataWithParams);
      expect(result.params).toEqual({ id: "val" });
      expect(dataFnNoParams.ap(queryNoParams).params).toBeUndefined();
      expect(dataFnNoParams.ap(emptyNoParams).params).toBeUndefined();
      expect(
        dataFnNoParams.ap(failureNoParams).params
      ).toBeUndefined();
    });

    test("chain handles params correctly", () => {
      const chainFnData = (_d: Data<number, undefined>) =>
        Data.of<number, { inner: boolean }>(200, { inner: true });
      const chainFnQuery = (_d: Data<number, undefined>) =>
        Query.of<{ inner: boolean }>({ inner: true });
      const chainFnFailure = (_d: Data<number, undefined>) =>
        Failure.of<{ inner: boolean }>(["inner fail"], {
          inner: true
        });
      expect(dataNoParams.chain(chainFnData).params).toEqual({
        inner: true
      });
      expect(dataNoParams.chain(chainFnQuery).params).toEqual({
        inner: true
      });
      expect(dataNoParams.chain(chainFnFailure).params).toEqual({
        inner: true
      });
      expect(queryNoParams.chain(chainFnData).params).toBeUndefined();
      expect(emptyNoParams.chain(chainFnData).params).toBeUndefined();
      expect(
        failureNoParams.chain(chainFnData).params
      ).toBeUndefined();
    });

    test("of preserves undefined params", () => {
      expect(dataNoParams.of(5).params).toBeUndefined();
      expect(queryNoParams.of(5).params).toBeUndefined();
      expect(emptyNoParams.of(5).params).toBeUndefined();
      expect(failureNoParams.of(5).params).toBeUndefined();
    });

    // Legacy test: update adds params
    test("update adds params", () => {
      const newParams = { updated: true };
      expect(dataNoParams.update(newParams).params).toEqual(
        newParams
      );
      expect(queryNoParams.update(newParams).params).toEqual(
        newParams
      );
      expect(emptyNoParams.update(newParams).params).toEqual(
        newParams
      );
      expect(failureNoParams.update(newParams).params).toEqual(
        newParams
      );
      expect(data.update(newParams).params).toEqual(newParams); // No merging, unlike legacy
    });

    test("matchWith receives undefined params", () => {
      const pattern = {
        Data: (r: Data<any, any>) => expect(r.params).toBeUndefined(),
        Query: (r: Query<any>) => expect(r.params).toBeUndefined(),
        Empty: (r: Empty<any>) => expect(r.params).toBeUndefined(),
        Failure: (r: Failure<any>) => expect(r.params).toBeUndefined()
      };
      dataNoParams.matchWith(pattern);
      queryNoParams.matchWith(pattern);
      emptyNoParams.matchWith(pattern);
      failureNoParams.matchWith(pattern);
    });
  });
});

describe("Resource simplified constructors", () => {
  test("Data constructor", () => {
    const resource = Resource.Data(42, { id: "123" });
    expect(resource).toBeInstanceOf(Data);
    expect(resource.value).toEqual(42);
    expect(resource.params).toEqual({ id: "123" });
  });
  test("Query constructor", () => {
    const resource = Resource.Query({ id: "123" });
    expect(resource).toBeInstanceOf(Query);
    expect(resource.params).toEqual({ id: "123" });
  });
  test("Empty constructor", () => {
    const resource = Resource.Empty({ id: "123" });
    expect(resource).toBeInstanceOf(Empty);
    expect(resource.params).toEqual({ id: "123" });
  });
  test("Failure constructor", () => {
    const resource = Resource.Failure(["error"], { id: "123" });
    expect(resource).toBeInstanceOf(Failure);
    expect(resource.messages).toEqual(["error"]);
    expect(resource.params).toEqual({ id: "123" });
  });
  test("overPromise constructor", async () => {
    const resource = await Resource.overPromise(
      { id: "123" },
      Promise.resolve(42)
    );
    expect(resource).toBeInstanceOf(Data);
    expect(resource.getDataOr(null)).toEqual(42);
    expect(resource.params).toEqual({ id: "123" });
  });
});
