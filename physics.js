// Zentrale Tuning-Parameter für die Arcade-Fahrphysik
const PHYSICS = {
    gravity: 640,
    maxDriveSpeed: 540,
    maxTotalSpeed: 740,
    driveAccel: 1750,
    brakeAccel: 2200,
    suspensionTravel: 8.5,
    springStiffness: 235,
    springDamping: 26,
    tireGrip: 1.75,          // Reibungs-Koeffizient der Reifen (Wheelies & Wandfahrten)
    wallDownforce: 0.55,     // Schwung-Anpressdruck in Kurven & Steilwänden
    airTorque: 34,           // Dreh-Impuls in der Luft für saubere Flips
    airSpinDamping: 0.04,    // Dämpfung beim Loslassen in der Luft
    chassisBounce: 0.18,
    carRestitution: 0.26,    // Geringer Abprall -> Autos schieben & klettern übereinander
    carClimbGrip: 0.55       // Reifen-Traktion auf dem Gegner zum Aushebeln/Überfahren
};

function getWaterWaveY(x) {
    return state.waterY + Math.sin(x / 78 + state.waterTime * 4.5) * 5.5;
}

function applyImpulse(car, jx, jy, rx, ry) {
    car.vx += jx / car.mass;
    car.vy += jy / car.mass;
    car.angVel += (rx * jy - ry * jx) / car.inertia;
}

function getMoveDir(car) {
    if (state.phase !== 'PLAYING' || car.isKnockedOut) return 0;
    const left = car.id === 'RED' ? (inputs.redLeft || keyState.redLeft) : (inputs.blueLeft || keyState.blueLeft);
    const right = car.id === 'RED' ? (inputs.redRight || keyState.redRight) : (inputs.blueRight || keyState.blueRight);
    return (right ? 1 : 0) - (left ? 1 : 0);
}

