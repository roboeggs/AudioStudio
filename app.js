import { AudioBus } from './js/audio.js';
import { Visualizer } from './js/visualizer.js';
import { Recorder } from './js/recorder.js';
import { FilePlayer } from './js/uploader.js';
import { EffectsChain } from './js/effects.js';
import { SoundLibrary } from './js/library.js';

// DOM helpers
const el = (id) => document.getElementById(id);
const setStatus = (id, message, variant = '') => {
    const target = el(id);
    if (!target) return;
    target.textContent = message;
    target.className = `status-box ${variant}`.trim();
};

// Elements
const recordBtn = el('recordBtn');
const stopRecordBtn = el('stopRecordBtn');
const selectRecordBtn = el('selectRecordBtn');
const downloadBtn = el('downloadBtn');
const selectUploadBtn = el('selectUploadBtn');
const fileInput = el('audioFile');
const fileNameEl = el('fileName');
const universalPlayBtn = el('universalPlayBtn');
const universalStopBtn = el('universalStopBtn');

// Core objects
const bus = new AudioBus();
const visualizer = new Visualizer(bus);
const recorder = new Recorder(bus, setStatus);
const uploader = new FilePlayer(bus, setStatus, fileNameEl);
let effects = null;
let effectsEnabled = false;
let library = null;

// Playback state
let currentSource = null; // 'record', 'upload', or library sound ID
let currentSourceType = null; // 'record', 'upload', 'library'
let isPlaying = false;
let isRecording = false;

function disable(elem, state) {
    if (elem) elem.disabled = state;
}

// Recording toggle
recordBtn?.addEventListener('click', async () => {
    if (!isRecording) {
        // Start recording
        const ok = await recorder.start('recordStatus');
        if (ok) {
            isRecording = true;
            recordBtn.textContent = '⏹';
            recordBtn.title = 'Stop recording';
            disable(recordBtn, false);
            disable(selectRecordBtn, true);
            disable(downloadBtn, true);
            recordBtn.classList.add('recording');
        }
    } else {
        // Stop recording
        recorder.stop('recordStatus');
        isRecording = false;
        recordBtn.textContent = '●';
        recordBtn.title = 'Record';
        disable(selectRecordBtn, false);
        disable(downloadBtn, false);
        recordBtn.classList.remove('recording');
    }
});

selectRecordBtn?.addEventListener('click', () => {
    currentSource = 'record';
    currentSourceType = 'record';
    disable(universalPlayBtn, false);
    setStatus('playbackStatus', 'Source: Microphone recording', '');
});

downloadBtn?.addEventListener('click', () => recorder.download('recordStatus'));

// Upload / file playback
fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const ok = await uploader.loadFile(file, 'uploadStatus');
    if (ok) {
        disable(selectUploadBtn, false);
    }
});

selectUploadBtn?.addEventListener('click', () => {
    currentSource = 'upload';
    currentSourceType = 'upload';
    disable(universalPlayBtn, false);
    setStatus('playbackStatus', `Source: ${fileNameEl.textContent}`, '');
});

// Universal playback controls
universalPlayBtn?.addEventListener('click', async () => {
    if (isPlaying) return;
    
    bus.init();
    disable(universalPlayBtn, true);
    disable(universalStopBtn, false);
    isPlaying = true;
    
    const onEnded = () => {
        disable(universalPlayBtn, false);
        disable(universalStopBtn, true);
        isPlaying = false;
        if (currentSourceType === 'record') {
            setStatus('playbackStatus', 'Source: Microphone recording (completed)', '');
        } else if (currentSourceType === 'upload') {
            setStatus('playbackStatus', `Source: ${fileNameEl.textContent} (completed)`, '');
        } else if (currentSourceType === 'library') {
            setStatus('playbackStatus', 'Source: Library (completed)', '');
        }
    };
    
    if (currentSourceType === 'record') {
        setStatus('playbackStatus', '▶ Playing recording...', '');
        await recorder.play('playbackStatus', onEnded, effectsEnabled);
    } else if (currentSourceType === 'upload') {
        setStatus('playbackStatus', '▶ Playing file...', '');
        const ok = uploader.play('playbackStatus', onEnded, effectsEnabled);
        if (!ok) {
            onEnded();
        }
    } else if (currentSourceType === 'library' && library) {
        setStatus('playbackStatus', '▶ Playing from library...', '');
        library.playSound(currentSource, effectsEnabled, onEnded);
    }
});

