const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

const GAME_W = 1280;
const GAME_H = 720;

const viewTransform = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    flip180: false
};

const state = {
    scoreRed: 0,
    scoreBlue: 0,
    phase: 'COUNTDOWN', // 'COUNTDOWN' | 'PLAYING' | 'KO_SLOWMO' | 'FADE_OUT' | 'FADE_IN'
    phaseTimer: 0,
    countdownValue: 3,
    timeScale: 1.0,
    fadeAlpha: 0,
    soundEnabled: true,
    waterTime: 0,
    roundTime: 0,
    waterY: GAME_H - 28,
    isDraw: false
};

const inputs = {
    redLeft: false,
    redRight: false,
    blueLeft: false,
    blueRight: false
};

const keyState = {
    redLeft: false,
    redRight: false,
    blueLeft: false,
    blueRight: false
};

const activePointers = new Map();

const controlButtons = [
    { id: 'redLeft', x: 270, y: 614, r: 54, hitR: 68, color: '#e5534b', dir: -1, pressScale: 1 },
    { id: 'redRight', x: 430, y: 614, r: 54, hitR: 68, color: '#e5534b', dir: 1, pressScale: 1 },
    { id: 'blueLeft', x: 850, y: 614, r: 54, hitR: 68, color: '#20b8f9', dir: -1, pressScale: 1 },
    { id: 'blueRight', x: 1010, y: 614, r: 54, hitR: 68, color: '#20b8f9', dir: 1, pressScale: 1 }
];

const uiButtons = {
    ende: { x: GAME_W / 2 - 64, y: GAME_H - 52, w: 128, h: 52 },
    rotate: { x: GAME_W - 118, y: 14, w: 46, h: 42 },
    sound: { x: GAME_W - 62, y: 14, w: 46, h: 42 }
};

class SoundManager {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type, duration, vol = 0.12, slideFreq = null) {
        if (!state.soundEnabled || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);
            if (slideFreq) osc.frequency.exponentialRampToValueAtTime(slideFreq, now + duration);
            gain.gain.setValueAtTime(vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {}
    }

    playCountdown(num) {
        if (num > 0) this.playTone(440, 'sine', 0.14, 0.12);
        else this.playTone(880, 'triangle', 0.25, 0.16);
    }

    playBump(intensity = 1) {
        const vol = Math.min(0.2, 0.04 * intensity);
        this.playTone(130, 'triangle', 0.09, vol, 55);
    }

    playKO() {
        this.playTone(180, 'sawtooth', 0.35, 0.22, 42);
        setTimeout(() => this.playTone(587.33, 'sine', 0.18, 0.14), 80);
        setTimeout(() => this.playTone(880, 'sine', 0.32, 0.15), 180);
    }
}

const sound = new SoundManager();

const smokeParticles = [];
const starParticles = [];

function spawnExhaustSmoke(x, y, vx, vy) {
    smokeParticles.push({
        x, y,
        vx: vx + (Math.random() - 0.5) * 25,
        vy: vy + (Math.random() - 0.5) * 25,
        r: 5 + Math.random() * 4,
        maxR: 13 + Math.random() * 6,
        alpha: 0.85,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.2
    });
}

function spawnWaterSplash(x, y) {
    for (let i = 0; i < 14; i++) {
        const angle = -Math.PI * (0.15 + Math.random() * 0.7);
        const speed = 90 + Math.random() * 190;
        smokeParticles.push({
            x: x + (Math.random() - 0.5) * 20,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            r: 4 + Math.random() * 3,
            maxR: 7 + Math.random() * 4,
            alpha: 0.9,
            life: 0,
            maxLife: 0.4 + Math.random() * 0.25,
            isWater: true
        });
    }
}

function spawnKOStars(x, y) {
    const colors = ['#20b8f9', '#ff5252', '#ffffff', '#20b8f9'];
    for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20 + (Math.random() - 0.5) * 0.3;
        const speed = 120 + Math.random() * 260;
        starParticles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 60,
            size: 9 + Math.random() * 8,
            rot: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 10,
            color: colors[i % colors.length],
            life: 0,
            maxLife: 0.9 + Math.random() * 0.4
        });
    }
}

function updateParticles(dt) {
    for (let i = smokeParticles.length - 1; i >= 0; i--) {
        const p = smokeParticles[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
            smokeParticles.splice(i, 1);
            continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.94;
        p.vy *= 0.94;
        const t = p.life / p.maxLife;
        p.r = 5 + (p.maxR - 5) * t;
        p.alpha = (1 - t) * 0.8;
    }

    for (let i = starParticles.length - 1; i >= 0; i--) {
        const s = starParticles[i];
        s.life += dt;
        if (s.life >= s.maxLife) {
            starParticles.splice(i, 1);
            continue;
        }
        s.vy += 320 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.rot += s.vRot * dt;
    }
}

class Car {
    constructor(id, color, spawnX, spawnY, facing) {
        this.id = id;
        this.color = color;
        this.spawnX = spawnX;
        this.spawnY = spawnY;
        this.defaultFacing = facing;
        this.wheelBase = 62;
        this.wheelYOffset = 20;
        this.wheelRadius = 15.5;
        this.headRadius = 13.5;
        this.mass = 1.0;
        this.inertia = 1950;
        this.reset();
    }

    reset() {
        this.x = this.spawnX;
        this.y = this.spawnY;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.angVel = 0;
        this.facing = this.defaultFacing;
        this.wheelRot = 0;
        this.rearComp = 0;
        this.frontComp = 0;
        this.isKnockedOut = false;
        this.smokeTimer = 0;
        this.groundedWheels = 0;
    }

    localToWorld(lx, ly) {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        return {
            x: this.x + lx * cos - ly * sin,
            y: this.y + lx * sin + ly * cos
        };
    }

    getWheelsWorld() {
        const halfB = this.wheelBase * 0.5;
        const wRear = this.localToWorld(-halfB, this.wheelYOffset - this.rearComp);
        const wFront = this.localToWorld(halfB, this.wheelYOffset - this.frontComp);
        return [
            { x: wRear.x, y: wRear.y, r: this.wheelRadius, isRear: true },
            { x: wFront.x, y: wFront.y, r: this.wheelRadius, isRear: false }
        ];
    }

    getBodyCirclesWorld() {
        const c1 = this.localToWorld(-24, 2);
        const c2 = this.localToWorld(0, 3);
        const c3 = this.localToWorld(24, 2);
        return [
            { x: c1.x, y: c1.y, r: 15 },
            { x: c2.x, y: c2.y, r: 15 },
            { x: c3.x, y: c3.y, r: 15 }
        ];
    }

    getHeadWorld() {
        const h = this.localToWorld(-3 * this.facing, -20);
        return { x: h.x, y: h.y, r: this.headRadius };
    }
}

const carRed = new Car('RED', '#ff5252', 415, 505, 1);
const carBlue = new Car('BLUE', '#20b8f9', 865, 505, -1);
const cars = [carRed, carBlue];
