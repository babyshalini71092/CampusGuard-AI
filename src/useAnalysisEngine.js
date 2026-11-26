import { useCallback, useRef, useState } from 'react';
import { createEmbedder } from './engine/embeddings.js';
import { createSemanticAnalyzer } from './engine/semantic.js';
import { analyzeMessage } from './engine/analysis.js';

/** Shared model lifecycle + analysis entry point for every section. */
export function useAnalysisEngine() {
  const embedderRef = useRef(null);
  const semanticRef = useRef(null);
  const loadingRef = useRef(null);
  const readyRef = useRef(false);
  const [model, setModel] = useState({ status: 'not-initialized', error: null });

  const loadModel = useCallback(() => {
    if (readyRef.current) return Promise.resolve(true);
    if (loadingRef.current) return loadingRef.current;
    if (!embedderRef.current) {
      // Transformers.js does extra model-file requests for percentage tracking.
      embedderRef.current = createEmbedder();
      semanticRef.current = createSemanticAnalyzer(embedderRef.current);
    }
    setModel({ status: 'loading', error: null });
    loadingRef.current = (async () => {
      let failure = null;
      try {
        // Keep the model in loading state until the reference batch is ready.
        readyRef.current = await semanticRef.current.prepare();
      } catch (cause) {
        failure = cause instanceof Error ? cause.message : String(cause);
      }
      setModel(readyRef.current
        ? { status: 'ready', error: null }
        : { status: 'unavailable', error: failure || embedderRef.current.getState().error || 'Model could not be loaded.' });
      return readyRef.current;
    })().finally(() => { loadingRef.current = null; });
    return loadingRef.current;
  }, []);

  const analyze = useCallback(async (text) => {
    const semantic = readyRef.current ? semanticRef.current : null;
    return analyzeMessage(text, { semantic });
  }, []);

  const retryModel = useCallback(() => loadModel(), [loadModel]);

  return { model, loadModel, retryModel, analyze };
}
