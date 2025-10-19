function isEncodable(obj: unknown): obj is { encode(): Uint8Array } {
  return Boolean(obj && typeof obj === 'object' && 'encode' in obj)
}

function isStringable(maybeStr: unknown): maybeStr is { toString(): string } {
  return Boolean(
    maybeStr && typeof maybeStr === 'object' && 'toString' in maybeStr
  )
}

/**
 * Returns a readable stream which will enqueue items yielded by a generator.
 */
export function streamGenerator<T>(generator: () => Generator<T>) {
  return new ReadableStream({
    start(controller) {
      const instance = generator()
      const encoder = new TextEncoder()
      for (const item of instance) {
        if (!item) continue
        if (item instanceof Uint8Array) {
          controller.enqueue(item)
        } else if (isEncodable(item)) {
          controller.enqueue(item.encode())
        } else if (typeof item === 'object') {
          controller.enqueue(encoder.encode(JSON.stringify(item)))
        } else if (typeof item === 'string' || isStringable(item)) {
          controller.enqueue(encoder.encode(item.toString()))
        } else {
          throw new TypeError('Unsupported type:' + item)
        }
      }
      controller.close()
    },
  })
}

streamGenerator(function* () {
  yield 'hello world!'
  yield 'this is a messsage'
  yield 'can you hear me now!'
})
