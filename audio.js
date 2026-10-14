/**
 * 楊梅高中分機一覽表 - Web Audio API 音效引擎與語音朗讀系統
 * 純原生效能合成，零外部依賴，支援離線環境與各平台瀏覽器
 */

class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = true;
    this.speechEnabled = true;

    // 從 localStorage 恢復使用者設定
    const savedSound = localStorage.getItem("ymhs_sound_enabled");
    if (savedSound !== null) {
      this.soundEnabled = savedSound === "true";
    }

    // DTMF 雙音多頻頻率矩陣 (國際標準電信標準)
    this.dtmfFreqs = {
      '1': { low: 697, high: 1209 },
      '2': { low: 697, high: 1336 },
      '3': { low: 697, high: 1477 },
      '4': { low: 770, high: 1209 },
      '5': { low: 770, high: 1336 },
      '6': { low: 770, high: 1477 },
      '7': { low: 852, high: 1209 },
      '8': { low: 852, high: 1336 },
      '9': { low: 852, high: 1477 },
      '*': { low: 941, high: 1209 },
      '0': { low: 941, high: 1336 },
      '#': { low: 941, high: 1477 }
    };
  }

  // 確保 AudioContext 已初始化（瀏覽器需要使用者互動才能啟動）
  initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  // 切換音效開關
  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem("ymhs_sound_enabled", this.soundEnabled);
    if (this.soundEnabled) {
      this.playDing();
    }
    return this.soundEnabled;
  }

  // 1. 輕快按鈕點擊音 (Pop)
  playClick() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.audioCtx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.05);
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }

  // 2. 複製成功提示雙音階 (Ding-Dong 亮麗和弦)
  playCopySuccess() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;

      // 第一個音: D5 (587.33 Hz)
      this.playNote(587.33, now, 0.14, 0.15);
      // 第二個音: A5 (880 Hz) 高音明亮
      this.playNote(880.00, now + 0.08, 0.28, 0.15);
      // 和音疊加 (增添晶瑩質感): F#6 (1479.98 Hz)
      this.playNote(1479.98, now + 0.10, 0.22, 0.06);
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }

  playNote(freq, startTime, duration, maxGain = 0.1) {
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(maxGain, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // 3. 收藏星星音效 (清脆向上琶音)
  playFavorite(isAdded = true) {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      if (isAdded) {
        // C6 -> E6 -> G6 升調
        this.playNote(1046.50, now, 0.09, 0.1);
        this.playNote(1318.51, now + 0.07, 0.09, 0.1);
        this.playNote(1567.98, now + 0.14, 0.2, 0.12);
      } else {
        // 降調
        this.playNote(1318.51, now, 0.08, 0.08);
        this.playNote(987.77, now + 0.07, 0.15, 0.08);
      }
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }

  // 4. 標準 DTMF 電話撥號音（雙音多頻）
  playDTMF(char) {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.audioCtx) return;

    const freqs = this.dtmfFreqs[char];
    if (!freqs) {
      this.playClick();
      return;
    }

    try {
      const now = this.audioCtx.currentTime;
      const duration = 0.16;

      const oscLow = this.audioCtx.createOscillator();
      const oscHigh = this.audioCtx.createOscillator();
      const gainLow = this.audioCtx.createGain();
      const gainHigh = this.audioCtx.createGain();
      const masterGain = this.audioCtx.createGain();

      oscLow.type = "sine";
      oscLow.frequency.setValueAtTime(freqs.low, now);

      oscHigh.type = "sine";
      oscHigh.frequency.setValueAtTime(freqs.high, now);

      gainLow.gain.setValueAtTime(0.12, now);
      gainHigh.gain.setValueAtTime(0.12, now);

      masterGain.gain.setValueAtTime(0.2, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      oscLow.connect(gainLow);
      oscHigh.connect(gainHigh);
      gainLow.connect(masterGain);
      gainHigh.connect(masterGain);
      masterGain.connect(this.audioCtx.destination);

      oscLow.start(now);
      oscHigh.start(now);
      oscLow.stop(now + duration);
      oscHigh.stop(now + duration);
    } catch (e) {
      console.warn("DTMF error:", e);
    }
  }

  // 5. 撥打電話呼叫音 (模擬標準撥號鈴聲 Ringing)
  playCallRing(callback) {
    if (!this.soundEnabled) {
      if (callback) callback();
      return;
    }
    this.initContext();
    if (!this.audioCtx) {
      if (callback) callback();
      return;
    }

    try {
      const now = this.audioCtx.currentTime;
      // 撥號連線音 440Hz + 480Hz
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
      gain.gain.setValueAtTime(0.15, now + 0.8);
      gain.gain.linearRampToValueAtTime(0, now + 1.0);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.0);
      osc2.stop(now + 1.0);

      if (callback) {
        setTimeout(callback, 1050);
      }
    } catch (e) {
      if (callback) callback();
    }
  }

  // 6. 清脆單音 (Ding)
  playDing() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.audioCtx) return;
    this.playNote(880, this.audioCtx.currentTime, 0.2, 0.15);
  }

  // 7. 語音朗讀分機資訊 (Web Speech Synthesis API)
  speak(text) {
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel(); // 停止先前的朗讀
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-TW";
      utterance.rate = 1.05; // 稍快而自然
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
    }
  }
}

// 全域單例
const soundEngine = new SoundEngine();
