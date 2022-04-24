(() => { 'use strict';
// My own implementation of the "Fast Fourier Transform".

if(!window.appSupport) return;

const { log2, hypot } = Math;

const getFrequencyData = data => {
    const len = data.length;
    if(!Number.isInteger(log2(len))) throw 'Data size is not a power of 2';

    const { cosList, sinList } = computeTrigs(len);
    const { real, imag } = fft(data, len, cosList, sinList, 0, 1);

    // Find the magnitudes of fft output.
    // Here, only the first half of the fft output is considered
    // as the second half is just a mirror image of the first half.
    let i = len / 2;
    const frequencyData = new Float32Array(i);
    while(i--) frequencyData[i] = hypot(real[i], imag[i]);
    return frequencyData;
};

function fft(data, N, cosList, sinList, start, offset) {
    const real = new Float32Array(N);
    const imag = new Float32Array(N);
    
    if(N === 1) {
        real[0] = data[start];
        return { real, imag };
    }
    
    const half_N = N / 2;
    const offsetNew = 2 * offset;
    const Y_even = fft(data, half_N, cosList, sinList, start, offsetNew);
    const Y_odd = fft(data, half_N, cosList, sinList, start + offset, offsetNew);

    let i = half_N;

    while(i--) {
        const trigIndex = i * offset;
        const r1 = cosList[trigIndex];
        const i1 = sinList[trigIndex];
        const r2 = Y_odd.real[i];
        const i2 = Y_odd.imag[i];
        const br = (r1 * r2) - (i1 * i2);
        const bi = (r1 * i2) + (r2 * i1);
        const ar = Y_even.real[i];
        const ai = Y_even.imag[i];

        real[i] = ar + br;
        imag[i] = ai + bi;
        real[i + half_N] = ar - br;
        imag[i + half_N] = ai - bi;
    }

    return { real, imag };
}

function computeTrigs(N) {
    let len = N / 2;
    const cosList = new Float32Array(len);
    const sinList = new Float32Array(len);
    const theta = Math.PI * 2 / N;
    const { cos, sin } = Math;

    while(len--) {
        const angle = theta * len;
        cosList[len] = cos(angle);
        sinList[len] = sin(angle);
    }

    return { cosList, sinList };
}

window.getFrequencyData = getFrequencyData;

})();
