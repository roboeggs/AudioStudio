export class Visualizer {
    constructor(bus) {
        this.bus = bus;
        this.instance = null;
    }

    mount() {
        if (this.instance) return;
        const self = this;
        this.instance = new p5((p) => {
            let fft;

            p.setup = function() {
                const container = document.getElementById('p5-sketch');
                const width = container.offsetWidth - 40;
                const canvas = p.createCanvas(width, 360);
                canvas.parent('p5-sketch');
                fft = new p5.FFT();
                if (typeof p5 !== 'undefined' && p5.soundOut && p5.soundOut.output) {
                    fft.setInput(p5.soundOut.output);
                }
            };

            p.draw = function() {
                const dataIn = self.bus.getAnalyserData();
                const dataOut = self.bus.getAnalyserOutData();
                const spectrumIn = dataIn || fft.analyze();
                const spectrumOut = dataOut || new Uint8Array(spectrumIn.length);

                const topMargin = 15;
                const bottomMargin = 25;
                const leftMargin = 35;
                const rightMargin = 25;
                const halfHeight = p.height / 2;

                p.background(245);

                // === TOP: Original Spectrum ===
                p.fill(80);
                p.noStroke();
                p.textSize(11);
                p.textAlign(p.LEFT, p.TOP);
                p.text('Original', leftMargin, 5);

                // Grid lines and Y-axis labels for top
                p.stroke(220);
                p.strokeWeight(0.5);
                p.fill(120);
                p.textSize(10);
                p.textAlign(p.RIGHT, p.CENTER);
                const plotHeightTop = halfHeight - topMargin - 10;
                for (let i = 0; i <= 5; i++) {
                    const y = topMargin + (plotHeightTop / 5) * i;
                    p.line(leftMargin, y, p.width - rightMargin, y);
                    const amp = Math.round(p.map(i, 0, 5, 100, 0));
                    p.noStroke();
                    p.text(amp, leftMargin - 5, y);
                    p.stroke(220);
                }

                // X-axis frequency labels for top
                p.textAlign(p.CENTER, p.TOP);
                const nyquist = (self.bus.audioContext?.sampleRate || 48000) / 2;
                const freqSteps = 5;
                for (let i = 0; i <= freqSteps; i++) {
                    const x = p.map(i, 0, freqSteps, leftMargin, p.width - rightMargin);
                    const freq = Math.round(p.map(i, 0, freqSteps, 0, nyquist));
                    p.noStroke();
                    p.fill(120);
                    p.text(freq >= 1000 ? `${(freq/1000).toFixed(1)}k` : freq, x, halfHeight - 10 + 5);
                    p.stroke(220);
                    p.line(x, topMargin, x, halfHeight - 10);
                }

                // Original spectrum curve (green)
                p.stroke(52, 168, 83);
                p.strokeWeight(1.8);
                p.noFill();
                p.beginShape();
                for (let i = 0; i < spectrumIn.length; i++) {
                    const x = p.map(i, 0, spectrumIn.length, leftMargin, p.width - rightMargin);
                    const h = p.map(spectrumIn[i], 0, 255, halfHeight - 10, topMargin);
                    p.vertex(x, h);
                }
                p.endShape();

                // === BOTTOM: Processed Spectrum ===
                p.fill(80);
                p.noStroke();
                p.textSize(11);
                p.textAlign(p.LEFT, p.TOP);
                p.text('Processed', leftMargin, halfHeight + 5);

                // Grid lines and Y-axis labels for bottom
                p.stroke(220);
                p.strokeWeight(0.5);
                p.fill(120);
                p.textSize(10);
                p.textAlign(p.RIGHT, p.CENTER);
                const plotHeightBottom = halfHeight - topMargin - bottomMargin;
                for (let i = 0; i <= 5; i++) {
                    const y = halfHeight + topMargin + (plotHeightBottom / 5) * i;
                    p.line(leftMargin, y, p.width - rightMargin, y);
                    const amp = Math.round(p.map(i, 0, 5, 100, 0));
                    p.noStroke();
                    p.text(amp, leftMargin - 5, y);
                    p.stroke(220);
                }

                // X-axis frequency labels for bottom
                p.textAlign(p.CENTER, p.TOP);
                for (let i = 0; i <= freqSteps; i++) {
                    const x = p.map(i, 0, freqSteps, leftMargin, p.width - rightMargin);
                    const freq = Math.round(p.map(i, 0, freqSteps, 0, nyquist));
                    p.noStroke();
                    p.fill(120);
                    p.text(freq >= 1000 ? `${(freq/1000).toFixed(1)}k` : freq, x, p.height - bottomMargin + 5);
                    p.stroke(220);
                    p.line(x, halfHeight + topMargin, x, p.height - bottomMargin);
                }

                // Processed spectrum curve (blue)
                p.stroke(61, 109, 246);
                p.strokeWeight(1.8);
                p.noFill();
                p.beginShape();
                for (let i = 0; i < spectrumOut.length; i++) {
                    const x = p.map(i, 0, spectrumOut.length, leftMargin, p.width - rightMargin);
                    const h = p.map(spectrumOut[i], 0, 255, p.height - bottomMargin, halfHeight + topMargin);
                    p.vertex(x, h);
                }
                p.endShape();
            };

            p.windowResized = function() {
                const host = document.getElementById('p5-sketch');
                if (host && host.offsetParent) {
                    const width = host.offsetWidth - 40;
                    p.resizeCanvas(width, 360);
                }
            };
        });
    }
}
