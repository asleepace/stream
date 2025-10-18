import { createTransform } from '../builder'
import type { TransformResult } from '../core/algebra'

export interface LinesOptions {
  /**
   * Collect lines into array
   */
  collectChunks?: boolean

  /**
   * Track when splitting is complete
   */
  trackDone?: boolean

  /**
   * Track errors
   */
  trackErrors?: boolean

  /**
   * Trim whitespace from lines
   */
  trim?: boolean

  /**
   * Skip empty lines
   */
  skipEmpty?: boolean

  /**
   * Line separator (default: \n)
   */
  separator?: string
}

/**
 * Split text into lines
 */
export function linesTransform(
  options: LinesOptions = {}
): TransformResult<string, string> {
  const {
    collectChunks = false,
    trackDone = false,
    trackErrors = false,
    trim = false,
    skipEmpty = false,
    separator = '\n',
  } = options

  let builder = createTransform<string>().stateful(
    { buffer: '' },
    (state, chunk: string) => {
      const combined = state.buffer + chunk
      const parts = combined.split(separator)
      const buffer = parts.pop() || ''

      let lines = parts
      if (trim) {
        lines = lines.map((line) => line.trim())
      }
      if (skipEmpty) {
        lines = lines.filter((line) => line.length > 0)
      }

      return [{ buffer }, lines]
    },
    {
      onFlush: (state) => {
        if (state.buffer) {
          let line = state.buffer
          if (trim) line = line.trim()
          if (skipEmpty && line.length === 0) return null
          return [line]
        }
        return null
      },
    }
  )

  // Flatten the array of lines into individual emissions
  builder = builder.stateful({}, (state, lines: string[]) => {
    return [state, lines]
  }) as any

  if (collectChunks) {
    builder = builder.collect()
  }

  if (trackDone) {
    builder = builder.trackDone()
  }

  if (trackErrors) {
    builder = builder.trackErrors()
  }

  return builder.build() as any
}
