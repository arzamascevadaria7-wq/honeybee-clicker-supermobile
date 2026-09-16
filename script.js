// Game State Variables
let honey = 0;
let clickPower = 1;
let droneCount = 0;
let cumulativeClickScore = 0; 
let isGamePaused = false;
let lastMilestoneReached = 0; 
let isRaining = false; 

let clickPowerCost = 10;
let royalJellyCost = 150;
let droneCost = 450;

let isMusicMuted = false;
let isSfxMuted = false;

// Web Audio API Variables
let audioCtx = null;
let musicInterval = null;
let currentMelodyNote = 0;

const melodyData = "72,74,76,77,79,81,83,84,83,81,79,77,76,74,72,72";
const melody = melodyData.split(',').map(Number);
const rootsData = "60,64,65,67";
const roots = rootsData.split(',').map(Number);

const rainMelodyData = "76,79,84,88,84,79,76,79,81,84,88,91,88,84,81,84";
const rainMelody = rainMelodyData.split(',').map(Number);
const rainRootsData = "65,67,69,72";
const rainRoots = rainRootsData.split(',').map(Number);

// DOM Elements
const honeyCountEl = document.getElementById('honey-count');
const hpsCountEl = document.getElementById('hps-count');
const milestoneCounterEl = document.getElementById('milestone-counter');
const beeButton = document.getElementById('bee-button');
const skyCanvas = document.getElementById('sky-canvas');
const dashboardEl = document.getElementById('dashboard');
const saveNotification = document.getElementById('save-notification');
const clearSaveBtn = document.getElementById('clear-save-btn');

const buyClickPowerBtn = document.getElementById('buy-click-power');
const clickPowerCostEl = document.getElementById('click-power-cost');
const buyRoyalJellyBtn = document.getElementById('buy-royal-jelly');
const royalJellyCostEl = document.getElementById('royal-jelly-cost');
const buyDroneBtn = document.getElementById('buy-drone');
const droneCostEl = document.getElementById('drone-cost');

const togglePauseBtn = document.getElementById('toggle-pause');
const toggleMusicBtn = document.getElementById('toggle-music');
const toggleSfxBtn = document.getElementById('toggle-sfx');

function saveProgress() {
    const gameState = { honey, clickPower, droneCount, cumulativeClickScore, clickPowerCost, royalJellyCost, droneCost, lastMilestoneReached };
    localStorage.setItem('honeybee_clicker_save', JSON.stringify(gameState));
    saveNotification.classList.add('show');
    setTimeout(() => saveNotification.classList.remove('show'), 1500);
}

function loadProgress() {
    const savedData = localStorage.getItem('honeybee_clicker_save');
    if (savedData) {
        const parsed = JSON.parse(savedData);
        honey = parsed.honey || 0;
        clickPower = parsed.clickPower || 1;
        droneCount = parsed.droneCount || 0;
        cumulativeClickScore = parsed.cumulativeClickScore || 0;
        clickPowerCost = parsed.clickPowerCost || 10;
        royalJellyCost = parsed.royalJellyCost || 150;
        droneCost = parsed.droneCost || 450;
        lastMilestoneReached = parsed.lastMilestoneReached || 0;
    }
}

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        startBackgroundMusic();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playTone(freq, type, duration, volume, startTimeOffset = 0) {
    if (isSfxMuted || isGamePaused || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + startTimeOffset);
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime + startTimeOffset);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + startTimeOffset + duration);
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + startTimeOffset);
    osc.stop(audioCtx.currentTime + startTimeOffset + duration);
}

function startBackgroundMusic() {
    if (musicInterval) clearInterval(musicInterval);
    musicInterval = setInterval(() => {
        if (isMusicMuted || isGamePaused || !audioCtx || audioCtx.state === 'suspended') return;
        const currentRoots = isRaining ? rainRoots : roots;
        const currentMelody = isRaining ? rainMelody : melody;
        const chordIndex = Math.floor(currentMelodyNote / 2) % currentRoots.length;
        const baseFreq = Math.pow(2, (currentRoots[chordIndex] - 69) / 12) * 440;
        
        if (!isMusicMuted) {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.type = isRaining ? 'sine' : 'triangle'; 
            osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(isRaining ? 0.04 : 0.03, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (isRaining ? 0.6 : 0.8));
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + (isRaining ? 0.6 : 0.8));
        }
        
        const midiNote = melody[currentMelodyNote % melody.length];
        const melodyFreq = Math.pow(2, (midiNote - 69) / 12) * 440;
        
        if (!isMusicMuted) {
            const oscM = audioCtx.createOscillator();
            const gainM = audioCtx.createGain();
            oscM.type = 'sine';
            oscM.frequency.setValueAtTime(melodyFreq, audioCtx.currentTime);
            gainM.gain.setValueAtTime(isRaining ? 0.06 : 0.04, audioCtx.currentTime); 
            gainM.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (isRaining ? 0.35 : 0.4));
            oscM.connect(gainM);
            gainM.connect(audioCtx.destination);
            oscM.start();
            oscM.stop(audioCtx.currentTime + (isRaining ? 0.35 : 0.4));
        }
        currentMelodyNote++;
    }, isRaining ? 250 : 400); 
}