universalStopBtn?.addEventListener('click', () => {
    if (!isPlaying) return;
    
    if (currentSourceType === 'record') {
        recorder.stop('playbackStatus');
    } else if (currentSourceType === 'upload') {
        uploader.stop('playbackStatus');
    } else if (currentSourceType === 'library' && library) {
        library.stopSound();
    }
    
    disable(universalPlayBtn, false);
    disable(universalStopBtn, true);
    isPlaying = false;
    
    if (currentSourceType === 'record') {
        setStatus('playbackStatus', 'Source: Microphone recording (stopped)', '');
    } else if (currentSourceType === 'upload') {
        setStatus('playbackStatus', `Source: ${fileNameEl.textContent} (stopped)`, '');
    } else if (currentSourceType === 'library') {
        setStatus('playbackStatus', 'Source: Library (stopped)', '');
    }
});

// Visualizer
window.addEventListener('load', () => {
    bus.init();
    visualizer.mount();
    
    // Initialize effects chain
    effects = new EffectsChain(bus.audioContext);
    bus.effectsChain = effects;
    
    // Initialize sound library
    library = new SoundLibrary(bus, effects);
    renderLibrary();
    
    setupEffectsControls();
    setupLibraryControls();
});

// Effects controls setup
function setupEffectsControls() {
    // Low-pass filter
    el('lpCutoff')?.addEventListener('input', (e) => {
        const val = e.target.value;
        el('lpCutoffVal').textContent = val;
        effects.setLowpassCutoff(parseFloat(val));
    });
    
    el('lpQ')?.addEventListener('input', (e) => {
        const val = e.target.value;
        el('lpQVal').textContent = val;
        effects.setLowpassResonance(parseFloat(val));
    });
    
    el('lpDW')?.addEventListener('input', (e) => {
        const val = e.target.value;
        el('lpDWVal').textContent = val;
        effects.setLowpassDryWet(parseFloat(val) / 100);
    });
    
    el('lpOL')?.addEventListener('input', (e) => {
        const val = e.target.value;
        el('lpOLVal').textContent = val;
        effects.setLowpassOutputLevel(parseFloat(val) / 100);
    });
    
    // Waveshaper
    el('wsAmount')?.addEventListener('input', (e) => {
        const val = e.target.value;
        el('wsAmountVal').textContent = val;
        effects.setDistortionAmount(parseFloat(val));
    });
    
    el('wsOversample')?.addEventListener('change', (e) => {
        effects.setDistortionOversample(e.target.value);
    });
    
    el('wsDW')?.addEventListener('input', (e) => {
        const val = e.target.value;
        el('wsDWVal').textContent = val;
        effects.setWaveshaperDryWet(parseFloat(val) / 100);
    });
    
    el('wsOL')?.addEventListener('input', (e) => {
        const val = e.target.value;
        el('wsOLVal').textContent = val;
        effects.setWaveshaperOutputLevel(parseFloat(val) / 100);
    });
    
    // Compressor
    el('compAttack')?.addEventListener('input', (e) => {
        const val = e.target.value;
        el('compAttackVal').textContent = val;
        effects.setCompressorAttack(parseFloat(val) / 1000);
    });
    
    el('compKnee')?.addEventListener('input', (e) => {
        const val = e.target.value;
        el('compKneeVal').textContent = val;
        effects.setCompressorKnee(parseFloat(val));
    });
    
    el('compRelease')?.addEventListener('input', (e) => {
        const val = e.target.value;
        el('compReleaseVal').textContent = val;
        effects.setCompressorRelease(parseFloat(val) / 1000);
    });
    
    el('compRatio')?.addEventListener('input', (e) => {
        const val = e.target.value;
        el('compRatioVal').textContent = val;
        effects.setCompressorRatio(parseFloat(val));
    });
    
    el('compThreshold')?.addEventListener('input', (e) => {
        const val = e.target.value;
        el('compThresholdVal').textContent = val;
        effects.setCompressorThreshold(parseFloat(val));
    });
    
    el('compDW')?.addEventListener('input', (e) => {
        const val = e.target.value;
        el('compDWVal').textContent = val;
        effects.setCompressorDryWet(parseFloat(val) / 100);
    });
    
    el('compOL')?.addEventListener('input', (e) => {
        const val = e.target.value;
        el('compOLVal').textContent = val;
        effects.setCompressorOutputLevel(parseFloat(val) / 100);
    });
    
    // Reverb
    el('revDuration')?.addEventListener('input', (e) => {
        const val = e.target.value;
        el('revDurationVal').textContent = parseFloat(val).toFixed(1);
        effects.setReverbDuration(parseFloat(val));
    });
    
    el('revDecay')?.addEventListener('input', (e) => {
        const val = e.target.value;
        el('revDecayVal').textContent = val;
        effects.setReverbDecay(parseFloat(val));
    });
    
    el('revReverse')?.addEventListener('change', (e) => {
        effects.setReverbReverse(e.target.checked);
    });
    
    el('revDW')?.addEventListener('input', (e) => {
        const val = e.target.value;
        el('revDWVal').textContent = val;
        effects.setReverbDryWet(parseFloat(val) / 100);
    });
    
    el('revOL')?.addEventListener('input', (e) => {
        const val = e.target.value;
        el('revOLVal').textContent = val;
        effects.setReverbOutputLevel(parseFloat(val) / 100);
    });
    
    // Master volume
    el('masterVol')?.addEventListener('input', (e) => {
        const val = e.target.value;
        el('masterVolVal').textContent = val;
        effects.setMasterVolume(parseFloat(val) / 100);
    });
    
    // Clear effects
    el('clearEffectsBtn')?.addEventListener('click', () => {
        effects.clearEffects();
        // Reset UI
        el('lpCutoff').value = 20000;
        el('lpCutoffVal').textContent = 20000;
        el('lpQ').value = 1;
        el('lpQVal').textContent = 1;
        el('lpDW').value = 0;
        el('lpDWVal').textContent = 0;
        el('lpOL').value = 100;
        el('lpOLVal').textContent = 100;
        
        el('wsAmount').value = 0;
        el('wsAmountVal').textContent = 0;
        el('wsOversample').value = 'none';
        el('wsDW').value = 0;
        el('wsDWVal').textContent = 0;
        el('wsOL').value = 100;
        el('wsOLVal').textContent = 100;
        
        el('compAttack').value = 3;
        el('compAttackVal').textContent = 3;
        el('compKnee').value = 30;
        el('compKneeVal').textContent = 30;
        el('compRelease').value = 250;
        el('compReleaseVal').textContent = 250;
        el('compRatio').value = 12;
        el('compRatioVal').textContent = 12;
        el('compThreshold').value = -24;
        el('compThresholdVal').textContent = -24;
        el('compDW').value = 0;
        el('compDWVal').textContent = 0;
        el('compOL').value = 100;
        el('compOLVal').textContent = 100;
        
        el('revDuration').value = 2;
        el('revDurationVal').textContent = '2.0';
        el('revDecay').value = 0.5;
        el('revDecayVal').textContent = 0.5;
        el('revReverse').checked = false;
        el('revDW').value = 0;
        el('revDWVal').textContent = 0;
        el('revOL').value = 100;
        el('revOLVal').textContent = 100;
        
        el('masterVol').value = 70;
        el('masterVolVal').textContent = 70;
    });
    
    // Enable/disable effects
    el('enableEffects')?.addEventListener('change', (e) => {
        effectsEnabled = e.target.checked;
    });

    // Toggle collapse/expand all effect cards
    const toggleBtn = el('toggleEffectsCollapse');
    if (toggleBtn) {
        let expanded = false; // default collapsed
        toggleBtn.addEventListener('click', () => {
            document.querySelectorAll('details.effect-card').forEach(d => {
                d.open = !expanded;
            });
            expanded = !expanded;
            toggleBtn.textContent = expanded ? '↕ Collapse all' : '↕ Expand all';
        });
    }
}

