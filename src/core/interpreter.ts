import type { StatefulOps, TransformState } from './algebra'

/**
 * Represents a composable transform that can be chained
 */
type ComposableTransform<TIn, TOut> = {
  readable: ReadableStream<TOut>
  writable: WritableStream<TIn>
}

/**
 * TransformStream interpreter implementation
 */
export const transformStreamOps: StatefulOps<ComposableTransform<any, any>> = {
  map:
    <A, B>(f: (chunk: A) => B) =>
    (stream: ComposableTransform<A, any>) => {
      const transform = new TransformStream<A, B>({
        transform(chunk, controller) {
          try {
            controller.enqueue(f(chunk))
          } catch (error) {
            controller.error(error)
          }
        },
      })

      return {
        readable: stream.readable.pipeThrough(transform),
        writable: stream.writable,
      }
    },

  tap:
    <A>(f: (chunk: A) => void) =>
    (stream: ComposableTransform<A, any>) => {
      const transform = new TransformStream<A, A>({
        transform(chunk, controller) {
          try {
            f(chunk)
            controller.enqueue(chunk)
          } catch (error) {
            controller.error(error)
          }
        },
      })

      return {
        readable: stream.readable.pipeThrough(transform),
        writable: stream.writable,
      }
    },

  scan: <A, B>(initial: B, f: (acc: B, chunk: A) => B) => {
    let acc = initial
    return (stream: ComposableTransform<A, any>) => {
      const transform = new TransformStream<A, B>({
        transform(chunk, controller) {
          try {
            acc = f(acc, chunk)
            controller.enqueue(acc)
          } catch (error) {
            controller.error(error)
          }
        },
      })

      return {
        readable: stream.readable.pipeThrough(transform),
        writable: stream.writable,
      }
    }
  },

  filter:
    <A>(predicate: (chunk: A) => boolean) =>
    (stream: ComposableTransform<A, any>) => {
      const transform = new TransformStream<A, A>({
        transform(chunk, controller) {
          try {
            if (predicate(chunk)) {
              controller.enqueue(chunk)
            }
          } catch (error) {
            controller.error(error)
          }
        },
      })

      return {
        readable: stream.readable.pipeThrough(transform),
        writable: stream.writable,
      }
    },

  mapAsync:
    <A, B>(f: (chunk: A) => Promise<B>) =>
    (stream: ComposableTransform<A, any>) => {
      const transform = new TransformStream<A, B>({
        async transform(chunk, controller) {
          try {
            const result = await f(chunk)
            controller.enqueue(result)
          } catch (error) {
            controller.error(error)
          }
        },
      })

      return {
        readable: stream.readable.pipeThrough(transform),
        writable: stream.writable,
      }
    },

  catchError:
    <A>(handler: (error: Error, chunk: A) => A | null) =>
    (stream: ComposableTransform<A, any>) => {
      const transform = new TransformStream<A, A>({
        transform(chunk, controller) {
          try {
            controller.enqueue(chunk)
          } catch (error) {
            try {
              const recovered = handler(error as Error, chunk)
              if (recovered !== null) {
                controller.enqueue(recovered)
              }
            } catch (handlerError) {
              controller.error(handlerError)
            }
          }
        },
      })

      return {
        readable: stream.readable.pipeThrough(transform),
        writable: stream.writable,
      }
    },

  stateful: <A, B, State>(
    initialState: State,
    transform: (state: State, chunk: A) => [State, B],
    options?: {
      onFlush?: (state: State) => B | null
    }
  ) => {
    let state = initialState

    return (stream: ComposableTransform<A, any>) => {
      const transformStream = new TransformStream<A, B>({
        transform(chunk, controller) {
          try {
            const [newState, output] = transform(state, chunk)
            state = newState
            controller.enqueue(output)
          } catch (error) {
            controller.error(error)
          }
        },
        flush(controller) {
          if (options?.onFlush) {
            try {
              const final = options.onFlush(state)
              if (final !== null) {
                controller.enqueue(final)
              }
            } catch (error) {
              controller.error(error)
            }
          }
        },
      })

      const result = {
        readable: stream.readable.pipeThrough(transformStream),
        writable: stream.writable,
      }

      return Object.assign(result, {
        getState: () => state,
      })
    }
  },
}

/**
 * Create a new state container
 */
export function createState<T = any>(): TransformState<T> {
  return {
    chunks: [],
    error: null,
    done: false,
    metadata: {},
  }
}
