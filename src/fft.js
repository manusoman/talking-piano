(() => { 'use strict';
// My own implementation of the "Fast Fourier Transform".

const log2 = Math.log2;

const fft = data => {
    const len = data.length;

    if(!Number.isInteger(log2(len))) throw 'FFT data size is not a power of 2';

    const { cosList, sinList } = computeTrigs(len);
    return calcFFT(data, cosList, sinList, 0, 1, len);
}

function calcFFT(data, cosList, sinList, start, offset, N) {
    const real = new Float32Array(N);
    const imag = new Float32Array(N);
    
    if(N === 1) {
        real[0] = data[start];
        return { real, imag };
    }
    
    const half_N = N / 2;
    const offsetNew = 2 * offset;
    const Y_even = calcFFT(data, cosList, sinList, start, offsetNew, half_N);
    const Y_odd = calcFFT(data, cosList, sinList, start + offset, offsetNew, half_N);

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
};

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

if(window) window.fft = fft; // For browsers
else module.exports = fft; // For NodeJS

})();
