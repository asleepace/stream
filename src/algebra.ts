/**
 * Core algebra interface defining transform operations
 */
export interface TransformOps<S> {
  /**
   * Transform each chunk from type A to type B
   */
  map<A, B>(f: (chunk: A) => B): (stream: S) => S

  /**
   * Peek at chunks without modifying them (for side effects)
   */
  tap<A>(f: (chunk: A) => void): (stream: S) => S

  /**
   * Accumulate state across chunks
   */
  scan<A, B>(initial: B, f: (acc: B, chunk: A) => B): (stream: S) => S

  /**
   * Filter chunks based on predicate
   */
  filter<A>(predicate: (chunk: A) => boolean): (stream: S) => S

  /**
   * Transform with async function
   */
  mapAsync<A, B>(f: (chunk: A) => Promise<B>): (stream: S) => S

  /**
   * Handle errors in the stream
   */
  catchError<A>(handler: (error: Error, chunk: A) => A | null): (stream: S) => S
}

/**
 * Extended algebra with stateful operations
 */
export interface StatefulOps<S> extends TransformOps<S> {
  /**
   * Create a stateful transform that maintains state across chunks
   */
  stateful<A, B, State>(
    initialState: State,
    transform: (state: State, chunk: A) => [State, B],
    options?: {
      onFlush?: (state: State) => B | null
    }
  ): (stream: S) => S & { getState: () => State }
}

/**
 * State container for transforms
 */
export interface TransformState<T = any> {
  chunks: T[]
  error: Error | null
  done: boolean
  metadata: Record<string, any>
}

/**
 * Result of building a transform
 */
export interface TransformResult<TIn, TOut, State = any> {
  stream: TransformStream<TIn, TOut>
  state: TransformState<TOut>
  getState: () => State | undefined
  onDone: (callback: () => void) => void
  onError: (callback: (error: Error) => void) => void
}
