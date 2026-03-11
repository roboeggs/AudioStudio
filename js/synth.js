export class SynthEngine {
    constructor(bus, updateStatus) {
        this.bus = bus;
        this.updateStatus = updateStatus;
        this.osc = null;
        this.env = null;
        this.customOsc = null;
        this.customEnv = null;
    }

    ensureOsc(pair) {
        const { oscKey, envKey } = pair;
        if (!this[oscKey]) {
            this[oscKey] = new p5.Oscillator();
            this[oscKey].amp(0);
            this[oscKey].start();
            this[envKey] = new p5.Envelope();
        }
    }

    playTone(freq, statusEl, { durationMs = 800, label = '' } = {}) {
        this.bus.init();
        this.ensureOsc({ oscKey: 'osc', envKey: 'env' });
        this.osc.freq(freq);
        this.env.setADSR(0.05, 0.1, 0.2, 0.5);
        this.env.play(this.osc, 1);
        this.updateStatus(statusEl, `${label} ${freq} Hz`, 'recording');
        setTimeout(() => this.stopTone(statusEl, freq), durationMs);
    }

    stopTone(statusEl, freq = 440) {
        if (this.env && this.osc) {
            this.env.triggerRelease(this.osc);
        }
        this.updateStatus(statusEl, `✓ ${freq} Hz`, '');
    }

    playCustom(freq, statusEl, { durationMs = 800 } = {}) {
        this.bus.init();
        this.ensureOsc({ oscKey: 'customOsc', envKey: 'customEnv' });
        this.customOsc.freq(freq);
        this.customEnv.setADSR(0.05, 0.1, 0.2, 0.5);
        this.customEnv.play(this.customOsc, 1);
        this.updateStatus(statusEl, `${freq} Hz`, 'recording');
        setTimeout(() => this.stopCustom(statusEl, freq), durationMs);
    }

    stopCustom(statusEl, freq) {
        if (this.customEnv && this.customOsc) {
            this.customEnv.triggerRelease(this.customOsc);
        }
        this.updateStatus(statusEl, `✓ ${freq} Hz`, '');
    }
}
