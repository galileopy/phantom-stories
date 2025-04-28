# Phantom Stories

A TypeScript library for managing asynchronous data states with functional programming, designed for use with Redux Toolkit, Redux Observables, and React.

## Installation

```bash
npm install phantom-stories
```

## Usage

```typescript
import { Resource } from "phantom-stories";

const userResource = Resource.Data(
  { id: "123", name: "Jane" },
  { endpoint: "/users" }
);
const upperCaseName = userResource.map((user) => ({
  ...user,
  name: user.name.toUpperCase()
}));
```

## API Documentation

[View the full API documentation](https://galileopy.github.io/phantom-stories/)

## Testing

```bash
npm run test
```

## License

GPL-3.0-or-later
