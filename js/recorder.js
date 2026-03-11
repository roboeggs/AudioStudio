export class Recorder {
    constructor(bus, updateStatus) {
        this.bus = bus;
        this.updateStatus = updateStatus;
        this.mediaRecorder = null;
        this.mediaStream = null;
        this.audioChunks = [];
        this.recordedBlob = null;
        this.recordedBuffer = null;
        this.playSource = null;
        this.isRecording = false;
    }

    async start(statusEl) {
        try {
            this.bus.init();
            this.updateStatus(statusEl, '🎤 Requesting microphone...', 'recording');
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
            });
            this.mediaRecorder = new MediaRecorder(this.mediaStream);
            this.audioChunks = [];
            this.recordedBlob = null;

            this.mediaRecorder.ondataavailable = (evt) => {
                if (evt.data.size > 0) this.audioChunks.push(evt.data);
            };

            this.mediaRecorder.onstop = () => {
                this.recordedBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.updateStatus(statusEl, '🔴 Recording...', 'recording');
            return true;
        } catch (err) {
            this.updateStatus(statusEl, '❌ Microphone access denied', 'error');
            console.error('Recording error:', err);
            return false;
        }
    }

    stop(statusEl) {
        if (!this.isRecording || !this.mediaRecorder || this.mediaRecorder.state !== 'recording') return;
        this.mediaRecorder.stop();
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(t => t.stop());
        }
        this.isRecording = false;
        this.updateStatus(statusEl, '✓ Recording saved. You can listen or download.', 'success');
    }

    async play(statusEl, onEnded, useEffects = false) {
        if (!this.recordedBlob) return false;
        this.bus.init();
        const arrayBuffer = await this.recordedBlob.arrayBuffer();
        this.recordedBuffer = await this.bus.audioContext.decodeAudioData(arrayBuffer);
        this.playSource = this.bus.audioContext.createBufferSource();
        this.playSource.buffer = this.recordedBuffer;
        this.playSource.onended = () => {
            if (onEnded) onEnded();
            this.updateStatus(statusEl, '✓ Playback finished', 'success');
        };
        this.bus.connect(this.playSource, useEffects);
        this.playSource.start();
        this.updateStatus(statusEl, '🔊 Playing...', 'recording');
        return true;
    }

    download(statusEl) {
        if (!this.recordedBlob) return;
        const url = URL.createObjectURL(this.recordedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recording-${Date.now()}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.updateStatus(statusEl, '✓ Downloaded', 'success');
    }

    getRecordedBuffer() {
        return this.recordedBuffer;
    }
}
