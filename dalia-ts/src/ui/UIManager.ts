export class UIManager {
  public canvas = document.getElementById('visualizer') as HTMLCanvasElement;
  public audioEl = document.getElementById('audio-player') as HTMLAudioElement;
  public recordBtn = document.getElementById('record-btn') as HTMLButtonElement;
  public playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement;
  public progressBar = document.getElementById('progress-bar') as HTMLInputElement;
  public timeCurrent = document.getElementById('time-current') as HTMLSpanElement;
  public timeTotal = document.getElementById('time-total') as HTMLSpanElement;
  public presetIndicator = document.getElementById('preset-indicator') as HTMLSpanElement;
  public trackIndicator = document.getElementById('track-indicator') as HTMLSpanElement;
  public loadTrackBtn = document.getElementById('load-track-btn') as HTMLButtonElement;
  public trackFileInput = document.getElementById('track-file-input') as HTMLInputElement;

  private customTrackUrl: string | null = null;
  private presetFlashTimeout: number | null = null;
  public mashupBtnRef: HTMLButtonElement | null = null;

  public formatTime(seconds: number): string {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  public flashPresetIndicator() {
    this.presetIndicator.classList.add('changed');
    if (this.presetFlashTimeout !== null) window.clearTimeout(this.presetFlashTimeout);
    this.presetFlashTimeout = window.setTimeout(() => {
      this.presetIndicator.classList.remove('changed');
    }, 680);
  }

  public syncPresetIndicator(baseName: string, mashupEnabled: boolean) {
    const mashupTag = mashupEnabled ? ' · AUTO 15s' : '';
    this.presetIndicator.textContent = `Preset: ${baseName}${mashupTag}`;
    this.flashPresetIndicator();
  }

  public setTrackIndicator(trackName: string, isCustomTrack: boolean) {
    this.trackIndicator.textContent = isCustomTrack
      ? `Track: ${trackName}`
      : `Track: ${trackName} (default)`;
  }

  public updateMashupIcon(mashupEnabled: boolean) {
    if (this.mashupBtnRef) {
      this.mashupBtnRef.classList.toggle('active', mashupEnabled);
      this.mashupBtnRef.title = mashupEnabled ? 'Mashup Auto (ON)' : 'Mashup Auto (OFF)';
    }
  }

  public initPlayer(onPlay: () => void) {
    this.audioEl.addEventListener('timeupdate', () => {
      const current  = this.audioEl.currentTime;
      const duration = this.audioEl.duration;
      if (!isNaN(duration)) {
        this.progressBar.value = ((current / duration) * 100).toString();
        this.timeCurrent.textContent = this.formatTime(current);
        this.timeTotal.textContent   = this.formatTime(duration);
      }
    });

    this.progressBar.addEventListener('input', () => {
      const duration = this.audioEl.duration;
      if (!isNaN(duration)) {
        this.audioEl.currentTime = (parseFloat(this.progressBar.value) / 100) * duration;
      }
    });

    this.playPauseBtn.addEventListener('click', () => {
      if (this.audioEl.paused) {
        onPlay();
        this.audioEl.play().then(() => {
          this.playPauseBtn.textContent = '⏸';
          document.getElementById('floating-player')?.classList.remove('fade-out');
        });
      } else {
        this.audioEl.pause();
        this.playPauseBtn.textContent = '▶';
      }
    });

    let idleTimeout: number;
    const playerContainer = document.getElementById('floating-player');
    const resetIdleTimer = () => {
      playerContainer?.classList.remove('fade-out');
      clearTimeout(idleTimeout);
      idleTimeout = window.setTimeout(() => {
        if (!this.audioEl.paused && !playerContainer?.matches(':hover')) {
          playerContainer?.classList.add('fade-out');
        }
      }, 3000);
    };
    document.addEventListener('mousemove', resetIdleTimer);
    document.addEventListener('mousedown', resetIdleTimer);
    document.addEventListener('keydown', resetIdleTimer);
    resetIdleTimer();
  }

  public initTrackPicker(defaultTrack: string) {
    this.setTrackIndicator(defaultTrack, false);

    this.loadTrackBtn.addEventListener('click', () => {
      this.trackFileInput.click();
    });

    this.trackFileInput.addEventListener('change', () => {
      const nextFile = this.trackFileInput.files?.[0];
      if (!nextFile) return;

      if (this.customTrackUrl) URL.revokeObjectURL(this.customTrackUrl);
      this.customTrackUrl = URL.createObjectURL(nextFile);

      const shouldResumePlayback = !this.audioEl.paused;
      this.audioEl.src = this.customTrackUrl;
      this.audioEl.load();
      this.audioEl.currentTime = 0;
      this.setTrackIndicator(nextFile.name, true);

      if (shouldResumePlayback) {
        void this.audioEl.play().catch(() => undefined);
      }

      this.trackFileInput.value = '';
    });
  }

  public insertPresetControls(
    onPrev: () => void, 
    onNext: () => void, 
    onToggleMashup: () => void
  ) {
    const player = document.getElementById('floating-player')!;

    const prevBtn = document.createElement('button');
    prevBtn.id        = 'prev-preset-btn';
    prevBtn.className = 'control-btn preset-nav';
    prevBtn.title     = 'Previous Preset';
    prevBtn.innerHTML = '&#9664;';
    prevBtn.addEventListener('click', onPrev);

    const nextBtn = document.createElement('button');
    nextBtn.id        = 'next-preset-btn';
    nextBtn.className = 'control-btn preset-nav';
    nextBtn.title     = 'Next Preset';
    nextBtn.innerHTML = '&#9654;';
    nextBtn.addEventListener('click', onNext);

    const mashupBtn = document.createElement('button');
    mashupBtn.id        = 'mashup-btn';
    mashupBtn.className = 'control-btn mashup';
    mashupBtn.textContent = '🔀';
    mashupBtn.title     = 'Mashup Auto (OFF)';
    mashupBtn.addEventListener('click', onToggleMashup);
    this.mashupBtnRef = mashupBtn;

    const progressWrapper = player.querySelector('.progress-wrapper')!;
    player.insertBefore(prevBtn, progressWrapper);
    player.insertBefore(nextBtn, progressWrapper.nextSibling);
    player.appendChild(mashupBtn);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft')  onPrev();
    });
  }
}
