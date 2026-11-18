// Zentrale Tuning-Parameter für die Arcade-Fahrphysik
const PHYSICS = {
    gravity: 660,
    maxDriveSpeed: 580,
    maxTotalSpeed: 780,
    driveAccel: 2350,        // Knackiger Antritt nach vorne
    brakeAccel: 2800,        // Direktes Abbremsen & Richtungswechsel
    wheelieTorque: 19500,    // Schnelles, knackiges Aufsteigen beim Gasgeben
    wheelieMaxAngle: 0.56,   // ~32° natürlicher Wheelie-Winkel auf der Geraden
    suspensionTravel: 6.5,
    springStiffness: 360,    // Straffes Fahrwerk ohne Nachwippen
    springDamping: 44,       // Kritische Dämpfung für saubere Landungen
    tireGrip: 2.1,
    curveRadius: 235,        // Arena-Kurvenradius für echte Zentripetalkraft (v² / R)
    airSpinAccel: 13.5,      // Kontrollierte Drehbeschleunigung in der Luft
    airMaxSpin: 3.3,         // Angenehme maximale Drehgeschwindigkeit in der Luft
    airSpinDamping: 0.03,    // Schnelles Abstoppen der Drehung beim Loslassen
    chassisBounce: 0.14,
    carRestitution: 0.18,    // Kein Flummi-Abprall -> Autos schieben & hebeln sich aus
    carClimbGrip: 0.72       // Reifen-Traktion auf dem Gegner zum Hochklettern & Überfahren
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

function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
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
            car.vx *= Math.pow(0.92, subDt);
            car.vy *= Math.pow(0.96, subDt);

            let groundedWheels = 0;
            let avgNy = 0;
            let avgNx = 0;

            for (const ws of wheelSpecs) {
                const mount = car.localToWorld(ws.lx, car.wheelYOffset - PHYSICS.suspensionTravel);
                const compression = (PHYSICS.suspensionTravel + car.wheelRadius) - getWorldSDF(mount.x, mount.y);

                if (compression > 0) {
                    groundedWheels++;
                    const n = getWorldNormal(mount.x, mount.y);
                    avgNx += n.x;
                    avgNy += n.y;

                    const comp = Math.min(PHYSICS.suspensionTravel, compression);
                    if (ws.isRear) car.rearComp = comp; else car.frontComp = comp;

                    const overPen = compression - PHYSICS.suspensionTravel;
                    if (overPen > 0) {
                        car.x += n.x * overPen * 0.85;
                        car.y += n.y * overPen * 0.85;
                    }

                    const contact = car.localToWorld(ws.lx, car.wheelYOffset - comp);
                    const rx = contact.x - car.x, ry = contact.y - car.y;
                    const vpx = car.vx - car.angVel * ry, vpy = car.vy + car.angVel * rx;
                    const vn = vpx * n.x + vpy * n.y;
                    const tx = -n.y, ty = n.x;
                    const vt = vpx * tx + vpy * ty;

                    // 1. Straffes Feder-Dämpfer-Fahrwerk + physikalische Zentripetalkraft (v² / R) in Wandkurven
                    const curveFactor = Math.max(0, 1 - Math.abs(n.y));
                    const centripetalForce = curveFactor * ((vt * vt) / PHYSICS.curveRadius) * car.mass;
                    const normalForce = comp * PHYSICS.springStiffness + centripetalForce - vn * PHYSICS.springDamping;
                    const normalImp = Math.max(0, normalForce * subDt);
                    applyImpulse(car, n.x * normalImp, n.y * normalImp, rx, ry);

                    // 2. Knackiger Rad-Antrieb & Bremsen
                    let desiredJt = 0;
                    if (moveDir !== 0) {
                        if (vt * moveDir < -18) {
                            const maxBrake = PHYSICS.brakeAccel * subDt;
                            desiredJt = Math.max(-maxBrake, Math.min(maxBrake, -vt * 0.75));
                        } else {
                            const accelCurve = Math.max(0.18, 1 - Math.abs(vt) / PHYSICS.maxDriveSpeed);
                            desiredJt = moveDir * PHYSICS.driveAccel * accelCurve * subDt;
                        }
                        car.wheelRot += moveDir * 14.0 * subDt;
                    } else {
                        desiredJt = -vt * 4.5 * subDt;
                        car.wheelRot += vt * 0.032 * subDt;
                    }

                    const maxTraction = normalImp * PHYSICS.tireGrip + 34 * subDt;
                    const jt = Math.max(-maxTraction, Math.min(maxTraction, desiredJt));
                    applyImpulse(car, tx * jt, ty * jt, rx, ry);
                } else {
                    if (ws.isRear) car.rearComp *= 0.72; else car.frontComp *= 0.72;
                    if (moveDir !== 0) car.wheelRot += moveDir * 9.0 * subDt;
                }
            }

            if (groundedWheels > 0) {
                car.angVel *= Math.pow(0.18, subDt);

                // Schnelles, knackiges Wheelie-Drehmoment beim Gasgeben auf dem Boden (bis zum natürlichen Kipppunkt)
                const nLen = Math.hypot(avgNx, avgNy) || 1;
                const nx = avgNx / nLen, ny = avgNy / nLen;
                const surfaceAngle = Math.atan2(nx, -ny);
                const relAngle = normalizeAngle(car.angle - surfaceAngle);
                const floorFlatness = Math.max(0, -ny);

                if (moveDir !== 0 && floorFlatness > 0.65) {
                    const targetTilt = -moveDir * PHYSICS.wheelieMaxAngle * floorFlatness;
                    const tiltRoom = (targetTilt - relAngle) * (-moveDir);
                    if (tiltRoom > 0) {
                        const boost = Math.min(1, tiltRoom / 0.25);
                        car.angVel += (-moveDir * PHYSICS.wheelieTorque * boost * subDt) / car.inertia;
                    }
                }
            } else {
                // 3. Kontrollierte, nicht zu schnelle Luft-Drehung
                if (moveDir !== 0) {
                    car.angVel += -moveDir * PHYSICS.airSpinAccel * subDt;
                    car.angVel = Math.max(-PHYSICS.airMaxSpin, Math.min(PHYSICS.airMaxSpin, car.angVel));
                } else {
                    car.angVel *= Math.pow(PHYSICS.airSpinDamping, subDt);
                }
            }

            const speed = Math.hypot(car.vx, car.vy);
            if (speed > PHYSICS.maxTotalSpeed) {
                car.vx = (car.vx / speed) * PHYSICS.maxTotalSpeed;
                car.vy = (car.vy / speed) * PHYSICS.maxTotalSpeed;
            }
            car.angVel = Math.max(-6.5, Math.min(6.5, car.angVel));
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
                        const jt = Math.max(-j * 0.3, Math.min(j * 0.3, -vt * 0.25));
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
                const wheelDriveDiff = ((cA.isWheel ? dirRed : 0) - (cB.isWheel ? dirBlue : 0)) * 220;
                const vt = (rvx * tx + rvy * ty) - wheelDriveDiff;
                const maxJt = j * PHYSICS.carClimbGrip + 16;
                const jt = Math.max(-maxJt, Math.min(maxJt, -vt * 0.42));
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