function stepPhysics(dt) {
    const substeps = 8;
    const subDt = (dt * state.timeScale) / substeps;
    const halfB = carRed.wheelBase * 0.5;
    const wheelSpecs = [{ lx: -halfB, isRear: true }, { lx: halfB, isRear: false }];

    for (let s = 0; s < substeps; s++) {
        for (const car of cars) {
            const moveDir = getMoveDir(car);
            car.vy += PHYSICS.gravity * subDt;
            car.vx *= Math.pow(0.90, subDt);
            car.vy *= Math.pow(0.95, subDt);
            car.angVel *= Math.pow(0.32, subDt);

            let groundedWheels = 0;
            for (const ws of wheelSpecs) {
                const mount = car.localToWorld(ws.lx, car.wheelYOffset - PHYSICS.suspensionTravel);
                const compression = (PHYSICS.suspensionTravel + car.wheelRadius) - getWorldSDF(mount.x, mount.y);

                if (compression > 0) {
                    groundedWheels++;
                    const n = getWorldNormal(mount.x, mount.y);
                    const comp = Math.min(PHYSICS.suspensionTravel, compression);
                    if (ws.isRear) car.rearComp = comp; else car.frontComp = comp;

                    const overPen = compression - PHYSICS.suspensionTravel;
                    if (overPen > 0) {
                        car.x += n.x * overPen * 0.8;
                        car.y += n.y * overPen * 0.8;
                    }

                    const contact = car.localToWorld(ws.lx, car.wheelYOffset - comp);
                    const rx = contact.x - car.x, ry = contact.y - car.y;
                    const vpx = car.vx - car.angVel * ry, vpy = car.vy + car.angVel * rx;
                    const vn = vpx * n.x + vpy * n.y;
                    const tx = -n.y, ty = n.x;
                    const vt = vpx * tx + vpy * ty;

                    // 1. Feder-Dämpfer-Normalkraft + geschwindigkeitsabhängiger Kurven-Anpressdruck
                    const wallLoad = Math.max(0, 1 - Math.abs(n.y)) * Math.abs(vt) * PHYSICS.wallDownforce;
                    const normalImp = Math.max(0, (comp * PHYSICS.springStiffness + wallLoad - vn * PHYSICS.springDamping) * subDt);
                    applyImpulse(car, n.x * normalImp, n.y * normalImp, rx, ry);

                    // 2. Tangentialer Antrieb / Bremsen -> erzeugt über Hebelarm (rx, ry) natürliche Wheelies!
                    let desiredJt = 0;
                    if (moveDir !== 0) {
                        if (vt * moveDir < -20) {
                            const maxBrake = PHYSICS.brakeAccel * subDt;
                            desiredJt = Math.max(-maxBrake, Math.min(maxBrake, -vt * 0.65));
                        } else {
                            const torqueCurve = Math.max(0.15, 1 - Math.abs(vt) / PHYSICS.maxDriveSpeed);
                            desiredJt = moveDir * PHYSICS.driveAccel * torqueCurve * subDt;
                        }
                        car.wheelRot += moveDir * 12.5 * subDt;
                    } else {
                        desiredJt = -vt * 4.2 * subDt;
                        car.wheelRot += vt * 0.032 * subDt;
                    }

                    const maxTraction = normalImp * PHYSICS.tireGrip + 22 * subDt;
                    const jt = Math.max(-maxTraction, Math.min(maxTraction, desiredJt));
                    applyImpulse(car, tx * jt, ty * jt, rx, ry);
                } else {
                    if (ws.isRear) car.rearComp *= 0.78; else car.frontComp *= 0.78;
                    if (moveDir !== 0) car.wheelRot += moveDir * 8.5 * subDt;
                }
            }

            // 3. Luft-Steuerung: Knackige Rotation zum Ausrichten & Flippen
            if (groundedWheels === 0) {
                if (moveDir !== 0) car.angVel += -moveDir * PHYSICS.airTorque * subDt;
                else car.angVel *= Math.pow(PHYSICS.airSpinDamping, subDt);
            }

            const speed = Math.hypot(car.vx, car.vy);
            if (speed > PHYSICS.maxTotalSpeed) {
                car.vx = (car.vx / speed) * PHYSICS.maxTotalSpeed;
                car.vy = (car.vy / speed) * PHYSICS.maxTotalSpeed;
            }
            car.angVel = Math.max(-8.0, Math.min(8.0, car.angVel));
            car.x += car.vx * subDt;
            car.y += car.vy * subDt;
            car.angle += car.angVel * subDt;

            // 4. Karosserie-Wandkollision als echter Starrkörper-Impuls
            for (const bc of car.getBodyCirclesWorld()) {
                const dist = getWorldSDF(bc.x, bc.y) - bc.r;
                if (dist < 0) {
                    const n = getWorldNormal(bc.x, bc.y);
                    car.x += n.x * (-dist) * 0.85;
                    car.y += n.y * (-dist) * 0.85;

                    const rx = bc.x - car.x, ry = bc.y - car.y;
                    const vpx = car.vx - car.angVel * ry, vpy = car.vy + car.angVel * rx;
                    const vn = vpx * n.x + vpy * n.y;
                    if (vn < 0) {
                        const crossN = rx * n.y - ry * n.x;
                        const effMass = 1 / car.mass + (crossN * crossN) / car.inertia;
                        const j = (-(1 + PHYSICS.chassisBounce) * vn) / effMass;
                        applyImpulse(car, n.x * j, n.y * j, rx, ry);

                        const tx = -n.y, ty = n.x;
                        const vt = vpx * tx + vpy * ty;
                        const jt = Math.max(-j * 0.35, Math.min(j * 0.35, -vt * 0.25));
                        applyImpulse(car, tx * jt, ty * jt, rx, ry);
                    }
                }
            }
        }

        resolveCarToCarCollisions();
        if (state.phase === 'PLAYING') checkHeadHits();
    }

    for (const car of cars) {
        if (getMoveDir(car) !== 0 && (car.smokeTimer -= dt) <= 0) {
            car.smokeTimer = 0.04;
            const ex = car.localToWorld(-38 * car.facing, 4);
            const dir = car.localToWorld(-56 * car.facing, 2);
            spawnExhaustSmoke(ex.x, ex.y, (dir.x - ex.x) * 6, (dir.y - ex.y) * 6);
        }
    }
}

