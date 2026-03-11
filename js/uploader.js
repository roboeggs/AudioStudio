export class FilePlayer {
    constructor(bus, updateStatus, fileNameEl) {
        this.bus = bus;
        this.updateStatus = updateStatus;
        this.fileNameEl = fileNameEl;
        this.buffer = null;
        this.source = null;
        this.isPlaying = false;
    }

    async loadFile(file, statusEl) {
        if (!file) return false;
        try {
            this.bus.init();
            const arrayBuffer = await file.arrayBuffer();
            this.buffer = await this.bus.audioContext.decodeAudioData(arrayBuffer);
            const duration = this.buffer.duration.toFixed(2);
            this.updateStatus(statusEl, ` Loaded: ${file.name}`, 'success');
            if (this.fileNameEl) this.fileNameEl.textContent = `Duration: ${duration}s`;
            return true;
        } catch (err) {
            this.updateStatus(statusEl, 'Failed to load file', 'error');
            console.error('File load error:', err);
            return false;
        }
    }

    play(statusEl, onEnded, useEffects = false) {
        if (!this.buffer) return false;
        this.bus.init();
        this.source = this.bus.audioContext.createBufferSource();
        this.source.buffer = this.buffer;
        this.source.onended = () => {
            this.isPlaying = false;
            if (onEnded) onEnded();
            this.updateStatus(statusEl, 'Playback finished', 'success');
        };
        this.bus.connect(this.source, useEffects);
        this.source.start();
        this.isPlaying = true;
        this.updateStatus(statusEl, 'Playing...', 'recording');
        return true;
    }

    stop(statusEl) {
        if (this.source && this.isPlaying) {
            this.source.stop();
            this.isPlaying = false;
            this.updateStatus(statusEl, 'Stopped', 'success');
        }
    }

    getLoadedBuffer() {
        return this.buffer;
    }
}
