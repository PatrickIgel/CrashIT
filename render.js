function drawCaveContourPath() {
    ctx.beginPath();
    const pts = arena.contourPoints;
    if (pts.length === 0) return;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
}

function drawCityBackground() {
    const skyGrad = ctx.createLinearGradient(0, 80, 0, 560);
    skyGrad.addColorStop(0, '#d3aab9');
    skyGrad.addColorStop(1, '#c397a9');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(150, 60, 980, 520);

    ctx.fillStyle = '#b1869b';
    const backBuildings = [
        { x: 160, y: 210, w: 95, h: 360 },
        { x: 255, y: 265, w: 70, h: 305 },
        { x: 325, y: 170, w: 110, h: 400 },
        { x: 435, y: 245, w: 85, h: 325 },
        { x: 520, y: 195, w: 120, h: 375 },
        { x: 680, y: 175, w: 105, h: 395 },
        { x: 785, y: 235, w: 90, h: 335 },
        { x: 875, y: 155, w: 115, h: 415 },
        { x: 990, y: 215, w: 130, h: 355 }
    ];
    for (const b of backBuildings) ctx.fillRect(b.x, b.y, b.w, b.h);

    ctx.fillStyle = '#976f87';
    const midBuildings = [
        { x: 185, y: 285, w: 85, h: 285 },
        { x: 290, y: 225, w: 95, h: 345 },
        { x: 410, y: 310, w: 90, h: 260 },
        { x: 550, y: 270, w: 95, h: 300 },
        { x: 715, y: 250, w: 110, h: 320 },
        { x: 855, y: 290, w: 85, h: 280 },
        { x: 955, y: 240, w: 95, h: 330 }
    ];
    for (const b of midBuildings) ctx.fillRect(b.x, b.y, b.w, b.h);

    ctx.fillStyle = '#a88198';
    for (let y = 260; y < 490; y += 28) {
        ctx.fillRect(305, y, 65, 8);
        ctx.fillRect(730, y + 10, 80, 8);
        ctx.fillRect(970, y, 65, 8);
    }

    ctx.fillStyle = '#6c5368';
    const frontBuildings = [
        { x: 160, y: 435, w: 115, h: 150 },
        { x: 275, y: 465, w: 95, h: 120 },
        { x: 370, y: 405, w: 85, h: 180 },
        { x: 455, y: 455, w: 110, h: 130 },
        { x: 565, y: 425, w: 95, h: 160 },
        { x: 660, y: 470, w: 85, h: 115 },
        { x: 745, y: 395, w: 95, h: 190 },
        { x: 840, y: 445, w: 120, h: 140 },
        { x: 960, y: 415, w: 160, h: 170 }
    ];
    for (const b of frontBuildings) ctx.fillRect(b.x, b.y, b.w, b.h);
}

function drawCenterCurvedObstacle() {
    const startAngle = Math.PI * 0.5 - arena.arcHalfAngle;
    const endAngle = Math.PI * 0.5 + arena.arcHalfAngle;

    ctx.save();
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.arc(arena.arcCx, arena.arcCy, arena.arcRadius, startAngle, endAngle);
    ctx.strokeStyle = '#0d0f12';
    ctx.lineWidth = arena.arcTubeRadius * 2 + 7;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(arena.arcCx, arena.arcCy, arena.arcRadius, startAngle, endAngle);
    ctx.strokeStyle = '#2b2f36';
    ctx.lineWidth = arena.arcTubeRadius * 2 - 7;
    ctx.stroke();

    ctx.restore();
}

function drawCar(car) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    const f = car.facing;
    const halfB = car.wheelBase * 0.5;
    const rearWY = car.wheelYOffset - car.rearComp;
    const frontWY = car.wheelYOffset - car.frontComp;

    ctx.strokeStyle = '#0d0f12';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-halfB * 0.75, 4);
    ctx.lineTo(-halfB, rearWY);
    ctx.moveTo(halfB * 0.75, 4);
    ctx.lineTo(halfB, frontWY);
    ctx.stroke();

    ctx.save();
    ctx.translate(-3 * f, -20);
    if (car.isKnockedOut) ctx.rotate(-0.35 * f);

    ctx.beginPath();
    ctx.arc(0, 0, car.headRadius, 0, Math.PI * 2);
    ctx.fillStyle = car.color;
    ctx.fill();
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#0d0f12';
    ctx.stroke();

    ctx.beginPath();
    if (f === 1) ctx.arc(3, -1, 8.5, -0.55, 0.65);
    else ctx.arc(-3, -1, 8.5, Math.PI - 0.65, Math.PI + 0.55);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0d0f12';
    ctx.stroke();

    if (car.isKnockedOut) {
        ctx.save();
        ctx.translate(-4 * f, -10);
        ctx.rotate(0.25);
        ctx.strokeStyle = '#ff3b30';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-7, -7);
        ctx.lineTo(7, 7);
        ctx.moveTo(7, -7);
        ctx.lineTo(-7, 7);
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();

    ctx.save();
    ctx.scale(f, 1);

    ctx.beginPath();
    ctx.moveTo(-38, -8);
    ctx.lineTo(-42, -18);
    ctx.lineTo(-30, -18);
    ctx.quadraticCurveTo(-18, -6, -4, -6);
    ctx.lineTo(8, -14);
    ctx.lineTo(14, -9);
    ctx.quadraticCurveTo(39, -8, 42, 4);
    ctx.quadraticCurveTo(42, 13, 30, 13);
    ctx.lineTo(-32, 13);
    ctx.quadraticCurveTo(-41, 13, -38, -8);
    ctx.closePath();

    ctx.fillStyle = car.color;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#0d0f12';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-24, 2);
    ctx.lineTo(24, 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();

    const wheelPositions = [
        { x: -halfB, y: rearWY },
        { x: halfB, y: frontWY }
    ];

    for (const wp of wheelPositions) {
        ctx.save();
        ctx.translate(wp.x, wp.y);
        ctx.rotate(car.wheelRot);

        ctx.beginPath();
        ctx.arc(0, 0, car.wheelRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#181a1f';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#0d0f12';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, car.wheelRadius * 0.58, 0, Math.PI * 2);
        ctx.fillStyle = car.color;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-car.wheelRadius * 0.55, 0);
        ctx.lineTo(car.wheelRadius * 0.55, 0);
        ctx.moveTo(0, -car.wheelRadius * 0.55);
        ctx.lineTo(0, car.wheelRadius * 0.55);
        ctx.strokeStyle = '#181a1f';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.restore();
    }

    ctx.restore();
}

