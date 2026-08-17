export interface BackendHealth {
  online: boolean;
  device?: string;
  ttsLoaded?: boolean;
  vcLoaded?: boolean;
}

export interface TTSParams {
  text: string;
  exaggeration: number;
  cfg_weight: number;
  temperature: number;
  seed: number;
  language?: string;
  model?: string;
}

/**
 * Checks the connection and health of the Chatterbox API backend.
 * Uses a short timeout to fail fast if the backend is not running.
 */
export async function checkHealth(baseUrl: string): Promise<BackendHealth> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 3000); // 3-second timeout

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/health`, {
      signal: controller.signal,
    });
    clearTimeout(id);

    if (response.ok) {
      const data = await response.json();
      return {
        online: true,
        device: data.device,
        ttsLoaded: data.tts_loaded,
        vcLoaded: data.vc_loaded,
      };
    }
  } catch (error) {
    console.error('Failed to contact backend health endpoint:', error);
  } finally {
    clearTimeout(id);
  }

  return { online: false };
}

/**
 * Uploads a reference audio file to the backend once and returns
 * a reusable reference_id. Subsequent TTS calls can pass this ID
 * instead of re-uploading the audio, eliminating repeated uploads
 * during multi-segment batch generation.
 */
export async function uploadReference(
  baseUrl: string,
  audioFile: File
): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/upload_reference`;
  const formData = new FormData();
  formData.append('audio_prompt', audioFile);

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = 'Failed to upload reference audio';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      // Keep fallback error string
    }
    throw new Error(`Reference upload failed: ${errorDetail}`);
  }

  const data = await response.json();
  if (!data.reference_id || typeof data.reference_id !== 'string') {
    throw new Error('Reference upload failed: server did not return a valid reference_id');
  }

  return data.reference_id;
}

/**
 * Sends a TTS generation request to the backend.
 * Supports two modes for voice reference:
 *   1. audioPromptFile — uploads the reference audio directly (single-segment use)
 *   2. referenceId — reuses a previously uploaded reference (batch use)
 * If neither is provided, the backend uses its default voice.
 */
export async function generateTTS(
  baseUrl: string,
  params: TTSParams,
  audioPromptFile?: File,
  referenceId?: string
): Promise<Blob> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/tts`;
  const formData = new FormData();

  formData.append('text', params.text);
  formData.append('exaggeration', String(params.exaggeration));
  formData.append('cfg_weight', String(params.cfg_weight));
  formData.append('temperature', String(params.temperature));
  formData.append('seed', String(params.seed));
  formData.append('min_p', '0.05');
  formData.append('top_p', '1.0');
  formData.append('repetition_penalty', '1.2');

  if (params.language) {
    formData.append('language', params.language);
  }
  if (params.model) {
    formData.append('model', params.model);
  }

  // Use referenceId if available; otherwise fall back to file upload
  if (referenceId) {
    formData.append('reference_id', referenceId);
  } else if (audioPromptFile) {
    formData.append('audio_prompt', audioPromptFile);
  }

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = 'Unknown generation error';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      // Keep fallback error string
    }
    const err = new Error(`TTS synthesis failed: ${errorDetail}`);
    (err as any).status = response.status;
    throw err;
  }

  return await response.blob();
}

// In-memory cache mapping: voiceId -> { backendUrl, referenceId }
const referenceCache: Record<string, { backendUrl: string; referenceId: string }> = {};

/**
 * High-level wrapper for generateTTS that uses a client-side cache for reference IDs.
 * Reuses the previously uploaded reference audio for a given voiceId on the current backendUrl,
 * even across independent single segment generations.
 * If the server restarts and returns a 404 for the cached referenceId, it automatically
 * clears the cache, uploads the file again, and retries the generation.
 */
export async function generateTTSWithCache(
  baseUrl: string,
  params: TTSParams,
  voiceId: string,
  audioPromptFile?: File
): Promise<Blob> {
  const cleanUrl = baseUrl.replace(/\/$/, '');
  const cached = referenceCache[voiceId];

  if (cached && cached.backendUrl === cleanUrl) {
    try {
      console.log(`[TTS Cache] Reusing reference ID ${cached.referenceId} for voice ${voiceId}`);
      return await generateTTS(cleanUrl, params, undefined, cached.referenceId);
    } catch (err: any) {
      if (err.status === 404) {
        console.warn(`[TTS Cache] Reference ID ${cached.referenceId} expired or not found. Re-uploading...`);
        delete referenceCache[voiceId];
      } else {
        throw err;
      }
    }
  }

  if (!audioPromptFile) {
    // Generate with default voice if no audio file is provided
    return await generateTTS(cleanUrl, params);
  }

  console.log(`[TTS Cache] Uploading reference audio for voice ${voiceId}...`);
  const referenceId = await uploadReference(cleanUrl, audioPromptFile);
  referenceCache[voiceId] = {
    backendUrl: cleanUrl,
    referenceId,
  };

  return await generateTTS(cleanUrl, params, undefined, referenceId);
}

/**
 * Sends an audio file to the backend to be denoised using DeepFilterNet.
 * Returns the enhanced WAV file Blob.
 */
export async function denoiseAudio(baseUrl: string, audioFile: File): Promise<Blob> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/denoise`;
  const formData = new FormData();
  formData.append('audio', audioFile);

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = 'Denoising failed';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {}
    throw new Error(errorDetail);
  }

  return await response.blob();
}

/**
 * Clears the client-side cache of uploaded reference voice IDs.
 */
export function clearReferenceCache(): void {
  for (const key in referenceCache) {
    delete referenceCache[key];
  }
}
