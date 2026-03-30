import { CONFIG } from '../core/config';

export type LookaheadTimeline = {
  fps: number;
  energy: Float32Array;
  transient: Float32Array;
  lowBand: Float32Array;
};

export class AudioManager {
  public audioCtx: AudioContext | null = null;
  public analyser: AnalyserNode | null = null;
  public leftAnalyser: AnalyserNode | null = null;
  public rightAnalyser: AnalyserNode | null = null;
  public dataArray: Uint8Array | null = null;
  public leftDataArray: Uint8Array | null = null;
  public rightDataArray: Uint8Array | null = null;
  public audioSampleRate = 44_100;
  public isAudioConnected = false;
  public audioDestination: MediaStreamAudioDestinationNode | null = null;
  private lookaheadCache = new Map<string, Promise<LookaheadTimeline | null>>();

  public connect(audioEl: HTMLAudioElement, onConnected?: () => void) {
    if (this.isAudioConnected) return;

    this.audioCtx = new AudioContext();
    this.audioSampleRate = this.audioCtx.sampleRate;

    this.analyser = this.audioCtx.createAnalyser();
    this.leftAnalyser = this.audioCtx.createAnalyser();
    this.rightAnalyser = this.audioCtx.createAnalyser();

    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.75;
    this.leftAnalyser.fftSize = 2048;
    this.leftAnalyser.smoothingTimeConstant = 0.72;
    this.rightAnalyser.fftSize = 2048;
    this.rightAnalyser.smoothingTimeConstant = 0.72;

    const source = this.audioCtx.createMediaElementSource(audioEl);
    const splitter = this.audioCtx.createChannelSplitter(2);

    source.connect(this.analyser);
    source.connect(splitter);
    splitter.connect(this.leftAnalyser, 0);
    splitter.connect(this.rightAnalyser, 1);
    this.analyser.connect(this.audioCtx.destination);

    this.audioDestination = this.audioCtx.createMediaStreamDestination();
    this.analyser.connect(this.audioDestination);

    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.leftDataArray = new Uint8Array(this.leftAnalyser.frequencyBinCount);
    this.rightDataArray = new Uint8Array(this.rightAnalyser.frequencyBinCount);
    
    this.isAudioConnected = true;

    if (onConnected) {
      onConnected();
    }
  }

  public getFrequencies() {
    if (!this.isAudioConnected || !this.analyser || !this.dataArray || !this.leftDataArray || !this.rightDataArray || !this.leftAnalyser || !this.rightAnalyser) {
      return null;
    }
    this.analyser.getByteFrequencyData(this.dataArray as any);
    this.leftAnalyser.getByteFrequencyData(this.leftDataArray as any);
    this.rightAnalyser.getByteFrequencyData(this.rightDataArray as any);
    return {
      fftSize: this.analyser.fftSize,
      leftFftSize: this.leftAnalyser.fftSize,
      rightFftSize: this.rightAnalyser.fftSize,
      dataArray: this.dataArray,
      leftDataArray: this.leftDataArray,
      rightDataArray: this.rightDataArray,
      audioSampleRate: this.audioSampleRate
    };
  }

  public async resume() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  public async buildLookaheadTimeline(audioEl: HTMLAudioElement): Promise<LookaheadTimeline | null> {
    if (!this.audioCtx || !CONFIG.RUST_ABSOLUTE_LOOKAHEAD_ENABLED) {
      return null;
    }

    const trackSrc = audioEl.currentSrc || audioEl.src;
    if (!trackSrc) {
      return null;
    }

    const cached = this.lookaheadCache.get(trackSrc);
    if (cached) {
      return cached;
    }

    const pending = this.computeLookaheadTimeline(trackSrc);
    this.lookaheadCache.set(trackSrc, pending);
    return pending;
  }

