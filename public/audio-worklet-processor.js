/**
 * AudioWorklet processor for PCM audio capture.
 *
 * Runs on a dedicated audio thread — replaces the deprecated
 * ScriptProcessorNode which blocked the main thread.
 *
 * Usage:
 *   await audioContext.audioWorklet.addModule('/audio-worklet-processor.js');
 *   const node = new AudioWorkletNode(audioContext, 'pcm-capture');
 *   node.port.onmessage = (e) => { // e.data is Int16Array PCM };
 */

class PCMCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(0);
    this._bufferSize = 4096; // Match old ScriptProcessor buffer size
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input.length) return true;

    const channelData = input[0]; // mono
    if (!channelData || channelData.length === 0) return true;

    // Accumulate samples until we have a full buffer
    const newBuffer = new Float32Array(this._buffer.length + channelData.length);
    newBuffer.set(this._buffer);
    newBuffer.set(channelData, this._buffer.length);
    this._buffer = newBuffer;

    // Flush when we've accumulated enough
    while (this._buffer.length >= this._bufferSize) {
      const chunk = this._buffer.slice(0, this._bufferSize);
      this._buffer = this._buffer.slice(this._bufferSize);

      // Convert float32 → int16 PCM
      const int16 = new Int16Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) {
        const s = Math.max(-1, Math.min(1, chunk[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      this.port.postMessage(int16, [int16.buffer]);
    }

    return true; // Keep processor alive
  }
}

registerProcessor('pcm-capture', PCMCaptureProcessor);