function resolveCarToCarCollisions() {
    const shapesRed = [...carRed.getWheelsWorld(), ...carRed.getBodyCirclesWorld()];
    const shapesBlue = [...carBlue.getWheelsWorld(), ...carBlue.getBodyCirclesWorld()];

    if (state.phase === 'PLAYING') {
        const hR = carRed.getHeadWorld(), hB = carBlue.getHeadWorld();
        if (Math.hypot(hR.x - hB.x, hR.y - hB.y) < hR.r + hB.r + 4) return triggerKnockout(true, true);
        const redHit = shapesBlue.some(s => Math.hypot(hR.x - s.x, hR.y - s.y) < hR.r + s.r - 2);
        const blueHit = shapesRed.some(s => Math.hypot(hB.x - s.x, hB.y - s.y) < hB.r + s.r - 2);
        if (redHit || blueHit) return triggerKnockout(redHit, blueHit);
    }

    const dirRed = getMoveDir(carRed), dirBlue = getMoveDir(carBlue);
    for (const cA of shapesRed) {
        for (const cB of shapesBlue) {
            const dx = cB.x - cA.x, dy = cB.y - cA.y;
            const dist = Math.hypot(dx, dy), minDist = cA.r + cB.r;
            if (dist <= 0.001 || dist >= minDist) continue;

            const nx = dx / dist, ny = dy / dist;
            const overlap = (minDist - dist) * 0.5;
            carRed.x -= nx * overlap; carRed.y -= ny * overlap;
            carBlue.x += nx * overlap; carBlue.y += ny * overlap;

            const cx = cA.x + nx * cA.r, cy = cA.y + ny * cA.r;
            const rAx = cx - carRed.x, rAy = cy - carRed.y;
            const rBx = cx - carBlue.x, rBy = cy - carBlue.y;
            const vAx = carRed.vx - carRed.angVel * rAy, vAy = carRed.vy + carRed.angVel * rAx;
            const vBx = carBlue.vx - carBlue.angVel * rBy, vBy = carBlue.vy + carBlue.angVel * rBx;
            const rvx = vBx - vAx, rvy = vBy - vAy;
            const vn = rvx * nx + rvy * ny;

            if (vn < 0) {
                const crossA = rAx * ny - rAy * nx, crossB = rBx * ny - rBy * nx;
                const invMass = 1 / carRed.mass + 1 / carBlue.mass + (crossA * crossA) / carRed.inertia + (crossB * crossB) / carBlue.inertia;
                const j = (-(1 + PHYSICS.carRestitution) * vn) / invMass;
                applyImpulse(carRed, -nx * j, -ny * j, rAx, rAy);
                applyImpulse(carBlue, nx * j, ny * j, rBx, rBy);

                // Tangentialer Reifengrip beim Aufeinanderfahren -> hebt den Gegner aus & lässt Räder hochklettern
                const tx = -ny, ty = nx;
                const wheelDriveDiff = ((cA.isWheel ? dirRed : 0) - (cB.isWheel ? dirBlue : 0)) * 180;
                const vt = (rvx * tx + rvy * ty) - wheelDriveDiff;
                const maxJt = j * PHYSICS.carClimbGrip + 12;
                const jt = Math.max(-maxJt, Math.min(maxJt, -vt * 0.35));
                applyImpulse(carRed, -tx * jt, -ty * jt, rAx, rAy);
                applyImpulse(carBlue, tx * jt, ty * jt, rBx, rBy);

                if (Math.abs(vn) > 105) sound.playBump(Math.abs(vn) / 150);
            }
        }
    }
}

function checkHeadHits() {
    const hR = carRed.getHeadWorld(), hB = carBlue.getHeadWorld();
    const redWet = hR.y >= getWaterWaveY(hR.x) + 3;
    const blueWet = hB.y >= getWaterWaveY(hB.x) + 3;
    if (redWet) spawnWaterSplash(hR.x, state.waterY);
    if (blueWet) spawnWaterSplash(hB.x, state.waterY);

    const redLost = getWorldSDF(hR.x, hR.y) < hR.r - 3 || redWet;
    const blueLost = getWorldSDF(hB.x, hB.y) < hB.r - 3 || blueWet;
    if (redLost || blueLost) triggerKnockout(redLost, blueLost);
}
