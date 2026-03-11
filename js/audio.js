export class AudioBus {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.freqData = null;
        this.analyserOut = null;
        this.freqDataOut = null;
        this.effectsChain = null;
    }

    init() {
        const p5Ctx = (typeof p5 !== 'undefined' && p5.soundOut && p5.soundOut.audioContext)
            ? p5.soundOut.audioContext
            : null;

        if (p5Ctx && this.audioContext && this.audioContext !== p5Ctx) {
            this.audioContext = p5Ctx;
        }

        if (!this.audioContext) {
            this.audioContext = p5Ctx || new (window.AudioContext || window.webkitAudioContext)();
            console.log('AudioContext initialized:', this.audioContext.state);
        }

        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {});
        }

        if (!this.analyser && this.audioContext) {
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 1024;
            this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

            this.analyserOut = this.audioContext.createAnalyser();
            this.analyserOut.fftSize = 1024;
            this.freqDataOut = new Uint8Array(this.analyserOut.frequencyBinCount);

            // Tap p5 master output if available so synth reaches analyser
            if (typeof p5 !== 'undefined' && p5.soundOut && p5.soundOut.output && p5.soundOut.output.context === this.audioContext) {
                p5.soundOut.output.connect(this.analyser);
            }
        }

        return this.audioContext;
    }

    connect(node, useEffects = false) {
        if (!node) return;
        if (!this.audioContext) this.init();

        const p5Ctx = (typeof p5 !== 'undefined' && p5.soundOut && p5.soundOut.audioContext)
            ? p5.soundOut.audioContext
            : null;

        const targetCtx = node.context || this.audioContext;

        // If effects chain is enabled, route through it
        if (useEffects && this.effectsChain && this.effectsChain.input) {
            try {
                // Connect source to input analyser (original)
                if (this.analyser && targetCtx === this.analyser.context) {
                    node.connect(this.analyser);
                }
                
                // Connect source to effects chain
                node.connect(this.effectsChain.input);
                
                // Connect effects output to output analyser (processed)
                if (this.analyserOut && this.effectsChain.output.context === this.analyserOut.context) {
                    this.effectsChain.output.connect(this.analyserOut);
                }
                
                // Connect effects output to destination for audio
                if (targetCtx && targetCtx.destination) {
                    this.effectsChain.output.connect(targetCtx.destination);
                }
                return;
            } catch (e) {
                console.warn('Effects chain connect failed:', e);
            }
        }

        // Prefer chaining through analyser to visualize
        try {
            if (this.analyser && targetCtx === this.analyser.context) {
                node.connect(this.analyser);
            }
        } catch (e) {
            console.warn('Analyser connect skipped:', e);
        }

        // Also connect to destination for audible output
        try {
            if (targetCtx && targetCtx.destination) {
                node.connect(targetCtx.destination);
            }
        } catch (e) {
            console.warn('Destination connect skipped:', e);
        }

        // If p5 master input exists and contexts match, attach for consistency
        if (p5Ctx && targetCtx === p5Ctx && typeof p5 !== 'undefined' && p5.soundOut && p5.soundOut.input) {
            try { node.connect(p5.soundOut.input); } catch (e) { console.warn('p5 input connect skipped:', e); }
        }
    }

    getAnalyserData() {
        if (!this.analyser || !this.freqData) return null;
        this.analyser.getByteFrequencyData(this.freqData);
        return this.freqData;
    }

    getAnalyserOutData() {
        if (!this.analyserOut || !this.freqDataOut) return null;
        this.analyserOut.getByteFrequencyData(this.freqDataOut);
        return this.freqDataOut;
    }
}
