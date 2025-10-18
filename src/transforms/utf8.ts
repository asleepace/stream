import { createTransform } from '../builder'
import type { TransformResult } from '../core/algebra'

export interface UTF8Options {
  /**
   * Collect decoded chunks into array
   */
  collectChunks?: boolean

  /**
   * Track when decoding is complete
   */
  trackDone?: boolean

  /**
   * Handle decoding errors
   */
  fatal?: boolean

  /**
   * Track errors
   */
  trackErrors?: boolean
}

/**
 * Create a UTF-8 decoder transform
 */
export function utf8Transform(
  options: UTF8Options = {}
): TransformResult<Uint8Array, string> {
  const {
    collectChunks = false,
    trackDone = false,
    fatal = false,
    trackErrors = false,
  } = options

  const decoder = new TextDecoder('utf-8', { fatal })

  let builder = createTransform<Uint8Array>().stateful(
    { buffer: '' },
    (state, chunk: Uint8Array) => {
      const decoded = decoder.decode(chunk, { stream: true })
      return [state, decoded]
    },
    {
      onFlush: (state) => {
        const final = decoder.decode()
        return final || null
      },
    }
  )

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

/**
 * Simple UTF-8 decoder (like your original)
 */
export function createUTF8Transform() {
  const decoder = new TextDecoder('utf-8', { fatal: false })
  const chunks: string[] = []
  const state = {
    done: false,
  }

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform: (data, controller) => {
      controller.enqueue(data)
      const decoded = decoder.decode(data, { stream: true })
      if (decoded) {
        chunks.push(decoded)
      }
    },
    flush: (controller) => {
      const final = decoder.decode()
      if (final) chunks.push(final)
      state.done = true
    },
  })

  return {
    transform,
    get chunks() {
      return chunks
    },
    get done() {
      return state.done
    },
  }
}
