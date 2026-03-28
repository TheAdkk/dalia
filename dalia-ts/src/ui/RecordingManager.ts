export class RecordingManager {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  public toggleRecording(
    canvas: HTMLCanvasElement,
    audioDestination: MediaStreamAudioDestinationNode | null,
    recordBtn: HTMLButtonElement
  ) {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      this.startRecording(canvas, audioDestination, recordBtn);
    } else {
      this.stopRecording();
    }
  }

  private startRecording(
    canvas: HTMLCanvasElement,
    audioDestination: MediaStreamAudioDestinationNode | null,
    recordBtn: HTMLButtonElement
  ) {
    this.recordedChunks = [];
    const canvasStream = canvas.captureStream(60);
    
    const streamTracks = [...canvasStream.getVideoTracks()];
    if (audioDestination) {
      const audioTrack = audioDestination.stream.getAudioTracks()[0];
      if (audioTrack) {
        streamTracks.push(audioTrack);
      }
    }
    const combinedStream = new MediaStream(streamTracks);

    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

    this.mediaRecorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 5_000_000 });
    this.mediaRecorder.ondataavailable = (e) => { 
      if (e.data.size > 0) this.recordedChunks.push(e.data); 
    };
    
    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, { type: mimeType });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.style.display = 'none';
      a.href     = url;
      a.download = 'dalia-render.webm';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      recordBtn.classList.remove('recording');
      recordBtn.textContent = '🔴 REC';
    };
    
    this.mediaRecorder.start();
    recordBtn.classList.add('recording');
    recordBtn.textContent = '⏹ STOP';
  }

  public stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }
}
