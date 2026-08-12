/**
 * Helper to encode an AudioBuffer back to 16-bit PCM WAV bytes
 */
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // raw PCM
  const bitDepth = 16;

  let result: Float32Array;
  if (numOfChan === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }

  const bufferLength = result.length * 2;
  const arrayBuffer = new ArrayBuffer(44 + bufferLength);
  const view = new DataView(arrayBuffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + bufferLength, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numOfChan, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * numOfChan * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numOfChan * 2, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, bufferLength, true);

  floatTo16BitPCM(view, 44, result);

  return arrayBuffer;
}

function interleave(inputL: Float32Array, inputR: Float32Array): Float32Array {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);

  let index = 0;
  let inputIndex = 0;

  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Merges multiple WAV blobs sequentially into a single high-fidelity WAV blob.
 */
export async function mergeAudioBlobs(blobs: Blob[]): Promise<Blob> {
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioContextClass();

  // 1. Decode all blobs to AudioBuffers
  const buffers: AudioBuffer[] = [];
  for (const blob of blobs) {
    const arrayBuffer = await blob.arrayBuffer();
    try {
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      buffers.push(audioBuffer);
    } catch (e) {
      console.error('Error decoding audio data for merging:', e);
    }
  }

  if (buffers.length === 0) {
    throw new Error('No valid audio clips could be decoded for compilation.');
  }

  // 2. Determine combined channel count and sample rate
  const numberOfChannels = Math.max(...buffers.map((b) => b.numberOfChannels));
  const sampleRate = buffers[0].sampleRate;
  const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);

  // 3. Create the combined destination AudioBuffer
  const mergedBuffer = ctx.createBuffer(numberOfChannels, totalLength, sampleRate);

  // 4. Sequentially copy buffer data per channel
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const mergedData = mergedBuffer.getChannelData(channel);
    let offset = 0;
    for (const buf of buffers) {
      if (channel < buf.numberOfChannels) {
        mergedData.set(buf.getChannelData(channel), offset);
      }
      offset += buf.length;
    }
  }

  // 5. Encode the composite AudioBuffer to standard 16-bit WAV bytes
  const wavBytes = audioBufferToWav(mergedBuffer);
  return new Blob([wavBytes], { type: 'audio/wav' });
}
