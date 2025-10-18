/**
 * Iterates over a readable stream yielding chunks.
 */
export async function* iterate<T>(
  stream: ReadableStream<T>,
  transform?: <G = T>(chunk: T) => G
) {
  const reader = stream.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      yield transform?.(value) ?? value
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Collect chunks from a readable stream and decode as UTF-8 chunks.
 */
export async function collectTextChunks<T extends Uint8Array>(
  stream: ReadableStream<T>
) {
  const decoder = decodeStreamUTF8()
  decoder.next() // Initialize generator

  for await (const chunk of iterate<T>(stream)) {
    decoder.next(chunk)
  }

  let result = decoder.next()

  if (result.done) return result.value

  throw new Error('Failed to decode buffer.')
}

/**
 * Returns a UTF-8 text decoder which can be used to decode streams.
 */
export function* decodeStreamUTF8(): Generator<
  void,
  string[],
  Uint8Array | undefined
> {
  const textDecoder = new TextDecoder('utf-8', { fatal: true })
  const chunks: string[] = []

  while (true) {
    const bytes: Uint8Array | undefined = yield
    if (!bytes || bytes.length === 0) break

    const textChunk = textDecoder.decode(bytes, { stream: true })
    chunks.push(textChunk)
  }

  // Flush any remaining bytes
  textDecoder.decode()
  return chunks
}

export function createStreamRef() {
  const textEncoder = new TextEncoder()

  let controller: ReadableStreamDefaultController<Uint8Array>

  const stream = new ReadableStream<Uint8Array>({
    start: (ctrl) => {
      controller = ctrl
    },
  })

  const write = (chunk: Uint8Array) => {
    controller.enqueue(chunk)
  }

  return {
    stream: () => stream,
    write,
    text(str: string) {
      const bytes = textEncoder.encode(str)
      this.write(bytes)
    },
    json(obj: any) {
      this.text(JSON.stringify(obj))
    },
    close() {
      controller.close()
    },
  }
}
