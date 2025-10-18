import { createTransform } from '../builder'
import type { TransformResult } from '../core/algebra'

export interface JSONOptions {
  /**
   * Collect parsed objects into array
   */
  collectChunks?: boolean

  /**
   * Track when parsing is complete
   */
  trackDone?: boolean

  /**
   * Track errors
   */
  trackErrors?: boolean

  /**
   * Handle invalid JSON (returns null if can't parse)
   */
  skipInvalid?: boolean
}

/**
 * Parse JSON from string chunks
 */
export function jsonTransform<T = any>(
  options: JSONOptions = {}
): TransformResult<string, T> {
  const {
    collectChunks = false,
    trackDone = false,
    trackErrors = false,
    skipInvalid = false,
  } = options

  let builder = createTransform<string>().map((chunk: string) => {
    try {
      return JSON.parse(chunk) as T
    } catch (error) {
      if (skipInvalid) {
        return null as any
      }
      throw error
    }
  })

  if (skipInvalid) {
    builder = builder.filter((obj) => obj !== null)
  }

  if (collectChunks) {
    builder = builder.collect()
  }

  if (trackDone) {
    builder = builder.trackDone()
  }

  if (trackErrors) {
    builder = builder.trackErrors()
  }

  return builder.build()
}

export interface JSONLinesOptions extends JSONOptions {
  /**
   * Trim whitespace from lines
   */
  trim?: boolean

  /**
   * Skip empty lines
   */
  skipEmpty?: boolean
}

/**
 * Parse newline-delimited JSON (JSONL/NDJSON)
 */
export function jsonLinesTransform<T = any>(
  options: JSONLinesOptions = {}
): TransformResult<string, T[]> {
  const {
    collectChunks = false,
    trackDone = false,
    trackErrors = false,
    skipInvalid = false,
    trim = true,
    skipEmpty = true,
  } = options

  let builder = createTransform<string>()
    .stateful(
      { buffer: '' },
      (state, chunk: string) => {
        const combined = state.buffer + chunk
        const lines = combined.split('\n')
        const buffer = lines.pop() || ''

        return [{ buffer }, lines]
      },
      {
        onFlush: (state) => {
          return state.buffer ? [state.buffer] : null
        },
      }
    )
    .map((lines: string[]): T[] => {
      const processed: T[] = []

      for (const line of lines) {
        const trimmedLine = trim ? line.trim() : line

        if (skipEmpty && trimmedLine.length === 0) {
          continue
        }

        try {
          const parsed = JSON.parse(trimmedLine) as T
          processed.push(parsed)
        } catch (error) {
          if (!skipInvalid) {
            throw error
          }
          // Skip invalid JSON if skipInvalid is true
        }
      }

      return processed
    })

  if (collectChunks) {
    builder = builder.collect()
  }

  if (trackDone) {
    builder = builder.trackDone()
  }

  if (trackErrors) {
    builder = builder.trackErrors()
  }

  return builder.build()
}
