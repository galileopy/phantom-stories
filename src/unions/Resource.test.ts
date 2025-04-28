import {
  Resource,
  Data,
  Query,
  Empty,
  Failure,
  ResourceTypes // Import ResourceTypes
} from "./Resource";

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
    // Law: pure id <*> v === v
    test("Identity: pure(id).ap(v) === v", () => {
      const pureId = Data.of(id, params);
      expect(resourceEquals(pureId.ap(data), data)).toBe(true);
      // Non-data values remain unchanged when id is applied
      expect(resourceEquals(pureId.ap(query), query)).toBe(true);
      expect(resourceEquals(pureId.ap(empty), empty)).toBe(true);
      expect(resourceEquals(pureId.ap(failure), failure)).toBe(true);
      // Non-data functions applied to values also return the value's state
      expect(resourceEquals(query.ap(data), query)).toBe(true); // Assuming Query.ap returns Query
      expect(resourceEquals(empty.ap(data), empty)).toBe(true); // Assuming Empty.ap returns Empty
      expect(resourceEquals(failure.ap(data), failure)).toBe(true); // Assuming Failure.ap returns Failure
    });

    test("Homomorphism: ap(pure(f))(pure(x)) === pure(f(x))", () => {
      const f = (x: number) => x + 1;
      const x = 42;
      const pureF = Data.of(f, params);
      const pureX = Data.of(x, params);

      // Law: pure f <*> pure x === pure (f x)
      const left = pureF.ap(pureX);
      const right = Data.of(f(x), params);
      expect(resourceEquals(left, right)).toBe(true);
    });

    test("Interchange: u <*> pure y === pure ($ y) <*> u", () => {
      const u = Data.of((x: number) => x + 1, params); // Resource with function
      const y = 42; // Plain value
      const pureY = Data.of(y, params); // Resource with value

      // Law: u <*> pure y === pure ($ y) <*> u
      const left = u.ap(pureY);
      // pure ($ y) === Data.of( (f: (y: number) => R) => f(y) )
      const pureApplyY = Data.of(
        (fn: (y: number) => number) => fn(y),
        params
      );
      const right = pureApplyY.ap(u);

      expect(resourceEquals(left, right)).toBe(true);
    });

    // Test sequential application using a curried function
    test("Sequential Application: pure(curried_h).ap(fx).ap(fy)", () => {
      // Curried function h = x => y => x + y
      const curriedAdd = (x: number) => (y: number) => x + y;
      const pureH = Data.of(curriedAdd, params);
      const fx = Data.of(10, params);
      const fy = Data.of(20, params);

      // pure(h).ap(fx) should yield Data(y => 10 + y)
      const intermediate = pureH.ap(fx);

      // Check intermediate state (optional but good for debugging)
      // Perform type check *before* accessing value
      if (intermediate.type === ResourceTypes.Data) {
        expect(typeof intermediate.value).toBe("function");
      } else {
        // If intermediate is not Data, something went wrong in the test setup or ap logic
        throw new Error(
          "Intermediate step in Composition test did not result in Data"
        );
      }

      // intermediate.ap(fy) should yield Data(10 + 20) = Data(30)
      const result = intermediate.ap(fy);

      const expected = Data.of(curriedAdd(10)(20), params); // Data(30)

      expect(resourceEquals(result, expected)).toBe(true);

      // Test with non-data in the chain
      const queryY = Query.of<{ id: string }>(params);
      const emptyY = Empty.of<{ id: string }>(params);
      const failureY = Failure.of<{ id: string }>(["fail"], params);
      // Applying a function resource (intermediate) to non-data should yield the non-data state
      expect(resourceEquals(intermediate.ap(queryY), queryY)).toBe(
        true
      );
      expect(resourceEquals(intermediate.ap(emptyY), emptyY)).toBe(
        true
      );
      expect(
        resourceEquals(intermediate.ap(failureY), failureY)
      ).toBe(true);
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
      const dataResource = Data.of(10, params); // Need a value resource to apply to

      // Non-Data function resources applied to Data value resource
      expect(resourceEquals(query.ap(dataResource), query)).toBe(
        true
      );
      expect(resourceEquals(empty.ap(dataResource), empty)).toBe(
        true
      );
      expect(resourceEquals(failure.ap(dataResource), failure)).toBe(
        true
      );

      // Data function resource applied to non-Data value resource
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
  });

  describe("Optional Parameters Handling", () => {
    // Explicitly type Q as undefined for resources without params
    const dataNoParams = Data.of<number, undefined>(100);
    const queryNoParams = Query.of<undefined>();
    const emptyNoParams = Empty.of<undefined>();
    const failureNoParams = Failure.of<undefined>([
      "no params error"
    ]);
    const addOne = (x: number) => x + 1;
    const dataFnNoParams = Data.of<typeof addOne, undefined>(addOne);

    test("Constructors handle undefined params", () => {
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
      // func(no_param).ap(val(no_param)) -> no_param
      expect(dataFnNoParams.ap(dataNoParams).params).toBeUndefined();
      // func(param).ap(val(no_param)) -> no_param (params from value resource take precedence)
      const dataFnWithParams = Data.of<typeof addOne, { id: string }>(
        addOne,
        { id: "func" }
      );
      expect(
        dataFnWithParams.ap(dataNoParams).params
      ).toBeUndefined();
      // func(no_param).ap(val(param)) -> param (params from value resource take precedence)
      const dataWithParams = Data.of<number, { id: string }>(50, {
        id: "val"
      });
      // No cast needed - ap signature <A, B, QVal> handles different Q types.
      // Resulting resource gets QVal from dataWithParams.
      const result = dataFnNoParams.ap(dataWithParams);
      expect(result.params).toEqual({ id: "val" });

      // Non-data propagation (params come from the non-data resource)
      expect(dataFnNoParams.ap(queryNoParams).params).toBeUndefined();
      expect(dataFnNoParams.ap(emptyNoParams).params).toBeUndefined();
      expect(dataFnNoParams.ap(emptyNoParams).params).toBeUndefined();
      expect(
        dataFnNoParams.ap(failureNoParams).params
      ).toBeUndefined();
    });

    test("chain handles params correctly", () => {
      // Define chain functions with explicit types matching dataNoParams (Q = undefined)
      const chainFnData = (_d: Data<number, undefined>) =>
        Data.of<number, { inner: boolean }>(200, { inner: true });
      const chainFnQuery = (_d: Data<number, undefined>) =>
        Query.of<{ inner: boolean }>({ inner: true });
      const chainFnFailure = (_d: Data<number, undefined>) =>
        Failure.of<{ inner: boolean }>(["inner fail"], {
          inner: true
        });

      // If chain returns Data, params are from the *inner* Data
      expect(dataNoParams.chain(chainFnData).params).toEqual({
        inner: true
      });
      // If chain returns non-Data, params are from the *inner* non-Data resource
      expect(dataNoParams.chain(chainFnQuery).params).toEqual({
        inner: true
      });
      expect(dataNoParams.chain(chainFnFailure).params).toEqual({
        inner: true
      });

      // Non-data resources ignore chain, preserving their original undefined params
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
