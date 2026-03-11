import { AudioStore } from './storage.js';

export class SoundLibrary {
    constructor(bus, effects) {
        this.bus = bus;
        this.effects = effects;
        this.sounds = this.loadFromStorage();
        this.currentPlayingId = null;
        this.currentSource = null;
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem('audioStudioLibrary');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load library:', e);
            return [];
        }
    }

    saveToStorage() {
        try {
            // Store only metadata without large audio payloads
            const metaOnly = this.sounds.map(({ audioData, ...rest }) => rest);
            localStorage.setItem('audioStudioLibrary', JSON.stringify(metaOnly));
        } catch (e) {
            console.error('Failed to save library:', e);
        }
    }

    async addSound(name, audioBuffer, effectsSettings = null) {
        const id = Date.now().toString();
        const sound = {
            id,
            name,
            timestamp: new Date().toISOString(),
            sampleRate: audioBuffer.sampleRate,
            numberOfChannels: audioBuffer.numberOfChannels,
            duration: audioBuffer.duration,
            effects: effectsSettings || this.getCurrentEffectsSettings()
        };
        // Persist audio data in IndexedDB to avoid localStorage quota
        try {
            const base64 = this.bufferToBase64(audioBuffer);
            await AudioStore.set(id, base64);
        } catch (e) {
            console.error('Failed to store audio in IndexedDB:', e);
        }
        
        this.sounds.unshift(sound);
        this.saveToStorage();
        // Ensure sounds array is updated before returning
        return await Promise.resolve(id);
    }

    getCurrentEffectsSettings() {
        return {
            lowpass: {
                cutoff: parseFloat(document.getElementById('lpCutoff')?.value || 20000),
                resonance: parseFloat(document.getElementById('lpQ')?.value || 1),
                dryWet: parseFloat(document.getElementById('lpDW')?.value || 0) / 100,
                outputLevel: parseFloat(document.getElementById('lpOL')?.value || 100) / 100
            },
            waveshaper: {
                amount: parseFloat(document.getElementById('wsAmount')?.value || 0),
                oversample: document.getElementById('wsOversample')?.value || 'none',
                dryWet: parseFloat(document.getElementById('wsDW')?.value || 0) / 100,
                outputLevel: parseFloat(document.getElementById('wsOL')?.value || 100) / 100
            },
            compressor: {
                attack: parseFloat(document.getElementById('compAttack')?.value || 3) / 1000,
                knee: parseFloat(document.getElementById('compKnee')?.value || 30),
                release: parseFloat(document.getElementById('compRelease')?.value || 250) / 1000,
                ratio: parseFloat(document.getElementById('compRatio')?.value || 12),
                threshold: parseFloat(document.getElementById('compThreshold')?.value || -24),
                dryWet: parseFloat(document.getElementById('compDW')?.value || 0) / 100,
                outputLevel: parseFloat(document.getElementById('compOL')?.value || 100) / 100
            },
            reverb: {
                duration: parseFloat(document.getElementById('revDuration')?.value || 2),
                decay: parseFloat(document.getElementById('revDecay')?.value || 0.5),
                reverse: document.getElementById('revReverse')?.checked || false,
                dryWet: parseFloat(document.getElementById('revDW')?.value || 0) / 100,
                outputLevel: parseFloat(document.getElementById('revOL')?.value || 100) / 100
            },
            master: {
                volume: parseFloat(document.getElementById('masterVol')?.value || 70) / 100
            }
        };
    }

    applyEffectsSettings(settings) {
        if (!settings || !this.effects) return;

        // Low-pass
        if (settings.lowpass) {
            this.effects.setLowpassCutoff(settings.lowpass.cutoff);
            this.effects.setLowpassResonance(settings.lowpass.resonance);
            this.effects.setLowpassDryWet(settings.lowpass.dryWet);
            this.effects.setLowpassOutputLevel(settings.lowpass.outputLevel);
            
            document.getElementById('lpCutoff').value = settings.lowpass.cutoff;
            document.getElementById('lpCutoffVal').textContent = settings.lowpass.cutoff;
            document.getElementById('lpQ').value = settings.lowpass.resonance;
            document.getElementById('lpQVal').textContent = settings.lowpass.resonance;
            document.getElementById('lpDW').value = settings.lowpass.dryWet * 100;
            document.getElementById('lpDWVal').textContent = Math.round(settings.lowpass.dryWet * 100);
            document.getElementById('lpOL').value = settings.lowpass.outputLevel * 100;
            document.getElementById('lpOLVal').textContent = Math.round(settings.lowpass.outputLevel * 100);
        }

        // Waveshaper
        if (settings.waveshaper) {
            this.effects.setDistortionAmount(settings.waveshaper.amount);
            this.effects.setDistortionOversample(settings.waveshaper.oversample);
            this.effects.setWaveshaperDryWet(settings.waveshaper.dryWet);
            this.effects.setWaveshaperOutputLevel(settings.waveshaper.outputLevel);
            
            document.getElementById('wsAmount').value = settings.waveshaper.amount;
            document.getElementById('wsAmountVal').textContent = settings.waveshaper.amount;
            document.getElementById('wsOversample').value = settings.waveshaper.oversample;
            document.getElementById('wsDW').value = settings.waveshaper.dryWet * 100;
            document.getElementById('wsDWVal').textContent = Math.round(settings.waveshaper.dryWet * 100);
            document.getElementById('wsOL').value = settings.waveshaper.outputLevel * 100;
            document.getElementById('wsOLVal').textContent = Math.round(settings.waveshaper.outputLevel * 100);
        }

        // Compressor
        if (settings.compressor) {
            this.effects.setCompressorAttack(settings.compressor.attack);
            this.effects.setCompressorKnee(settings.compressor.knee);
            this.effects.setCompressorRelease(settings.compressor.release);
            this.effects.setCompressorRatio(settings.compressor.ratio);
            this.effects.setCompressorThreshold(settings.compressor.threshold);
            this.effects.setCompressorDryWet(settings.compressor.dryWet);
            this.effects.setCompressorOutputLevel(settings.compressor.outputLevel);
            
            document.getElementById('compAttack').value = settings.compressor.attack * 1000;
            document.getElementById('compAttackVal').textContent = Math.round(settings.compressor.attack * 1000);
            document.getElementById('compKnee').value = settings.compressor.knee;
            document.getElementById('compKneeVal').textContent = settings.compressor.knee;
            document.getElementById('compRelease').value = settings.compressor.release * 1000;
            document.getElementById('compReleaseVal').textContent = Math.round(settings.compressor.release * 1000);
            document.getElementById('compRatio').value = settings.compressor.ratio;
            document.getElementById('compRatioVal').textContent = settings.compressor.ratio;
            document.getElementById('compThreshold').value = settings.compressor.threshold;
            document.getElementById('compThresholdVal').textContent = settings.compressor.threshold;
            document.getElementById('compDW').value = settings.compressor.dryWet * 100;
            document.getElementById('compDWVal').textContent = Math.round(settings.compressor.dryWet * 100);
            document.getElementById('compOL').value = settings.compressor.outputLevel * 100;
            document.getElementById('compOLVal').textContent = Math.round(settings.compressor.outputLevel * 100);
        }

        // Reverb
        if (settings.reverb) {
            this.effects.setReverbDuration(settings.reverb.duration);
            this.effects.setReverbDecay(settings.reverb.decay);
            this.effects.setReverbReverse(settings.reverb.reverse);
            this.effects.setReverbDryWet(settings.reverb.dryWet);
            this.effects.setReverbOutputLevel(settings.reverb.outputLevel);
            
            document.getElementById('revDuration').value = settings.reverb.duration;
            document.getElementById('revDurationVal').textContent = settings.reverb.duration.toFixed(1);
            document.getElementById('revDecay').value = settings.reverb.decay;
            document.getElementById('revDecayVal').textContent = settings.reverb.decay;
            document.getElementById('revReverse').checked = settings.reverb.reverse;
            document.getElementById('revDW').value = settings.reverb.dryWet * 100;
            document.getElementById('revDWVal').textContent = Math.round(settings.reverb.dryWet * 100);
            document.getElementById('revOL').value = settings.reverb.outputLevel * 100;
            document.getElementById('revOLVal').textContent = Math.round(settings.reverb.outputLevel * 100);
        }

        // Master
        if (settings.master) {
            this.effects.setMasterVolume(settings.master.volume);
            document.getElementById('masterVol').value = settings.master.volume * 100;
            document.getElementById('masterVolVal').textContent = Math.round(settings.master.volume * 100);
        }
    }

    bufferToBase64(audioBuffer) {
        // Convert first channel to base64
        const channelData = audioBuffer.getChannelData(0);
        const int16Array = new Int16Array(channelData.length);
        for (let i = 0; i < channelData.length; i++) {
            int16Array[i] = Math.max(-32768, Math.min(32767, channelData[i] * 32768));
        }
        const uint8Array = new Uint8Array(int16Array.buffer);
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        return btoa(binary);
    }

    base64ToBuffer(base64, sampleRate, numberOfChannels) {
        const binary = atob(base64);
        const uint8Array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            uint8Array[i] = binary.charCodeAt(i);
        }
        const int16Array = new Int16Array(uint8Array.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768;
        }
        
        const audioBuffer = this.bus.audioContext.createBuffer(numberOfChannels, float32Array.length, sampleRate);
        audioBuffer.getChannelData(0).set(float32Array);
        if (numberOfChannels > 1) {
            audioBuffer.getChannelData(1).set(float32Array);
        }
        return audioBuffer;
    }

    async playSound(id, useEffects = false, onEndedCallback = null) {
        const sound = this.sounds.find(s => s.id === id);
        if (!sound) return false;

        this.stopSound();
        this.bus.init();

        try {
            let base64 = sound.audioData; // legacy entries may still have inline data
            if (!base64) {
                base64 = await AudioStore.get(sound.id);
                if (!base64) {
                    console.error('No audio data found for sound:', sound.id);
                    return false;
                }
            }
            const audioBuffer = this.base64ToBuffer(base64, sound.sampleRate, sound.numberOfChannels);
            const source = this.bus.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            
            this.currentPlayingId = id;
            this.currentSource = source;
            
            source.onended = () => {
                this.currentPlayingId = null;
                this.currentSource = null;
                if (onEndedCallback) {
                    onEndedCallback();
                }
            };

            this.bus.connect(source, useEffects);
            source.start(0);
            return true;
        } catch (e) {
            console.error('Failed to play sound:', e);
            return false;
        }
    }

    stopSound() {
        if (this.currentSource) {
            try {
                this.currentSource.stop();
            } catch (e) {
                // Already stopped
            }
            this.currentSource = null;
        }
        this.currentPlayingId = null;
    }

    // Deprecated - use stopSound() instead
    stopCurrentSound() {
        this.stopSound();
    }

    async deleteSound(id) {
        this.sounds = this.sounds.filter(s => s.id !== id);
        try {
            await AudioStore.delete(id);
        } catch (e) {
            console.warn('Failed to delete audio from store:', e);
        }
        this.saveToStorage();
    }

    updateSoundEffects(id) {
        const sound = this.sounds.find(s => s.id === id);
        if (sound) {
            sound.effects = this.getCurrentEffectsSettings();
            this.saveToStorage();
        }
    }

    getSounds() {
        return this.sounds;
    }

    formatDuration(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    }

    formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('ru-RU', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}
