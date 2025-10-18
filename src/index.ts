// Core
export { createTransform, TransformBuilder } from './builder'
export type {
  TransformOps,
  StatefulOps,
  TransformState,
  TransformResult,
} from './core/algebra'
export { transformStreamOps, createState } from './core/interpreter'

// Transforms
export {
  utf8Transform,
  createUTF8Transform,
  type UTF8Options,
} from './transforms/utf8'

export {
  jsonTransform,
  jsonLinesTransform,
  type JSONOptions,
  type JSONLinesOptions,
} from './transforms/json'

export { linesTransform, type LinesOptions } from './transforms/lines'

export {
  compressTransform,
  decompressTransform,
  type CompressionOptions,
} from './transforms/compression'
