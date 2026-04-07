export class RecordingManager {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  private setQuickButtonIdle(button: HTMLButtonElement) {
    button.disabled = false;
    button.classList.remove('recording');
    button.textContent = 'REC';
  }

  private setQuickButtonRecording(button: HTMLButtonElement) {
    button.disabled = false;
    button.classList.add('recording');
    button.textContent = 'STOP REC';
  }

  private selectRecordingMimeType(): string {
    const mimeCandidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];

    for (const mime of mimeCandidates) {
      if (MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }

    return '';
  }

  private downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
  }

  public toggleQuickRecording(
    canvas: HTMLCanvasElement,
    audioDestination: MediaStreamAudioDestinationNode | null,
    quickBtn: HTMLButtonElement,
  ) {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      this.startQuickRecording(canvas, audioDestination, quickBtn);
      return;
    }

    this.stopRecording();
  }

  private startQuickRecording(
    canvas: HTMLCanvasElement,
    audioDestination: MediaStreamAudioDestinationNode | null,
    quickBtn: HTMLButtonElement,
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
    const mimeType = this.selectRecordingMimeType();
    const recorderOptions: MediaRecorderOptions = { videoBitsPerSecond: 6_000_000 };

    if (mimeType) {
      recorderOptions.mimeType = mimeType;
    }

    this.mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const outputMime = mimeType || 'video/webm';
      const blob = new Blob(this.recordedChunks, { type: outputMime });

      this.recordedChunks = [];
      this.mediaRecorder = null;

      // Solo se detienen pistas de video para no alterar la ruta de audio activa.
      canvasStream.getTracks().forEach((track) => {
        track.stop();
      });
      combinedStream.getVideoTracks().forEach((track) => {
        track.stop();
      });

      if (blob.size > 0) {
        this.downloadBlob(blob, 'dalia-quick.webm');
      }

      this.setQuickButtonIdle(quickBtn);
    };

    this.mediaRecorder.start();
    this.setQuickButtonRecording(quickBtn);
  }

  public stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }
}