function drawStar(x, y, radius, rot, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const innerAngle = outerAngle + Math.PI / 5;
        const ox = Math.cos(outerAngle) * radius;
        const oy = Math.sin(outerAngle) * radius;
        const ix = Math.cos(innerAngle) * (radius * 0.45);
        const iy = Math.sin(innerAngle) * (radius * 0.45);
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
        ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0d0f12';
    ctx.stroke();
    ctx.restore();
}

function drawBottomWater() {
    const baseWaterY = state.waterY;
    const waveAmp = 5.5;
    const waveLen = 78;

    ctx.save();

    ctx.beginPath();
    ctx.moveTo(0, GAME_H);
    for (let x = 0; x <= GAME_W; x += 12) {
        const wy = baseWaterY + Math.sin(x / waveLen + state.waterTime * 4.5) * waveAmp;
        ctx.lineTo(x, wy);
    }
    ctx.lineTo(GAME_W, GAME_H);
    ctx.closePath();
    ctx.fillStyle = 'rgba(19, 120, 212, 0.22)';
    ctx.fill();

    ctx.beginPath();
    for (let x = 0; x <= GAME_W; x += 12) {
        const wy = baseWaterY + Math.sin(x / waveLen + state.waterTime * 4.5) * waveAmp;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
    }
    ctx.strokeStyle = '#0d0f12';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.beginPath();
    for (let x = 0; x <= GAME_W; x += 12) {
        const wy = baseWaterY + 3 + Math.sin(x / waveLen + state.waterTime * 4.5) * waveAmp;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
    }
    ctx.strokeStyle = 'rgba(91, 200, 247, 0.78)';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.restore();
}

function drawControlsAndHUD() {
    for (const btn of controlButtons) {
        const isPressed = inputs[btn.id] || keyState[btn.id];
        const targetScale = isPressed ? 0.92 : 1.0;
        btn.pressScale += (targetScale - btn.pressScale) * 0.4;

        ctx.save();
        ctx.translate(btn.x, btn.y);
        ctx.scale(btn.pressScale, btn.pressScale);

        if (isPressed) {
            ctx.beginPath();
            ctx.arc(0, 0, btn.r + 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(0, 0, btn.r, 0, Math.PI * 2);
        ctx.fillStyle = isPressed ? '#ffffff' : btn.color;
        ctx.fill();
        ctx.lineWidth = 9;
        ctx.strokeStyle = '#0d0f12';
        ctx.stroke();

        if (isPressed) {
            ctx.beginPath();
            ctx.arc(0, 0, btn.r - 6, 0, Math.PI * 2);
            ctx.fillStyle = btn.color;
            ctx.fill();
        }

        ctx.beginPath();
        if (btn.dir === -1) {
            ctx.moveTo(8, -19);
            ctx.lineTo(-11, 0);
            ctx.lineTo(8, 19);
        } else {
            ctx.moveTo(-8, -19);
            ctx.lineTo(11, 0);
            ctx.lineTo(-8, 19);
        }
        ctx.strokeStyle = isPressed ? '#ffffff' : '#181a1f';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        ctx.restore();
    }

    ctx.save();
    const pillW = 148;
    const pillH = 50;
    const pillX = GAME_W / 2 - pillW / 2;
    ctx.beginPath();
    ctx.roundRect(pillX, -12, pillW, pillH + 12, 26);
    ctx.fillStyle = '#f2eef0';
    ctx.fill();

    ctx.font = '800 28px Fredoka, sans-serif';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#e5534b';
    ctx.textAlign = 'right';
    ctx.fillText(String(state.scoreRed), GAME_W / 2 - 14, 24);

    ctx.fillStyle = '#2b2f36';
    ctx.textAlign = 'center';
    ctx.fillText('•', GAME_W / 2, 24);

    ctx.fillStyle = '#20b8f9';
    ctx.textAlign = 'left';
    ctx.fillText(String(state.scoreBlue), GAME_W / 2 + 14, 24);
    ctx.restore();

    ctx.save();
    const endW = 128;
    const endH = 48;
    const endX = GAME_W / 2 - endW / 2;
    const endY = GAME_H - endH + 10;
    ctx.beginPath();
    ctx.roundRect(endX, endY, endW, endH, 24);
    ctx.fillStyle = '#f2eef0';
    ctx.fill();

    ctx.fillStyle = '#2b2f36';
    ctx.font = '800 21px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ENDE', GAME_W / 2, GAME_H - 15);
    ctx.restore();

    drawMiniUtilityButton(uiButtons.rotate, '↻');
    drawMiniUtilityButton(uiButtons.sound, state.soundEnabled ? '🔊' : '🔇');
}

function drawMiniUtilityButton(rect, label) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 12);
    ctx.fillStyle = 'rgba(20, 22, 26, 0.55)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#f2eef0';
    ctx.font = '700 20px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
    ctx.restore();
}