// Library controls
function setupLibraryControls() {
    el('saveRecordingBtn')?.addEventListener('click', async () => {
        const buffer = recorder.getRecordedBuffer();
        if (buffer) {
            const name = prompt('Enter a name for the recording:', `Recording ${new Date().toLocaleTimeString('en-GB')}`);
            if (name) {
                await library.addSound(name, buffer);
                renderLibrary();
                alert('✓ Recording saved to library');
            }
        }
    });

    el('saveUploadBtn')?.addEventListener('click', async () => {
        const buffer = uploader.getLoadedBuffer();
        if (buffer) {
            const name = prompt('Enter a name for the file:', `File ${new Date().toLocaleTimeString('en-GB')}`);
            if (name) {
                await library.addSound(name, buffer);
                renderLibrary();
                alert('✓ File saved to library');
            }
        }
    });

    // Update button states when recordings/uploads are available
    const originalRecorderPlay = recorder.play.bind(recorder);
    recorder.play = async function(...args) {
        el('saveRecordingBtn').disabled = false;
        return originalRecorderPlay(...args);
    };

    const originalUploaderLoad = uploader.loadFile.bind(uploader);
    uploader.loadFile = async function(...args) {
        const result = await originalUploaderLoad(...args);
        if (result) {
            el('saveUploadBtn').disabled = false;
        }
        return result;
    };
}

