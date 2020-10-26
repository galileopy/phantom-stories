import Resource, { Data } from "../Resource";

describe("Resource", () => {
  it("can chain data", () => {
    const one = new Data("1", {});
    const two = new Data(2, {});
    const three = one.chain((data) =>
      two.map((x) => [x, data.value])
    ) as Data<[number, string], unknown>;
    expect(Resource.isData(three)).toBe(true);
    three.map((x) => {
      expect(x);
      return null;
    });
  });
});
