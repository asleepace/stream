import type { TransformResult, TransformState } from './core/algebra'
import { transformStreamOps, createState } from './core/interpreter'

/**
 * Composable transform type
 */
type ComposableTransform<TIn, TOut> = {
  readable: ReadableStream<TOut>
  writable: WritableStream<TIn>
}

/**
 * Fluent builder API for creating transforms
 */
export class TransformBuilder<TIn, TCurrent> {
  private composable: ComposableTransform<TIn, TCurrent>
  private state: TransformState<TCurrent>
  private internalState: any = undefined
  private doneCallbacks: Array<() => void> = []
  private errorCallbacks: Array<(error: Error) => void> = []

  constructor(initialTransform?: TransformStream<TIn, TCurrent>) {
    if (initialTransform) {
      this.composable = {
        readable: initialTransform.readable,
        writable: initialTransform.writable,
      }
    } else {
      const identity = new TransformStream<TIn, TCurrent>()
      this.composable = {
        readable: identity.readable,
        writable: identity.writable,
      }
    }
    this.state = createState<TCurrent>()
  }

  /**
   * Transform each chunk
   */
  map<TOut>(fn: (chunk: TCurrent) => TOut): TransformBuilder<TIn, TOut> {
    this.composable = transformStreamOps.map(fn)(this.composable as any) as any
    return this as any
  }

  /**
   * Peek at chunks without modifying them
   */
  tap(fn: (chunk: TCurrent) => void): TransformBuilder<TIn, TCurrent> {
    this.composable = transformStreamOps.tap(fn)(this.composable as any) as any
    return this
  }

  /**
   * Accumulate state across chunks
   */
  scan<TAcc>(
    initial: TAcc,
    fn: (acc: TAcc, chunk: TCurrent) => TAcc
  ): TransformBuilder<TIn, TAcc> {
    this.composable = transformStreamOps.scan(
      initial,
      fn
    )(this.composable as any) as any
    return this as any
  }

  /**
   * Filter chunks
   */
  filter(
    predicate: (chunk: TCurrent) => boolean
  ): TransformBuilder<TIn, TCurrent> {
    this.composable = transformStreamOps.filter(predicate)(
      this.composable as any
    ) as any
    return this
  }

  /**
   * Transform with async function
   */
  mapAsync<TOut>(
    fn: (chunk: TCurrent) => Promise<TOut>
  ): TransformBuilder<TIn, TOut> {
    this.composable = transformStreamOps.mapAsync(fn)(
      this.composable as any
    ) as any
    return this as any
  }

  /**
   * Handle errors
   */
  catchError(
    handler: (error: Error, chunk: TCurrent) => TCurrent | null
  ): TransformBuilder<TIn, TCurrent> {
    this.composable = transformStreamOps.catchError(handler)(
      this.composable as any
    ) as any
    return this
  }

  /**
   * Create a stateful transform
   */
  stateful<TOut, TState>(
    initialState: TState,
    transform: (state: TState, chunk: TCurrent) => [TState, TOut],
    options?: {
      onFlush?: (state: TState) => TOut | null
    }
  ): TransformBuilder<TIn, TOut> {
    const result = transformStreamOps.stateful(
      initialState,
      transform,
      options
    )(this.composable as any)
    this.composable = result as any
    this.internalState = (result as any).getState
    return this as any
  }

  /**
   * Collect chunks into state
   */
  collect(): TransformBuilder<TIn, TCurrent> {
    return this.tap((chunk) => {
      this.state.chunks.push(chunk)
    })
  }

  /**
   * Mark when stream is done
   */
  trackDone(): TransformBuilder<TIn, TCurrent> {
    const doneTransform = new TransformStream<TCurrent, TCurrent>({
      transform: (chunk, controller) => {
        controller.enqueue(chunk)
      },
      flush: () => {
        this.state.done = true
        this.doneCallbacks.forEach((cb) => cb())
      },
    })

    this.composable = {
      readable: this.composable.readable.pipeThrough(doneTransform),
      writable: this.composable.writable,
    }

    return this
  }

  /**
   * Track errors
   */
  trackErrors(): TransformBuilder<TIn, TCurrent> {
    const errorTransform = new TransformStream<TCurrent, TCurrent>({
      transform: (chunk, controller) => {
        try {
          controller.enqueue(chunk)
        } catch (error) {
          this.state.error = error as Error
          this.errorCallbacks.forEach((cb) => cb(error as Error))
          throw error
        }
      },
    })

    this.composable = {
      readable: this.composable.readable.pipeThrough(errorTransform),
      writable: this.composable.writable,
    }

    return this
  }

  /**
   * Build the final transform result
   */
  build(): TransformResult<TIn, TCurrent, any> {
    // Return the composable as a TransformStream-like object
    return {
      stream: {
        readable: this.composable.readable,
        writable: this.composable.writable,
      } as TransformStream<TIn, TCurrent>,
      state: this.state,
      getState: () => (this.internalState ? this.internalState() : undefined),
      onDone: (callback) => {
        this.doneCallbacks.push(callback)
      },
      onError: (callback) => {
        this.errorCallbacks.push(callback)
      },
    }
  }
}

/**
 * Create a new transform builder
 */
export function createTransform<TIn = Uint8Array>(): TransformBuilder<
  TIn,
  TIn
> {
  return new TransformBuilder<TIn, TIn>()
}