function drawCountdownOverlay() {
    if (state.phase === 'KO_SLOWMO' && state.isDraw) {
        ctx.save();
        ctx.translate(GAME_W / 2, 220);
        ctx.font = '800 56px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#0d0f12';
        ctx.strokeText('UNENTSCHIEDEN', 0, 0);
        ctx.fillStyle = '#f4eae6';
        ctx.fillText('UNENTSCHIEDEN', 0, 0);
        ctx.restore();
        return;
    }

    if (state.phase !== 'COUNTDOWN' || state.countdownValue <= 0) return;

    const pulse = 1 + Math.sin((state.phaseTimer / 0.72) * Math.PI) * 0.08;
    const positions = [
        { x: 380, y: 315 },
        { x: 900, y: 315 }
    ];

    for (const pos of positions) {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(pulse, pulse);
        ctx.font = '800 250px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f4eae6';
        ctx.shadowColor = 'rgba(0,0,0,0.22)';
        ctx.shadowBlur = 12;
        ctx.fillText(String(state.countdownValue), 0, 0);
        ctx.restore();
    }
}

function render() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displayW = rect.width || window.innerWidth;
    const displayH = rect.height || window.innerHeight;

    if (canvas.width !== Math.floor(displayW * dpr) || canvas.height !== Math.floor(displayH * dpr)) {
        canvas.width = Math.floor(displayW * dpr);
        canvas.height = Math.floor(displayH * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#2b2f36';
    ctx.fillRect(0, 0, displayW, displayH);

    const isPortrait = displayH > displayW;
    if (isPortrait) {
        const scale = Math.min(displayW / GAME_H, displayH / GAME_W);
        viewTransform.scale = scale;
        viewTransform.rotation = viewTransform.flip180 ? Math.PI / 2 : -Math.PI / 2;
        viewTransform.offsetX = displayW / 2;
        viewTransform.offsetY = displayH / 2;
    } else {
        const scale = Math.min(displayW / GAME_W, displayH / GAME_H);
        viewTransform.scale = scale;
        viewTransform.rotation = viewTransform.flip180 ? Math.PI : 0;
        viewTransform.offsetX = displayW / 2;
        viewTransform.offsetY = displayH / 2;
    }

    ctx.translate(viewTransform.offsetX, viewTransform.offsetY);
    ctx.rotate(viewTransform.rotation);
    ctx.scale(viewTransform.scale, viewTransform.scale);
    ctx.translate(-GAME_W / 2, -GAME_H / 2);

    ctx.fillStyle = '#2b2f36';
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    ctx.fillStyle = '#23272e';
    for (const st of arena.rockStreaks) {
        ctx.beginPath();
        ctx.roundRect(st.x, st.y, st.w, st.h, st.h / 2);
        ctx.fill();
    }

    ctx.save();
    drawCaveContourPath();
    ctx.clip();

    drawCityBackground();

    for (const p of smokeParticles) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.isWater ? '#5bc8f7' : '#f1f5f9';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = p.isWater ? 'rgba(13, 15, 18, 0.55)' : 'rgba(30, 41, 59, 0.35)';
        ctx.stroke();
        ctx.restore();
    }

    drawCenterCurvedObstacle();
    drawCar(carRed);
    drawCar(carBlue);

    for (const s of starParticles) {
        drawStar(s.x, s.y, s.size, s.rot, s.color);
    }

    ctx.restore();

    ctx.save();
    drawCaveContourPath();
    ctx.strokeStyle = '#0d0f12';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.restore();

    drawCountdownOverlay();
    drawBottomWater();
    drawControlsAndHUD();

    if (state.fadeAlpha > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, state.fadeAlpha)})`;
        ctx.fillRect(-200, -200, GAME_W + 400, GAME_H + 400);
    }

    ctx.restore();
}