  private async computeLookaheadTimeline(trackSrc: string): Promise<LookaheadTimeline | null> {
    try {
      const response = await fetch(trackSrc);
      if (!response.ok) {
        return null;
      }

      const encoded = await response.arrayBuffer();
      const decoded = await this.audioCtx!.decodeAudioData(encoded.slice(0));
      return this.extractLookaheadTimeline(decoded);
    } catch {
      return null;
    }
  }

  private extractLookaheadTimeline(buffer: AudioBuffer): LookaheadTimeline | null {
    const desiredFps = Math.max(12, CONFIG.RUST_ABSOLUTE_LOOKAHEAD_FPS);
    const sampleRate = buffer.sampleRate;
    const frameStep = Math.max(1, Math.floor(sampleRate / desiredFps));
    const analysisWindow = Math.max(frameStep, Math.floor(sampleRate * CONFIG.RUST_ABSOLUTE_LOOKAHEAD_WINDOW_SEC));
    const frameCount = Math.max(1, Math.ceil(buffer.length / frameStep));

    const rawEnergy = new Float32Array(frameCount);
    const rawLowBand = new Float32Array(frameCount);
    const rawTransient = new Float32Array(frameCount);

    const channelCount = Math.max(1, buffer.numberOfChannels);
    const channels: Float32Array[] = [];
    for (let i = 0; i < channelCount; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let prevMonoSample = 0;
    let fastEnergy = 0;
    let slowEnergy = 0;
    let prevRms = 0;

    for (let frame = 0; frame < frameCount; frame++) {
      const center = frame * frameStep;
      const start = Math.max(0, center - Math.floor(analysisWindow * 0.5));
      const end = Math.min(buffer.length, start + analysisWindow);

      if (end <= start) {
        continue;
      }

      let squareSum = 0;
      let diffSquareSum = 0;

      for (let sample = start; sample < end; sample++) {
        let mono = 0;
        for (let channel = 0; channel < channelCount; channel++) {
          mono += channels[channel][sample] ?? 0;
        }
        mono /= channelCount;

        squareSum += mono * mono;

        const diff = mono - prevMonoSample;
        diffSquareSum += diff * diff;
        prevMonoSample = mono;
      }

      const sampleCount = end - start;
      const rms = Math.sqrt(squareSum / sampleCount);
      const diffRms = Math.sqrt(diffSquareSum / sampleCount);
      const lowBand = Math.max(0, rms * 1.08 - diffRms * 0.62);

      fastEnergy += (rms - fastEnergy) * 0.34;
      slowEnergy += (rms - slowEnergy) * 0.08;
      const edgeRise = Math.max(0, rms - prevRms);

      rawEnergy[frame] = rms;
      rawLowBand[frame] = lowBand;
      rawTransient[frame] = Math.max(0, fastEnergy - slowEnergy) + edgeRise * 0.82;

      prevRms = rms;
    }

    const energy = this.normalizeSignal(rawEnergy, 0.08, 0.96);
    const transient = this.normalizeSignal(rawTransient, 0.12, 0.985);
    const lowBand = this.normalizeSignal(rawLowBand, 0.1, 0.965);

    return {
      fps: sampleRate / frameStep,
      energy,
      transient,
      lowBand,
    };
  }

  private normalizeSignal(values: Float32Array, floorQuantile: number, ceilQuantile: number): Float32Array {
    if (values.length === 0) {
      return values;
    }

    const sorted = Array.from(values).sort((a, b) => a - b);
    const maxIdx = sorted.length - 1;
    const floor = sorted[Math.max(0, Math.min(maxIdx, Math.floor(maxIdx * floorQuantile)))];
    const ceil = sorted[Math.max(0, Math.min(maxIdx, Math.floor(maxIdx * ceilQuantile)))];
    const span = Math.max(0.001, ceil - floor);

    const normalized = new Float32Array(values.length);
    for (let i = 0; i < values.length; i++) {
      const v = (values[i] - floor) / span;
      normalized[i] = Math.max(0, Math.min(1, v));
    }
    return normalized;
  }
}
