import { PLAY_ICON, PAUSE_ICON, NEXT_ICON, PREV_ICON, GEAR_ICON } from './icons';

type SettingsMenuOptions = {
  presetNames: readonly string[];
  mashupEnabled: boolean;
  mashupAutoRunsWithoutToggle: boolean;
  fpsEnabled: boolean;
  onToggleMashup: (enabled: boolean) => void;
  onApplyPreset: (presetIdx: number) => void;
  onToggleFps: (enabled: boolean) => void;
};

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
  public settingsBtnRef: HTMLButtonElement | null = null;
  public mashupToggleRef: HTMLInputElement | null = null;
  public presetSelectRef: HTMLSelectElement | null = null;
  public fpsToggleRef: HTMLInputElement | null = null;
  public fpsOverlayRef: HTMLDivElement | null = null;
  private fpsEnabled = false;
  private fpsLastPaintAt = 0;

  private resetTimelineUi() {
    this.progressBar.value = '0';
    this.timeCurrent.textContent = '0:00';
    this.timeTotal.textContent = '0:00';
  }

  private ensureFpsOverlay(): HTMLDivElement {
    if (this.fpsOverlayRef) return this.fpsOverlayRef;

    const existing = document.getElementById('fps-overlay');
    if (existing instanceof HTMLDivElement) {
      this.fpsOverlayRef = existing;
      return existing;
    }

    const overlay = document.createElement('div');
    overlay.id = 'fps-overlay';
    overlay.className = 'fps-overlay';
    overlay.textContent = 'FPS --';
    document.body.appendChild(overlay);
    this.fpsOverlayRef = overlay;
    return overlay;
  }

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

  public syncPresetIndicator(baseName: string, mashupEnabled: boolean, dynamicMode = false) {
    const mashupTag = mashupEnabled
      ? (dynamicMode ? ' · AUTO DYN' : ' · AUTO 15s')
      : '';
    this.presetIndicator.textContent = `Preset: ${baseName}${mashupTag}`;
    this.flashPresetIndicator();
  }

  public setTrackIndicator(trackName: string, isCustomTrack: boolean) {
    this.trackIndicator.textContent = isCustomTrack
      ? `Track: ${trackName}`
      : `Track: ${trackName} (default)`;
  }

  public updateMashupIcon(mashupEnabled: boolean) {
    if (this.settingsBtnRef) {
      this.settingsBtnRef.classList.toggle('active', mashupEnabled);
      this.settingsBtnRef.title = mashupEnabled ? 'Settings - Mashup ON' : 'Settings';
    }
    if (this.mashupToggleRef && this.mashupToggleRef.checked !== mashupEnabled) {
      this.mashupToggleRef.checked = mashupEnabled;
    }
  }

  public syncPresetSelection(presetIdx: number) {
    if (!this.presetSelectRef) return;
    this.presetSelectRef.value = String(presetIdx);
  }

  public setFpsEnabled(enabled: boolean) {
    this.fpsEnabled = enabled;
    if (this.fpsToggleRef && this.fpsToggleRef.checked !== enabled) {
      this.fpsToggleRef.checked = enabled;
    }

    const overlay = this.ensureFpsOverlay();
    overlay.classList.toggle('visible', enabled);
    if (!enabled) {
      overlay.textContent = 'FPS --';
      this.fpsLastPaintAt = 0;
    }
  }

  public updateFps(fps: number) {
    if (!this.fpsEnabled) return;

    const now = performance.now();
    if (now - this.fpsLastPaintAt < 160) return;
    this.fpsLastPaintAt = now;

    const overlay = this.ensureFpsOverlay();
    overlay.textContent = `FPS ${fps.toFixed(1)}`;
  }

  public initPlayer(onPlay: () => void) {
    this.resetTimelineUi();

    this.audioEl.addEventListener('timeupdate', () => {
      const current  = this.audioEl.currentTime;
      const duration = this.audioEl.duration;
      if (!isNaN(duration)) {
        this.progressBar.value = ((current / duration) * 100).toString();
        this.timeCurrent.textContent = this.formatTime(current);
        this.timeTotal.textContent   = this.formatTime(duration);
      }
    });

    this.audioEl.addEventListener('loadedmetadata', () => {
      this.resetTimelineUi();
      const duration = this.audioEl.duration;
      if (!isNaN(duration)) {
        this.timeTotal.textContent = this.formatTime(duration);
      }
    });

    this.audioEl.addEventListener('durationchange', () => {
      const duration = this.audioEl.duration;
      if (!isNaN(duration)) {
        this.timeTotal.textContent = this.formatTime(duration);
      }
    });

    this.audioEl.addEventListener('play', () => {
      this.playPauseBtn.innerHTML = PAUSE_ICON;
      document.getElementById('floating-player')?.classList.remove('fade-out');
    });

    this.audioEl.addEventListener('pause', () => {
      this.playPauseBtn.innerHTML = PLAY_ICON;
    });

    this.audioEl.addEventListener('ended', () => {
      this.playPauseBtn.innerHTML = PLAY_ICON;
      this.progressBar.value = '100';
      const duration = this.audioEl.duration;
      if (!isNaN(duration)) {
        this.timeCurrent.textContent = this.formatTime(duration);
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
        void this.audioEl.play().catch(() => undefined);
      } else {
        this.audioEl.pause();
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
      this.audioEl.pause();
      this.audioEl.src = this.customTrackUrl;
      this.audioEl.load();
      this.audioEl.currentTime = 0;
      this.resetTimelineUi();
      this.playPauseBtn.innerHTML = PLAY_ICON;
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
    options: SettingsMenuOptions
  ) {
    const player = document.getElementById('floating-player')!;

    const prevBtn = document.createElement('button');
    prevBtn.id        = 'prev-preset-btn';
    prevBtn.className = 'control-btn preset-nav';
    prevBtn.title     = 'Previous Preset';
    prevBtn.innerHTML = PREV_ICON;
    prevBtn.addEventListener('click', onPrev);

    const nextBtn = document.createElement('button');
    nextBtn.id        = 'next-preset-btn';
    nextBtn.className = 'control-btn preset-nav';
    nextBtn.title     = 'Next Preset';
    nextBtn.innerHTML = NEXT_ICON;
    nextBtn.addEventListener('click', onNext);

    const settingsWrap = document.createElement('div');
    settingsWrap.className = 'settings-wrap';

    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'settings-btn';
    settingsBtn.className = 'control-btn settings';
    settingsBtn.innerHTML = GEAR_ICON;
    settingsBtn.title = 'Settings';
    settingsBtn.type = 'button';
    settingsBtn.setAttribute('aria-haspopup', 'true');
    settingsBtn.setAttribute('aria-expanded', 'false');
    this.settingsBtnRef = settingsBtn;

    const panel = document.createElement('div');
    panel.className = 'settings-panel';
    panel.hidden = true;
    panel.style.left = '8px';
    panel.style.top = '8px';
    document.body.appendChild(panel);

    // ─── Header ───
    const header = document.createElement('div');
    header.className = 'settings-header';
    const headerDot = document.createElement('div');
    headerDot.className = 'settings-header-icon';
    const title = document.createElement('div');
    title.className = 'settings-title';
    title.textContent = 'Visual Settings';
    header.append(headerDot, title);

    // ─── Body ───
    const body = document.createElement('div');
    body.className = 'settings-body';

    // ─── Section: Playback ───
    const sectionPlayback = document.createElement('div');
    sectionPlayback.className = 'settings-section';

    const mashupRow = document.createElement('label');
    mashupRow.className = 'settings-row';
    const mashupLabelWrap = document.createElement('div');
    mashupLabelWrap.className = 'settings-row-label';
    const mashupLabel = document.createElement('div');
    mashupLabel.textContent = 'Mashup mode';
    mashupLabelWrap.appendChild(mashupLabel);
    if (options.mashupAutoRunsWithoutToggle) {
      const mashupSub = document.createElement('div');
      mashupSub.className = 'settings-row-sub';
      mashupSub.textContent = 'Dynamic auto-switching stays active even when this toggle is off.';
      mashupLabelWrap.appendChild(mashupSub);
    }
    const mashupToggleWrap = document.createElement('div');
    mashupToggleWrap.className = 'settings-toggle';
    const mashupToggle = document.createElement('input');
    mashupToggle.type = 'checkbox';
    mashupToggle.checked = options.mashupEnabled;
    mashupToggle.addEventListener('change', () => {
      options.onToggleMashup(mashupToggle.checked);
    });
    const mashupTrack = document.createElement('span');
    mashupTrack.className = 'settings-toggle-track';
    mashupToggleWrap.append(mashupToggle, mashupTrack);
    mashupRow.append(mashupLabelWrap, mashupToggleWrap);
    this.mashupToggleRef = mashupToggle;

    // ─── Section: Preset ───
    const sectionPreset = document.createElement('div');
    sectionPreset.className = 'settings-section';

    const presetRow = document.createElement('label');
    presetRow.className = 'settings-stack';
    const presetText = document.createElement('span');
    presetText.className = 'settings-caption';
    presetText.textContent = 'Preset to test';
    const presetSelect = document.createElement('select');
    presetSelect.className = 'settings-select';
    options.presetNames.forEach((name, idx) => {
      const option = document.createElement('option');
      option.value = String(idx);
      option.textContent = `${idx + 1}. ${name}`;
      presetSelect.appendChild(option);
    });
    presetRow.append(presetText, presetSelect);
    this.presetSelectRef = presetSelect;

    const applyPresetBtn = document.createElement('button');
    applyPresetBtn.type = 'button';
    applyPresetBtn.className = 'settings-apply-btn';
    applyPresetBtn.textContent = 'Apply preset';
    applyPresetBtn.addEventListener('click', () => {
      const presetIdx = Number.parseInt(presetSelect.value, 10);
      if (Number.isFinite(presetIdx)) {
        options.onApplyPreset(presetIdx);
      }
      closePanel();
    });

    // ─── Section: Display ───
    const sectionDisplay = document.createElement('div');
    sectionDisplay.className = 'settings-section';

    const fpsRow = document.createElement('label');
    fpsRow.className = 'settings-row';
    const fpsLabelWrap = document.createElement('div');
    fpsLabelWrap.className = 'settings-row-label';
    fpsLabelWrap.textContent = 'Show FPS';
    const fpsToggleWrap = document.createElement('div');
    fpsToggleWrap.className = 'settings-toggle';
    const fpsToggle = document.createElement('input');
    fpsToggle.type = 'checkbox';
    fpsToggle.checked = options.fpsEnabled;
    fpsToggle.addEventListener('change', () => {
      options.onToggleFps(fpsToggle.checked);
      this.setFpsEnabled(fpsToggle.checked);
    });
    const fpsTrack = document.createElement('span');
    fpsTrack.className = 'settings-toggle-track';
    fpsToggleWrap.append(fpsToggle, fpsTrack);
    fpsRow.append(fpsLabelWrap, fpsToggleWrap);
    this.fpsToggleRef = fpsToggle;

    // Assemble
    sectionPlayback.append(mashupRow);
    sectionPreset.append(presetRow, applyPresetBtn);
    sectionDisplay.append(fpsRow);
    body.append(sectionPlayback, sectionPreset, sectionDisplay);
    panel.append(header, body);

    const repositionPanel = () => {
      if (panel.hidden) return;

      const buttonRect = settingsBtn.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();

      let left = buttonRect.right - panelRect.width;
      let top = buttonRect.top - panelRect.height - 12;

      left = Math.max(8, Math.min(left, window.innerWidth - panelRect.width - 8));
      top = Math.max(8, Math.min(top, window.innerHeight - panelRect.height - 8));

      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
    };

    const closePanel = () => {
      panel.hidden = true;
      settingsBtn.classList.remove('menu-open');
      settingsBtn.setAttribute('aria-expanded', 'false');
    };

    settingsBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      const willOpen = panel.hidden;
      panel.hidden = !willOpen;
      settingsBtn.classList.toggle('menu-open', willOpen);
      settingsBtn.setAttribute('aria-expanded', String(willOpen));
      if (willOpen) {
        repositionPanel();
      }
    });

    window.addEventListener('resize', repositionPanel);
    window.addEventListener('scroll', repositionPanel, true);

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!settingsWrap.contains(target) && !panel.contains(target)) {
        closePanel();
      }
    });

    settingsWrap.append(settingsBtn);

    const progressWrapper = player.querySelector('.progress-wrapper')!;
    player.insertBefore(prevBtn, progressWrapper);
    player.insertBefore(nextBtn, progressWrapper.nextSibling);
    player.appendChild(settingsWrap);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closePanel();
      }

      const target = e.target;
      const editingField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement;
      if (editingField) return;

      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    });

    this.updateMashupIcon(options.mashupEnabled);
    this.setFpsEnabled(options.fpsEnabled);
  }
}
