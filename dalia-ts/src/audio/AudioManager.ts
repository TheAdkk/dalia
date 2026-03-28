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
}