function playClickSound() {
    if (isSfxMuted || isGamePaused) return;
    initAudio();
    playTone(523.25, 'sine', 0.1, 0.12); 
    playTone(659.25, 'sine', 0.12, 0.08, 0.03); 
}

function spawnHoneySplatter(x, y) {
    const splatter = document.createElement('div');
    splatter.className = 'honey-splatter';
    const mainRadius = 35 + Math.random() * 35;
    splatter.style.width = mainRadius + 'px';
    splatter.style.height = (mainRadius * 0.85) + 'px';
    splatter.style.left = x + 'px';
    splatter.style.top = y + 'px';
    document.body.appendChild(splatter);
    setTimeout(() => splatter.remove(), 10000); 
}

function triggerHoneyRainEvent() {
    if (isGamePaused) return;
    const dropCount = 60; 
    isRaining = true; 
    startBackgroundMusic(); 
    dashboardEl.classList.add('milestone-glow');
    
    setTimeout(() => {
        isRaining = false;
        startBackgroundMusic(); 
        dashboardEl.classList.remove('milestone-glow');
    }, 10000); 

    for (let i = 0; i < dropCount; i++) {
        setTimeout(() => {
            if (isGamePaused) return;
            const jarDrop = document.createElement('div');
            jarDrop.className = 'giant-honey-jar rain-drop';
            const startX = Math.random() * window.innerWidth;
            jarDrop.style.left = startX + 'px';
            jarDrop.style.top = '-60px';
            
            const driftX = -100 + Math.random() * 200;
            const finalSpin = -400 + Math.random() * 800;
            jarDrop.style.setProperty('--x-drift', driftX + 'px');
            jarDrop.style.setProperty('--r-spin', finalSpin + 'deg');
            document.body.appendChild(jarDrop);
            
            setTimeout(() => {
                if (isGamePaused) return;
                const splashY = (window.innerHeight * 0.3) + Math.random() * (window.innerHeight * 0.5);
                const splashX = startX + (driftX * (splashY / window.innerHeight));
                spawnHoneySplatter(splashX, splashY);
                if (!isSfxMuted) playTone(180 + Math.random() * 120, 'triangle', 0.1, 0.02);
            }, 1200 + Math.random() * 2500);

            setTimeout(() => jarDrop.remove(), 10000); 
        }, i * 120); 
    }
}

function triggerHoneyFireworks(centerX, centerY) {
    if (isGamePaused) return;
    const particleCount = 12; 
    if (!isSfxMuted) {
        playTone(523.25, 'sine', 0.12, 0.12);
        playTone(659.25, 'sine', 0.12, 0.12, 0.05);
        playTone(783.99, 'sine', 0.12, 0.12, 0.1);
    }

    for (let i = 0; i < particleCount; i++) {
        const jar = document.createElement('div');
        jar.className = 'giant-honey-jar burst-particle';
        jar.style.left = centerX + 'px';
        jar.style.top = centerY + 'px';
        const angle = Math.random() * Math.PI * 2;
        const velocity = 100 + Math.random() * 180; 
        const xDist = Math.cos(angle) * velocity;
        const yDist = Math.sin(angle) * velocity + 30; 
        const randomRotation = -180 + Math.random() * 360; 
        jar.style.setProperty('--x', xDist + 'px');
        jar.style.setProperty('--y', yDist + 'px');
        jar.style.setProperty('--r', randomRotation + 'deg');
        document.body.appendChild(jar);
        
        setTimeout(() => {
            if (isGamePaused) return;
            const splatterX = centerX + (xDist * 0.75) + (-15 + Math.random() * 30);
            const splatterY = centerY + (yDist * 0.75) + (-15 + Math.random() * 30);
            spawnHoneySplatter(splatterX, splatterY);
        }, 400 + Math.random() * 400);

        setTimeout(() => jar.remove(), 3000); 
    }
}

