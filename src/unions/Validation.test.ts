import { Validation, Passing, Failing, isPassing, isFailing } from "./Validation";

// Utility functions
const id = <T>(x: T): T => x;
const compose =
  <A, B, C>(f: (b: B) => C, g: (a: A) => B) =>
  (x: A): C =>
    f(g(x));

// Helper to compare Validation instances
const validationEquals = <T>(
  a: Validation<T>,
  b: Validation<T>
): boolean => {
  return a.matchWith({
    Passing: (p1: Passing<T>) => isPassing(b) && p1.value === b.value,
    Failing: (f1: Failing) =>
      isFailing(b) && f1.messages.join() === b.messages.join()
  });
};

describe("Validation", () => {
  const passing = Validation.Passing(42);
  const failing = Validation.Failing(["error"]);

  describe("Functor Laws", () => {
    test("Identity: map(id) === id", () => {
      expect(validationEquals(passing.map(id), passing)).toBe(true);
      expect(validationEquals(failing.map(id), failing)).toBe(true);
    });

    test("Composition: map(f ∘ g) === map(f) ∘ map(g)", () => {
      const f = (x: number) => x + 1;
      const g = (x: number) => x * 2;
      expect(
        validationEquals(
          passing.map(compose(f, g)),
          passing.map(g).map(f)
        )
      ).toBe(true);
      expect(
        validationEquals(
          failing.map(compose(f, g)),
          failing.map(g).map(f)
        )
      ).toBe(true);
    });
  });

  describe("Monad Laws", () => {
    test("Left Identity: of(a).chain(f) === f(a)", () => {
      const a = 42;
      const f = (p: Passing<number>) => Validation.Passing(p.value + 1);
      const left = Validation.Passing(a).chain(f);
      const right = f(Validation.Passing(a));
      expect(validationEquals(left, right)).toBe(true);
    });

    test("Right Identity: m.chain(of) === m", () => {
      expect(
        validationEquals(
          passing.chain((p) => Validation.Passing(p.value)),
          passing
        )
      ).toBe(true);
      expect(
        validationEquals(
          failing.chain((p) => Validation.Passing(p.value)),
          failing
        )
      ).toBe(true);
    });

    test("Associativity: m.chain(f).chain(g) === m.chain(x => f(x).chain(g))", () => {
      const f = (p: Passing<number>) => Validation.Passing(p.value + 1);
      const g = (p: Passing<number>) => Validation.Passing(p.value * 2);
      const left = passing.chain(f).chain(g);
      const right = passing.chain((x) => f(x).chain(g));
      expect(validationEquals(left, right)).toBe(true);
    });
  });

  describe("Semigroup (concat)", () => {
    test("Passing.concat(Passing) returns second Passing", () => {
      const passing2 = Validation.Passing(100);
      const result = passing.concat(passing2);
      expect(validationEquals(result, passing2)).toBe(true);
    });

    test("Passing.concat(Failing) returns Failing", () => {
      const result = passing.concat(failing);
      expect(validationEquals(result, failing)).toBe(true);
    });

    test("Failing.concat(Passing) returns Failing", () => {
      const passing2 = Validation.Passing(100);
      const result = failing.concat(passing2);
      expect(validationEquals(result, failing)).toBe(true);
    });

    test("Failing.concat(Failing) concatenates messages", () => {
      const failing2 = Validation.Failing(["another error"]);
      const result = failing.concat(failing2);
      expect(isFailing(result)).toBe(true);
      // Add type guard before accessing messages
      if (isFailing(result)) {
        expect(result.messages).toEqual(["error", "another error"]);
      }
    });
  });

  describe("Pattern Matching", () => {
    test("matchWith handles Passing and Failing", () => {
      const passingResult = passing.matchWith({
        Passing: (p) => p.value * 2,
        Failing: () => 0
      });
      expect(passingResult).toBe(84);

      const failingResult = failing.matchWith({
        Passing: () => 0,
        Failing: (f) => f.messages.length
      });
      expect(failingResult).toBe(1);
    });

    test("matchWithPartial performs side effects", () => {
      let passingCalled = false;
      let failingCalled = false;

      passing.matchWithPartial({
        Passing: () => {
          passingCalled = true;
        }
      });
      expect(passingCalled).toBe(true);
      expect(failingCalled).toBe(false);

      failing.matchWithPartial({
        Failing: () => {
          failingCalled = true;
        }
      });
      expect(failingCalled).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    test("Failing ignores map", () => {
      const fn = (x: number) => x + 1;
      expect(validationEquals(failing.map(fn), failing)).toBe(true);
    });

    test("Failing ignores chain", () => {
      const fn = (p: Passing<number>) => Validation.Passing(p.value + 1);
      expect(validationEquals(failing.chain(fn), failing)).toBe(true);
    });

    test("Empty Failing messages", () => {
      const emptyFailing = Validation.Failing([]);
      expect(isFailing(emptyFailing)).toBe(true);
      // Need type guard for messages access
      if (isFailing(emptyFailing)) {
        expect(emptyFailing.messages).toEqual([]);
      }
    });

    test("Passing with null value", () => {
      const nullPassing = Validation.Passing(null);
      expect(isPassing(nullPassing)).toBe(true);
      expect(nullPassing.value).toBeNull();
    });
  });
});