function renderLibrary() {
    const container = el('libraryList');
    if (!container || !library) return;

    const sounds = library.getSounds();
    
    if (sounds.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:20px; color:#64748b; font-size:13px;">
                Library is empty. Save a recording or an uploaded file.
            </div>
        `;
        return;
    }

    container.innerHTML = sounds.map(sound => `
        <div class="library-item" data-id="${sound.id}">
            <div style="flex:1;">
                <div style="font-weight:700; font-size:14px; color:#1f2933;">${sound.name}</div>
                <div style="font-size:12px; color:#64748b; margin-top:2px;">
                    ${library.formatDuration(sound.duration)} • ${library.formatDate(sound.timestamp)}
                </div>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button class="lib-btn lib-select" data-id="${sound.id}" title="Select for playback">✓</button>
                <button class="lib-btn lib-load" data-id="${sound.id}" title="Load effects">🎛</button>
                <button class="lib-btn lib-save" data-id="${sound.id}" title="Save current effects">💾</button>
                <button class="lib-btn lib-delete" data-id="${sound.id}" title="Delete">🗑</button>
            </div>
        </div>
    `).join('');

    // Add event listeners
    container.querySelectorAll('.lib-select').forEach(btn => {
        btn.addEventListener('click', () => {
            const sound = sounds.find(s => s.id === btn.dataset.id);
            if (sound) {
                currentSource = btn.dataset.id;
                currentSourceType = 'library';
                disable(universalPlayBtn, false);
                setStatus('playbackStatus', `Source: ${sound.name} (library)`, '');
            }
        });
    });

    container.querySelectorAll('.lib-load').forEach(btn => {
        btn.addEventListener('click', () => {
            const sound = sounds.find(s => s.id === btn.dataset.id);
            if (sound && sound.effects) {
                library.applyEffectsSettings(sound.effects);
                alert('Effects loaded');
            }
        });
    });

    container.querySelectorAll('.lib-save').forEach(btn => {
        btn.addEventListener('click', () => {
            library.updateSoundEffects(btn.dataset.id);
            alert('Effect settings saved');
        });
    });

    container.querySelectorAll('.lib-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Delete this sound from the library?')) {
                library.deleteSound(btn.dataset.id);
                renderLibrary();
            }
        });
    });
}
