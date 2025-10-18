import { createTransform, TransformBuilder } from '../builder'
import type { TransformResult } from '../core/algebra'

/**
 * Supported compression formats
 */
export type CompressionFormat = 'gzip' | 'deflate' | 'deflate-raw'

export interface CompressionOptions {
  /**
   * Collect chunks into array
   */
  collectChunks?: boolean

  /**
   * Track when compression is complete
   */
  trackDone?: boolean

  /**
   * Track errors
   */
  trackErrors?: boolean

  /**
   * Compression format
   */
  format?: CompressionFormat
}

/**
 * Compress data using CompressionStream
 */
export function compressTransform(
  options: CompressionOptions = {}
): TransformResult<Uint8Array, Uint8Array> {
  const {
    collectChunks = false,
    trackDone = false,
    trackErrors = false,
    format = 'gzip',
  } = options

  const compressor = new CompressionStream(format)

  // Create a passthrough builder
  let builder = createTransform<Uint8Array>()

  // Get the built result
  const result = builder.build()

  // Pipe through the compression stream (with type assertion for BufferSource compatibility)
  const compressedReadable = result.stream.readable.pipeThrough(
    compressor as unknown as TransformStream<Uint8Array, Uint8Array>
  )

  // Create new transform with compressed stream
  const compressedTransform = new TransformStream<Uint8Array, Uint8Array>()
  compressedReadable.pipeTo(compressedTransform.writable)

  // Create a new builder with the compressed stream
  let finalBuilder = new TransformBuilder<Uint8Array, Uint8Array>(
    compressedTransform
  )

  if (collectChunks) {
    finalBuilder = finalBuilder.collect()
  }

  if (trackDone) {
    finalBuilder = finalBuilder.trackDone()
  }

  if (trackErrors) {
    finalBuilder = finalBuilder.trackErrors()
  }

  return finalBuilder.build()
}

/**
 * Decompress data using DecompressionStream
 */
export function decompressTransform(
  options: CompressionOptions = {}
): TransformResult<Uint8Array, Uint8Array> {
  const {
    collectChunks = false,
    trackDone = false,
    trackErrors = false,
    format = 'gzip',
  } = options

  const decompressor = new DecompressionStream(format)

  // Create a passthrough builder
  let builder = createTransform<Uint8Array>()

  // Get the built result
  const result = builder.build()

  // Pipe through the decompression stream (with type assertion for BufferSource compatibility)
  const decompressedReadable = result.stream.readable.pipeThrough(
    decompressor as unknown as TransformStream<Uint8Array, Uint8Array>
  )

  // Create new transform with decompressed stream
  const decompressedTransform = new TransformStream<Uint8Array, Uint8Array>()
  decompressedReadable.pipeTo(decompressedTransform.writable)

  // Create a new builder with the decompressed stream
  let finalBuilder = new TransformBuilder<Uint8Array, Uint8Array>(
    decompressedTransform
  )

  if (collectChunks) {
    finalBuilder = finalBuilder.collect()
  }

  if (trackDone) {
    finalBuilder = finalBuilder.trackDone()
  }

  if (trackErrors) {
    finalBuilder = finalBuilder.trackErrors()
  }

  return finalBuilder.build()
}
