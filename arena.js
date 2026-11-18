const arena = {
    leftCenterX: 410,
    rightCenterX: 870,
    centerY: 315,
    baseRadius: 235,
    arcCx: 640,
    arcCy: -70,
    arcRadius: 385,
    arcHalfAngle: 0.49,
    arcTubeRadius: 24,
    contourPoints: [],
    rockStreaks: []
};

function initArenaVisuals() {
    arena.contourPoints = [];
    const steps = 260;
    for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        let low = 100;
        let high = 560;
        for (let iter = 0; iter < 14; iter++) {
            const mid = (low + high) * 0.5;
            const px = 640 + dirX * mid;
            const py = 315 + dirY * mid;
            if (getCaveInteriorSDF(px, py) > 0) low = mid;
            else high = mid;
        }
        const r = (low + high) * 0.5;
        arena.contourPoints.push({
            x: 640 + dirX * r,
            y: 315 + dirY * r
        });
    }

    arena.rockStreaks = [
        { x: 90, y: 120, w: 95, h: 22 },
        { x: 55, y: 280, w: 68, h: 20 },
        { x: 85, y: 450, w: 105, h: 22 },
        { x: 145, y: 585, w: 85, h: 20 },
        { x: 1080, y: 110, w: 110, h: 22 },
        { x: 1140, y: 265, w: 82, h: 20 },
        { x: 1095, y: 465, w: 95, h: 22 },
        { x: 1115, y: 590, w: 90, h: 20 },
        { x: 520, y: 615, w: 80, h: 18 },
        { x: 690, y: 635, w: 95, h: 18 },
        { x: 260, y: 55, w: 90, h: 20 },
        { x: 910, y: 52, w: 85, h: 20 }
    ];
}

function getCaveInteriorSDF(x, y) {
    const clampedX = Math.max(arena.leftCenterX, Math.min(arena.rightCenterX, x));
    let centerYOffset = 0;
    if (y > arena.centerY) {
        const normX = (x - 640) / 260;
        const wave = Math.cos(normX * Math.PI * 1.15) * 14 * Math.exp(-normX * normX * 0.45);
        const flattenFloor = Math.max(0, (y - (arena.centerY + 120)) * 0.12);
        centerYOffset = -wave + flattenFloor;
    }
    const dx = x - clampedX;
    const dy = (y + centerYOffset) - arena.centerY;
    return arena.baseRadius - Math.hypot(dx, dy);
}

function getCenterObstacleSDF(x, y) {
    const dx = x - arena.arcCx;
    const dy = y - arena.arcCy;
    const angle = Math.atan2(dy, dx);
    const deltaAngle = angle - Math.PI * 0.5;
    const clampedDelta = Math.max(-arena.arcHalfAngle, Math.min(arena.arcHalfAngle, deltaAngle));
    const targetAngle = Math.PI * 0.5 + clampedDelta;
    const nearX = arena.arcCx + Math.cos(targetAngle) * arena.arcRadius;
    const nearY = arena.arcCy + Math.sin(targetAngle) * arena.arcRadius;
    return Math.hypot(x - nearX, y - nearY) - arena.arcTubeRadius;
}

function getWorldSDF(x, y) {
    return Math.min(getCaveInteriorSDF(x, y), getCenterObstacleSDF(x, y));
}

function getWorldNormal(x, y) {
    const eps = 1.5;
    const dx = getWorldSDF(x + eps, y) - getWorldSDF(x - eps, y);
    const dy = getWorldSDF(x, y + eps) - getWorldSDF(x, y - eps);
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
}
