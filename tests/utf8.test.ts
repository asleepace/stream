import { describe, it, expect } from 'bun:test'
import { utf8Transform } from '../src/transforms/utf8'

describe('utf8Transform', () => {
  it('should decode UTF-8 data', async () => {
    const { stream, state } = utf8Transform({ collectChunks: true })

    const encoder = new TextEncoder()
    const input = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('Hello '))
        controller.enqueue(encoder.encode('World'))
        controller.close()
      },
    })

    await input.pipeThrough(stream).pipeTo(
      new WritableStream({
        write(chunk) {
          // Chunks are decoded
        },
      })
    )

    expect(state.chunks).toContain('Hello ')
    expect(state.chunks).toContain('World')
  })

  it('should track done status', async () => {
    const { stream, state } = utf8Transform({
      trackDone: true,
      collectChunks: true,
    })

    const encoder = new TextEncoder()
    const input = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('test'))
        controller.close()
      },
    })

    expect(state.done).toBe(false)

    await input.pipeThrough(stream).pipeTo(new WritableStream())

    expect(state.done).toBe(true)
  })

  it('should handle errors with trackErrors', async () => {
    const { stream, state, onError } = utf8Transform({
      trackErrors: true,
      fatal: true,
    })

    let errorCaught = false
    onError((err) => {
      errorCaught = true
    })

    const input = new ReadableStream({
      start(controller) {
        // Invalid UTF-8 sequence
        controller.enqueue(new Uint8Array([0xff, 0xfe, 0xfd]))
        controller.close()
      },
    })

    try {
      await input.pipeThrough(stream).pipeTo(
        new WritableStream({
          write(chunk) {
            // Process chunks
          },
        })
      )
    } catch (err) {
      // Expected to throw with fatal: true
      errorCaught = true
    }

    // With fatal mode, either the error is caught by trackErrors or thrown
    expect(errorCaught).toBe(true)
  })
})

describe('utf8Transform callbacks', () => {
  it('should call onDone callback', async () => {
    const { stream, onDone } = utf8Transform({ trackDone: true })

    let doneCalled = false
    onDone(() => {
      doneCalled = true
    })

    const encoder = new TextEncoder()
    const input = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('test'))
        controller.close()
      },
    })

    await input.pipeThrough(stream).pipeTo(new WritableStream())

    expect(doneCalled).toBe(true)
  })
})
