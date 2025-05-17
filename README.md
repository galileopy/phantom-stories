# Phantom Stories

**Phantom Stories** is a TypeScript library for managing asynchronous data states and validation using functional programming (FP) principles. Built for seamless integration with **Redux Toolkit**, **Redux Observables**, and **React**, it provides algebraic data types (ADTs) like `Resource` and `Validation` to handle complex state transitions and form validation declaratively. Whether you're fetching data, managing loading states, or validating user input, Phantom Stories brings FP elegance to your JavaScript applications.

## Features

- **Resource ADT**: Manage async states with four variants:
  - `Data`: Successful state with a value.
  - `Query`: Loading state.
  - `Empty`: No data state.
  - `Failure`: Error state with messages.
- **Validation ADT**: Handle validation with two variants:
  - `Passing`: Valid state with a value.
  - `Failing`: Invalid state with error messages.
- **FP Constructs**: Supports functors (`map`), applicative functors (`ap`), monads (`chain`), and semigroups (`concat`) for declarative transformations.
- **TypeScript Support**: Strong typing with comprehensive TSDoc for type safety and IDE support.
- **React Integration**: Render ADTs with `ResourceRender` and `ValidationRender` components.
- **Redux Compatibility**: Works with Redux Toolkit and Redux Observables for state management and async flows.
- **Open Source**: Licensed under **GPL-3.0-or-later**

## Installation

Install the library via npm:

```bash
npm install @galileopy/phantom-stories
```

Ensure you have the peer dependencies installed:

```json
"peerDependencies": {
  "react": "^19.0.0",
  "react-dom": "^19.0.0"
}
```

## Usage

Phantom Stories provides two main ADTs: `Resource` for async state management and `Validation` for data validation. Below are quick examples, followed by a showcase of a settings page.

### Resource Example

Manage async data states in a Redux/React application:

```typescript
import { Resource, ResourceRender } from '@galileopy/phantom-stories';
import React from 'react';

// Define components for each Resource state
const DataComponent: React.FC = ({ value }) => <p>Data: {value}</p>;
const QueryComponent: React.FC = () => <p>Loading...</p>;
const EmptyComponent: React.FC = () => <p>No data</p>;
const FailureComponent: React.FC = ({ messages }) => <p>Error: {messages.join(', ')}</p>;

// Create a Resource instance
const userResource = Resource.Data({ id: '123', name: 'Jane' }, { endpoint: '/users' });

// Transform data with map
const upperCaseName = userResource.map(user => ({
  ...user,
  name: user.name.toUpperCase(),
}));

// Render in React
function App() {
  return (
    <ResourceRender
      resource={upperCaseName}
      Data={DataComponent}
      Query={QueryComponent}
      Empty={EmptyComponent}
      Failure={FailureComponent}
    />
  );
}
```

### Validation Example

Validate form input with the `Validation` ADT:

```typescript
import { Validation, ValidationRender } from '@galileopy/phantom-stories';
import React from 'react';

// Define components for Validation states
const PassingComponent: React.FC = ({ value }) => <p>Valid: {value}</p>;
const FailingComponent: React.FC = ({ messages }) => <ul>{messages.map(msg => <li key={msg}>{msg}</li>)}</ul>;

// Validate a password
const passwordValidation = password =>
  password.length >= 8
    ? Validation.Passing(password)
    : Validation.Failing(['Password must be at least 8 characters']);

// Render in React
function Form() {
  const password = 'secret';
  return (
    <ValidationRender
      validation={passwordValidation(password)}
      Passing={PassingComponent}
      Failing={FailingComponent}
    />
  );
}
```

## API Documentation

Explore the full API documentation at [https://galileopy.github.io/phantom-stories/](https://galileopy.github.io/phantom-stories/). It includes detailed TSDoc for `Resource`, `Validation`, `ResourceRender`, and `ValidationRender`, with examples and type information.

## Testing

Run the test suite to verify functionality:

```bash
npm run test
```

To run specific tests:

```bash
npm run test:validation  # Tests for Validation ADT
```

The library includes comprehensive tests for:
- Functor, applicative functor, and monad laws (`Resource`, `Validation`).
- Semigroup operations (`Validation.concat`).
- Edge cases (e.g., `Resource.getDataOr`, empty `Validation.Failing` messages).
- React component rendering (`ResourceRender`, `ValidationRender`).

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository: `https://github.com/galileopy/phantom-stories`.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Commit changes: `git commit -m "Add your feature"`.
4. Push to your fork: `git push origin feature/your-feature`.
5. Open a pull request.

Please follow the coding style (Prettier, ESLint) and include tests for new features. Check the [issues](https://github.com/galileopy/phantom-stories/issues) for ideas or report bugs.

## Development

To set up the project locally:

```bash
git clone https://github.com/galileopy/phantom-stories.git
cd phantom-stories
npm install
npm run build
npm run test
npm run docs
```

- **Build**: `npm run build` generates `build/index.js` and `build/index.es.js`.
- **Tests**: `npm run test` runs Jest with TypeScript support.
- **Documentation**: `npm run docs` generates TypeDoc output in `docs/`, deployed to GitHub Pages.

## License

This project is licensed under the [GNU General Public License v3.0 or later](LICENSE). See the [LICENSE](LICENSE) file for details.

## Contact

- **Author**: Galileo Sánchez ([galileo@galileopy.com](mailto:galileo@galileopy.com))
- **Blog**: [https://blog.galileopy.com/](https://blog.galileopy.com/)
- **Issues**: [https://github.com/galileopy/phantom-stories/issues](https://github.com/galileopy/phantom-stories/issues)
