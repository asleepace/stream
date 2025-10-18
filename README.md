# Stream

Advanced, functional, and composable stream transforms for TypeScript using the tagless final pattern.

## Features

- 🎯 **Type-safe** - Full TypeScript support with inference
- 🔧 **Composable** - Chain transforms with fluent API
- 📦 **Built-in transforms** - UTF-8, JSON, JSONL, lines, compression
- 🎨 **Functional** - Tagless final pattern for flexibility
- 🔄 **Stateful** - Track state, errors, and completion
- ⚡ **Zero overhead** - Compiles to efficient TransformStream code
- 🧪 **Testable** - Easy to test with different interpreters

## Installation

```bash
npm install your-package
# or
pnpm add your-package
# or
yarn add your-package
```

## Quick Start

```typescript
import { utf8Transform, jsonLinesTransform } from 'your-package';

// Decode UTF-8 and parse JSONL
const utf8 = utf8Transform({ collectChunks: true });
const json = jsonLinesTransform({ skipInvalid: true });

response.body
  .pipeThrough(utf8.stream)
  .pipeThrough(json.stream)
  .pipeTo(/* your destination */);

// Access state
console.log(utf8.state.chunks);
console.log(utf8.state.done);
```

## Built-in Transforms

### UTF-8 Decoding
```typescript
import { utf8Transform } from 'your-package';

const { stream, state } = utf8Transform({
  collectChunks: true,
  trackDone: true,
  fatal: false,
  trackErrors: true,
});
```

### JSON Parsing
```typescript
import { jsonTransform } from 'your-package';

const { stream, state } = jsonTransform<MyType>({
  collectChunks: true,
  skipInvalid: true,
});
```

### JSON Lines (NDJSON)
```typescript
import { jsonLinesTransform } from 'your-package';

const { stream } = jsonLinesTransform<LogEntry>({
  trim: true,
  skipEmpty: true,
  skipInvalid: true,
});
```

### Line Splitting
```typescript
import { linesTransform } from 'your-package';

const { stream } = linesTransform({
  separator: '\n',
  trim: true,
  skipEmpty: true,
});
```

### Compression
```typescript
import { compressTransform, decompressTransform } from 'your-package';

const { stream } = compressTransform({ format: 'gzip' });
const { stream } = decompressTransform({ format: 'deflate' });
```

## Custom Transforms

### Using the Builder
```typescript
import { createTransform } from 'your-package';

const result = createTransform<Uint8Array>()
  .map(data => new TextDecoder().decode(data))
  .filter(str => str.length > 0)
  .map(str => str.toUpperCase())
  .collect()
  .trackDone()
  .build();

result.onDone(() => console.log('Complete!'));
result.onError(err => console.error(err));
```

### Available Methods

- **map** - Transform each chunk
- **tap** - Peek without modifying
- **filter** - Filter chunks
- **scan** - Accumulate state
- **mapAsync** - Async transformations
- **catchError** - Handle errors
- **stateful** - Custom stateful transforms
- **collect** - Collect chunks into array
- **trackDone** - Track completion
- **trackErrors** - Track errors

### Stateful Transforms
```typescript
const result = createTransform<string>()
  .stateful(
    { count: 0, total: 0 },
    (state, chunk: string) => {
      const newState = {
        count: state.count + 1,
        total: state.total + chunk.length
      };
      return [newState, `[${newState.count}] ${chunk}`];
    },
    {
      onFlush: (state) => `Processed ${state.count} chunks`
    }
  )
  .build();

// Access internal state
const state = result.getState();
console.log(state.count, state.total);
```

## Advanced Patterns

### Composition
```typescript
const pipeline = createTransform<Uint8Array>()
  .map(data => new TextDecoder().decode(data))
  .stateful(
    { buffer: '' },
    (state, chunk: string) => {
      const combined = state.buffer + chunk;
      const lines = combined.split('\n');
      return [{ buffer: lines.pop() || '' }, lines];
    }
  )
  .map((lines: string[]) => lines.filter(l => l.trim()))
  .collect()
  .build();
```

### Error Handling
```typescript
const result = createTransform<string>()
  .map(str => JSON.parse(str))
  .catchError((error, chunk) => {
    console.warn('Invalid JSON:', chunk);
    return null; // Skip invalid
  })
  .filter(obj => obj !== null)
  .trackErrors()
  .build();
```

### Async Operations
```typescript
const result = createTransform<string>()
  .mapAsync(async (url: string) => {
    const res = await fetch(url);
    return res.json();
  })
  .build();
```

## API Reference

See [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md) for comprehensive examples.

### TransformResult

All transforms return a `TransformResult`:

```typescript
interface TransformResult<TIn, TOut, State> {
  stream: TransformStream<TIn, TOut>;
  state: {
    chunks: TOut[];
    error: Error | null;
    done: boolean;
    metadata: Record<string, any>;
  };
  getState: () => State | undefined;
  onDone: (callback: () => void) => void;
  onError: (callback: (error: Error) => void) => void;
}
```

## Architecture

This library uses the **tagless final** pattern:

- **Algebra** - Defines operations (map, filter, etc.)
- **Interpreter** - Implements operations for TransformStream
- **Programs** - Compose operations into transforms
- **Zero cost** - Abstractions compile away

This enables:
- Type-safe composition
- Multiple interpreters (testing with arrays, etc.)
- No runtime overhead
- Flexible and extensible

## License

MIT

## Contributing

PRs welcome! Please include tests for new features.