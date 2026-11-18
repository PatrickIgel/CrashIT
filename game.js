function triggerKnockout(redLost, blueLost) {
    if (state.phase !== 'PLAYING') return;

    state.phase = 'KO_SLOWMO';
    state.phaseTimer = 1.15;
    state.timeScale = 0.22;
    state.isDraw = false;
    sound.playKO();

    if (redLost && !blueLost) {
        carRed.isKnockedOut = true;
        state.scoreBlue += 1;
        const h = carRed.getHeadWorld();
        spawnKOStars(h.x, h.y);
    } else if (blueLost && !redLost) {
        carBlue.isKnockedOut = true;
        state.scoreRed += 1;
        const h = carBlue.getHeadWorld();
        spawnKOStars(h.x, h.y);
    } else {
        carRed.isKnockedOut = true;
        carBlue.isKnockedOut = true;
        state.isDraw = true;
        const hR = carRed.getHeadWorld();
        const hB = carBlue.getHeadWorld();
        spawnKOStars((hR.x + hB.x) * 0.5, (hR.y + hB.y) * 0.5);
    }
}

function startNewRound() {
    carRed.reset();
    carBlue.reset();
    smokeParticles.length = 0;
    starParticles.length = 0;
    state.phase = 'COUNTDOWN';
    state.countdownValue = 3;
    state.phaseTimer = 0.72;
    state.timeScale = 1.0;
    state.roundTime = 0;
    state.waterY = GAME_H - 28;
    state.isDraw = false;
    sound.playCountdown(3);
}

function resetMatchScores() {
    state.scoreRed = 0;
    state.scoreBlue = 0;
    state.fadeAlpha = 0;
    startNewRound();
}

let lastTime = performance.now();

function gameLoop(now) {
    const rawDt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;

    state.waterTime += rawDt;

    if (state.phase === 'COUNTDOWN') {
        state.phaseTimer -= rawDt;
        if (state.phaseTimer <= 0) {
            state.countdownValue -= 1;
            if (state.countdownValue > 0) {
                state.phaseTimer = 0.72;
                sound.playCountdown(state.countdownValue);
            } else {
                state.phase = 'PLAYING';
                sound.playCountdown(0);
            }
        }
        stepPhysics(rawDt);
    } else if (state.phase === 'PLAYING') {
        state.roundTime += rawDt;
        if (state.roundTime > 10.0) {
            state.waterY = Math.max(90, state.waterY - 26 * rawDt);
        }
        stepPhysics(rawDt);
    } else if (state.phase === 'KO_SLOWMO') {
        stepPhysics(rawDt);
        state.phaseTimer -= rawDt;
        if (state.phaseTimer <= 0) state.phase = 'FADE_OUT';
    } else if (state.phase === 'FADE_OUT') {
        state.fadeAlpha += rawDt * 4.2;
        if (state.fadeAlpha >= 1) {
            state.fadeAlpha = 1;
            startNewRound();
            state.phase = 'FADE_IN';
        }
    } else if (state.phase === 'FADE_IN') {
        state.fadeAlpha -= rawDt * 4.2;
        if (state.fadeAlpha <= 0) {
            state.fadeAlpha = 0;
            state.phase = 'COUNTDOWN';
            state.countdownValue = 3;
            state.phaseTimer = 0.72;
        }
    }

    updateParticles(rawDt * state.timeScale);
    render();
    requestAnimationFrame(gameLoop);
}

window.onload = function () {
    initArenaVisuals();
    startNewRound();
    requestAnimationFrame(gameLoop);
};
