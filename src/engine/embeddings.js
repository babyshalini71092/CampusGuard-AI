/**
 * Genuine pretrained embedding inference through Transformers.js / ONNX Runtime.
 * Model assets are vendored locally; no API key, server or CDN is required.
 */
export const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
export const MODEL_REVISION = '751bff37182d3f1213fa05d7196b954e230abad9';
export const MODEL_VARIANT = 'onnx/model_quantized.onnx (int8, 384-dimensional mean-pooled embeddings)';
export const DEFAULT_MODEL_PATH = '/models/minilm';

export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) {
    throw new Error('Vectors must be non-empty arrays of equal length.');
  }
  let dot = 0; let normA = 0; let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Creates an explicitly stateful embedder. `pipelineFactory` is injectable so
 * tests can cover failure/retry paths without loading the WASM model.
 */
export function createEmbedder({ modelPath = DEFAULT_MODEL_PATH, pipelineFactory, onProgress, device } = {}) {
  // Browsers execute the quantized graph with ONNX Runtime WASM; Node's
  // verification script uses its native CPU backend on the same ONNX file.
  const executionDevice = device || (typeof window === 'undefined' ? 'cpu' : 'wasm');
  let state = 'not-initialized';
  let extractor = null;
  let error = null;
  let inFlight = null;

  async function init() {
    if (state === 'ready') return true;
    if (inFlight) return inFlight;
    state = 'loading';
    error = null;
    inFlight = (async () => {
      try {
        const module = await import('@huggingface/transformers');
        // Use the vendored ONNX Runtime binaries in the browser: no CDN needed.
        if (typeof window !== 'undefined' && module.env?.backends?.onnx?.wasm) {
          // Runtime imports must address the static server directly. A pathname
          // alone can be treated as a source import by Vite's development pipeline.
          const base = new URL(import.meta.env?.BASE_URL || '/', window.location.origin);
          // v4 disables local model files in browsers by default. Everything
          // this app needs is bundled as static assets, so force local only.
          module.env.allowLocalModels = true;
          module.env.allowRemoteModels = false;
          module.env.useBrowserCache = false;
          module.env.backends.onnx.wasm.wasmPaths = {
            mjs: new URL('ort/ort-wasm-simd-threaded.mjs', base).href,
            wasm: new URL('ort/ort-wasm-simd-threaded.wasm', base).href,
          };
        }
        const factory = pipelineFactory || module.pipeline;
        const localModel = typeof window !== 'undefined' && modelPath === DEFAULT_MODEL_PATH
          ? `${import.meta.env?.BASE_URL || '/'}models/minilm`
          : modelPath;
        extractor = await factory('feature-extraction', localModel, {
          device: executionDevice,
          dtype: 'q8',
          progress_callback: onProgress,
        });
        state = 'ready';
        return true;
      } catch (cause) {
        state = 'unavailable';
        error = cause instanceof Error ? cause.message : String(cause);
        return false;
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  }

  async function embed(texts) {
    if (state !== 'ready' || !extractor) throw new Error('Embedding model is not ready.');
    const list = Array.isArray(texts) ? texts : [texts];
    const output = await extractor(list, { pooling: 'mean', normalize: true });
    const rows = typeof output.tolist === 'function' ? output.tolist() : [Array.from(output.data)];
    return list.length === 1 && !Array.isArray(texts) ? rows[0] : rows;
  }

  return {
    init,
    embed,
    getState: () => ({ state, error }),
    get modelPath() { return modelPath; },
  };
}
