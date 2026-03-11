export class EffectsChain {
    constructor(audioContext) {
        this.ctx = audioContext;
        this.input = null;
        this.output = null;
        
        // Effect nodes
        this.lowpass = null;
        this.waveshaper = null;
        this.compressor = null;
        this.reverb = null;
        this.reverbConvolver = null;
        this.masterGain = null;
        
        // Dry/Wet mixers
        this.lpDryWet = { dry: null, wet: null, mix: null };
        this.wsDryWet = { dry: null, wet: null, mix: null };
        this.compDryWet = { dry: null, wet: null, mix: null };
        this.revDryWet = { dry: null, wet: null, mix: null };
        
        this.initChain();
    }

    initChain() {
        if (!this.ctx) return;

        // Input/output
        this.input = this.ctx.createGain();
        this.output = this.ctx.createGain();

        // 1. Low-pass filter
        this.lowpass = this.ctx.createBiquadFilter();
        this.lowpass.type = 'lowpass';
        this.lowpass.frequency.value = 20000;
        this.lowpass.Q.value = 1;

        this.lpDryWet.dry = this.ctx.createGain();
        this.lpDryWet.wet = this.ctx.createGain();
        this.lpDryWet.mix = this.ctx.createGain();
        this.lpDryWet.dry.gain.value = 0;
        this.lpDryWet.wet.gain.value = 1;

        // 2. Waveshaper distortion
        this.waveshaper = this.ctx.createWaveShaper();
        this.waveshaper.curve = this.makeDistortionCurve(0);
        this.waveshaper.oversample = 'none';

        this.wsDryWet.dry = this.ctx.createGain();
        this.wsDryWet.wet = this.ctx.createGain();
        this.wsDryWet.mix = this.ctx.createGain();
        this.wsDryWet.dry.gain.value = 1;
        this.wsDryWet.wet.gain.value = 0;

        // 3. Compressor
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 30;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;

        this.compDryWet.dry = this.ctx.createGain();
        this.compDryWet.wet = this.ctx.createGain();
        this.compDryWet.mix = this.ctx.createGain();
        this.compDryWet.dry.gain.value = 1;
        this.compDryWet.wet.gain.value = 0;

        // 4. Reverb (convolver)
        this.reverbConvolver = this.ctx.createConvolver();
        this.reverb = this.ctx.createGain();
        this.createReverbImpulse(2, 0.5, false);

        this.revDryWet.dry = this.ctx.createGain();
        this.revDryWet.wet = this.ctx.createGain();
        this.revDryWet.mix = this.ctx.createGain();
        this.revDryWet.dry.gain.value = 1;
        this.revDryWet.wet.gain.value = 0;

        // 5. Master volume
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.7;

        // Chain connections:
        // input → LP filter (dry/wet) → WS distortion (dry/wet) → Compressor (dry/wet) → Reverb (dry/wet) → Master → output

        // LP filter chain
        this.input.connect(this.lpDryWet.dry);
        this.input.connect(this.lowpass);
        this.lowpass.connect(this.lpDryWet.wet);

        // WS distortion chain
        this.lpDryWet.dry.connect(this.wsDryWet.dry);
        this.lpDryWet.wet.connect(this.wsDryWet.dry);
        this.lpDryWet.dry.connect(this.waveshaper);
        this.lpDryWet.wet.connect(this.waveshaper);
        this.waveshaper.connect(this.wsDryWet.wet);

        // Compressor chain
        this.wsDryWet.dry.connect(this.compDryWet.dry);
        this.wsDryWet.wet.connect(this.compDryWet.dry);
        this.wsDryWet.dry.connect(this.compressor);
        this.wsDryWet.wet.connect(this.compressor);
        this.compressor.connect(this.compDryWet.wet);

        // Reverb chain
        this.compDryWet.dry.connect(this.revDryWet.dry);
        this.compDryWet.wet.connect(this.revDryWet.dry);
        this.compDryWet.dry.connect(this.reverbConvolver);
        this.compDryWet.wet.connect(this.reverbConvolver);
        this.reverbConvolver.connect(this.reverb);
        this.reverb.connect(this.revDryWet.wet);

        // Master
        this.revDryWet.dry.connect(this.masterGain);
        this.revDryWet.wet.connect(this.masterGain);
        this.masterGain.connect(this.output);
    }

    makeDistortionCurve(amount) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
        }
        return curve;
    }

    createReverbImpulse(duration = 2, decay = 0.5, reverse = false) {
        const rate = this.ctx.sampleRate;
        const length = rate * duration;
        const impulse = this.ctx.createBuffer(2, length, rate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            const n = reverse ? length - i : i;
            left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
            right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
        }

        this.reverbConvolver.buffer = impulse;
    }

    // Low-pass filter controls
    setLowpassCutoff(freq) {
        if (this.lowpass) this.lowpass.frequency.value = freq;
    }

    setLowpassResonance(q) {
        if (this.lowpass) this.lowpass.Q.value = q;
    }

    setLowpassDryWet(dw) {
        if (this.lpDryWet.dry && this.lpDryWet.wet) {
            this.lpDryWet.dry.gain.value = 1 - dw;
            this.lpDryWet.wet.gain.value = dw;
        }
    }

    setLowpassOutputLevel(level) {
        // Applied via mix gain or direct
        // For simplicity, we can adjust wet gain
        if (this.lpDryWet.wet) {
            const dw = this.lpDryWet.wet.gain.value / (this.lpDryWet.dry.gain.value + this.lpDryWet.wet.gain.value || 1);
            this.lpDryWet.wet.gain.value = dw * level;
            this.lpDryWet.dry.gain.value = (1 - dw) * level;
        }
    }

    // Waveshaper controls
    setDistortionAmount(amount) {
        if (this.waveshaper) {
            this.waveshaper.curve = this.makeDistortionCurve(amount);
        }
    }

    setDistortionOversample(mode) {
        if (this.waveshaper) {
            this.waveshaper.oversample = mode; // 'none', '2x', '4x'
        }
    }

    setWaveshaperDryWet(dw) {
        if (this.wsDryWet.dry && this.wsDryWet.wet) {
            this.wsDryWet.dry.gain.value = 1 - dw;
            this.wsDryWet.wet.gain.value = dw;
        }
    }

    setWaveshaperOutputLevel(level) {
        if (this.wsDryWet.wet) {
            const dw = this.wsDryWet.wet.gain.value / (this.wsDryWet.dry.gain.value + this.wsDryWet.wet.gain.value || 1);
            this.wsDryWet.wet.gain.value = dw * level;
            this.wsDryWet.dry.gain.value = (1 - dw) * level;
        }
    }

    // Compressor controls
    setCompressorAttack(val) {
        if (this.compressor) this.compressor.attack.value = val;
    }

    setCompressorKnee(val) {
        if (this.compressor) this.compressor.knee.value = val;
    }

    setCompressorRelease(val) {
        if (this.compressor) this.compressor.release.value = val;
    }

    setCompressorRatio(val) {
        if (this.compressor) this.compressor.ratio.value = val;
    }

    setCompressorThreshold(val) {
        if (this.compressor) this.compressor.threshold.value = val;
    }

    setCompressorDryWet(dw) {
        if (this.compDryWet.dry && this.compDryWet.wet) {
            this.compDryWet.dry.gain.value = 1 - dw;
            this.compDryWet.wet.gain.value = dw;
        }
    }

    setCompressorOutputLevel(level) {
        if (this.compDryWet.wet) {
            const dw = this.compDryWet.wet.gain.value / (this.compDryWet.dry.gain.value + this.compDryWet.wet.gain.value || 1);
            this.compDryWet.wet.gain.value = dw * level;
            this.compDryWet.dry.gain.value = (1 - dw) * level;
        }
    }

    // Reverb controls
    setReverbDuration(dur) {
        const decay = this.reverbConvolver.buffer ? 0.5 : 0.5;
        const reverse = false;
        this.createReverbImpulse(dur, decay, reverse);
    }

    setReverbDecay(decay) {
        const dur = this.reverbConvolver.buffer ? this.reverbConvolver.buffer.duration : 2;
        const reverse = false;
        this.createReverbImpulse(dur, decay, reverse);
    }

    setReverbReverse(rev) {
        const dur = this.reverbConvolver.buffer ? this.reverbConvolver.buffer.duration : 2;
        const decay = 0.5;
        this.createReverbImpulse(dur, decay, rev);
    }

    setReverbDryWet(dw) {
        if (this.revDryWet.dry && this.revDryWet.wet) {
            this.revDryWet.dry.gain.value = 1 - dw;
            this.revDryWet.wet.gain.value = dw;
        }
    }

    setReverbOutputLevel(level) {
        if (this.revDryWet.wet) {
            const dw = this.revDryWet.wet.gain.value / (this.revDryWet.dry.gain.value + this.revDryWet.wet.gain.value || 1);
            this.revDryWet.wet.gain.value = dw * level;
            this.revDryWet.dry.gain.value = (1 - dw) * level;
        }
    }

    // Master volume
    setMasterVolume(vol) {
        if (this.masterGain) this.masterGain.gain.value = vol;
    }

    // Clear all effects (reset to defaults)
    clearEffects() {
        this.setLowpassCutoff(20000);
        this.setLowpassResonance(1);
        this.setLowpassDryWet(0);
        this.setDistortionAmount(0);
        this.setWaveshaperDryWet(0);
        this.setCompressorDryWet(0);
        this.setReverbDryWet(0);
        this.setMasterVolume(0.7);
    }
}