function createFloatingNumber(posX, posY, value) {
    const num = document.createElement('div');
    num.className = 'floating-number';
    num.innerText = '+' + value;
    num.style.left = posX + 'px';
    num.style.top = posY + 'px';
    document.body.appendChild(num);
    setTimeout(() => num.remove(), 700);
}

function getCurrentFireworkGoal() {
    let milestoneTiers = Math.floor(honey / 50000);
    return 10000 + (milestoneTiers * 10000);
}

let currentGoal = getCurrentFireworkGoal();
let remaining = currentGoal - (cumulativeClickScore % currentGoal);
milestoneCounterEl.innerText = 'Next Honey Fireworks in: ' + remaining.toLocaleString() + ' points';
}// FIXED: Perfectly safe index-wrapped mobile touch parser compatible with GitHub hosting
function handleBeeClick(e) {
if (isGamePaused) return;if (e.cancelable) e.preventDefault();
initAudio();
honey += clickPower;
checkFireworkMilestone(clickPower);
playClickSound();let clickX, clickY;
// FIXED: Safely targeted index [0] to extract accurate finger touch positions
if (e.changedTouches && e.changedTouches.length > 0) {
clickX = e.changedTouches[0].clientX;
clickY = e.changedTouches[0].clientY;
} else {
clickX = e.clientX;
clickY = e.clientY;
}createFloatingNumber(clickX, clickY, clickPower);
updateUI();beeButton.classList.add('active-squish');
setTimeout(() => beeButton.classList.remove('active-squish'), 80);
}// Attach hybrid native listening handlers
beeButton.addEventListener('touchstart', handleBeeClick, { passive: false });
beeButton.addEventListener('mousedown', (e) => {
if (!('ontouchstart' in window)) handleBeeClick(e);
});buyClickPowerBtn.addEventListener('click', () => {
if (isGamePaused || honey < clickPowerCost) return;
honey -= clickPowerCost; clickPower += 3; clickPowerCost = Math.floor(clickPowerCost * 1.5);
playTone(880, 'sine', 0.2, 0.1); updateUI(); saveProgress();
});buyRoyalJellyBtn.addEventListener('click', () => {
if (isGamePaused || honey < royalJellyCost) return;
honey -= royalJellyCost; clickPower += 10; royalJellyCost = Math.floor(royalJellyCost * 1.65);
playTone(1174.66, 'sine', 0.22, 0.12); updateUI(); saveProgress();
});buyDroneBtn.addEventListener('click', () => {
if (isGamePaused || honey < droneCost) return;
honey -= droneCost; droneCount += 1; droneCost = Math.floor(droneCost * 1.6);
playTone(987.77, 'sine', 0.25, 0.1); updateUI(); saveProgress();
});togglePauseBtn.addEventListener('click', () => {
isGamePaused = !isGamePaused;
togglePauseBtn.innerText = isGamePaused ? " Resume" : " Pause";
togglePauseBtn.classList.toggle('paused-state', isGamePaused);
skyCanvas.classList.toggle('paused', isGamePaused);
updateUI();
});toggleMusicBtn.addEventListener('click', () => {
initAudio(); isMusicMuted = !isMusicMuted;
toggleMusicBtn.innerText = isMusicMuted ? ' Music' : ' Music';
toggleMusicBtn.classList.toggle('muted', isMusicMuted);
});toggleSfxBtn.addEventListener('click', () => {
initAudio(); isSfxMuted = !isSfxMuted;
toggleSfxBtn.innerText = isSfxMuted ? ' SFX' : ' SFX';
toggleSfxBtn.classList.toggle('muted', isSfxMuted);
});clearSaveBtn.addEventListener('click', () => {
if(confirm("Reset all game data?")) { localStorage.removeItem('honeybee_clicker_save'); window.location.reload(); }
});setInterval(() => {
if (droneCount > 0 && !isGamePaused) {
let passiveGain = (droneCount * 20) / 10;
honey += passiveGain; checkFireworkMilestone(passiveGain); updateUI();
}
}, 100);setInterval(() => { if (!isGamePaused) saveProgress(); }, 10000);loadProgress();
updateUI();