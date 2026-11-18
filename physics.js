function getWaterWaveY(x) {
    return state.waterY + Math.sin(x / 78 + state.waterTime * 4.5) * 5.5;
}

function applyImpulse(car, jx, jy, rx, ry) {
    car.vx += jx / car.mass;
    car.vy += jy / car.mass;
    const torqueImpulse = rx * jy - ry * jx;
    car.angVel += torqueImpulse / car.inertia;
}

function getCarMoveDir(car) {
    if (state.phase !== 'PLAYING' || car.isKnockedOut) return 0;
    let dir = 0;
    if (car.id === 'RED') {
        if (inputs.redLeft || keyState.redLeft) dir -= 1;
        if (inputs.redRight || keyState.redRight) dir += 1;
    } else {
        if (inputs.blueLeft || keyState.blueLeft) dir -= 1;
        if (inputs.blueRight || keyState.blueRight) dir += 1;
    }
    return dir;
}

function stepPhysics(dt) {
    const substeps = 8;
    const subDt = (dt * state.timeScale) / substeps;

    const GRAVITY = 560;
    const MAX_DRIVE_SPEED = 450;
    const MAX_TOTAL_SPEED = 640;
    const SUSPENSION_TRAVEL = 7.5;
    const SUSPENSION_STIFFNESS = 195;
    const SUSPENSION_DAMPING = 22;
    const DRIVE_ACCEL = 1150;
    const BRAKE_ACCEL = 1550;
    const AIR_TORQUE = 24;

    for (let s = 0; s < substeps; s++) {
        for (const car of cars) {
            const moveDir = getCarMoveDir(car);

            // Schwerkraft & leichter Luftwiderstand
            car.vy += GRAVITY * subDt;
            car.vx *= Math.pow(0.92, subDt);
            car.vy *= Math.pow(0.95, subDt);
            car.angVel *= Math.pow(0.45, subDt);

            const halfB = car.wheelBase * 0.5;
            const wheels = [
                { lx: -halfB, ly: car.wheelYOffset, isRear: true },
                { lx: halfB, ly: car.wheelYOffset, isRear: false }
            ];

            let groundedCount = 0;

            for (const w of wheels) {
                const mountWorld = car.localToWorld(w.lx, w.ly - SUSPENSION_TRAVEL);
                const sdf = getWorldSDF(mountWorld.x, mountWorld.y);
                const maxReach = SUSPENSION_TRAVEL + car.wheelRadius;
                const compression = maxReach - sdf;

                if (compression > 0) {
                    groundedCount++;
                    const n = getWorldNormal(mountWorld.x, mountWorld.y);
                    const clampedComp = Math.min(SUSPENSION_TRAVEL, compression);

                    if (w.isRear) car.rearComp = clampedComp;
                    else car.frontComp = clampedComp;

                    // Harter Anschlag, falls Federweg komplett aufgebraucht ist
                    const overPen = compression - SUSPENSION_TRAVEL;
                    if (overPen > 0) {
                        car.x += n.x * overPen * 0.75;
                        car.y += n.y * overPen * 0.75;
                    }

                    const contactWorld = car.localToWorld(w.lx, w.ly - clampedComp);
                    const rx = contactWorld.x - car.x;
                    const ry = contactWorld.y - car.y;

                    const vpx = car.vx - car.angVel * ry;
                    const vpy = car.vy + car.angVel * rx;
                    const vn = vpx * n.x + vpy * n.y;

                    // Echtes 2D-Feder-Dämpfer-Fahrwerk erzeugt natürliche Auftriebs- und Kippmomente
                    const springForce = clampedComp * SUSPENSION_STIFFNESS;
                    const damperForce = -vn * SUSPENSION_DAMPING;
                    const normalImpulse = Math.max(0, (springForce + damperForce) * subDt);
                    applyImpulse(car, n.x * normalImpulse, n.y * normalImpulse, rx, ry);

                    // Tangentiale Bodenhaftung & Antriebs-Drehmoment über den Hebelarm (rx, ry)
                    const tx = -n.y;
                    const ty = n.x;
                    const vt = (car.vx - car.angVel * ry) * tx + (car.vy + car.angVel * rx) * ty;

                    let tangentImpulse = 0;
                    if (moveDir !== 0) {
                        const isBraking = vt * moveDir < -15;
                        if (isBraking) {
                            const maxBrake = BRAKE_ACCEL * subDt;
                            tangentImpulse = Math.max(-maxBrake, Math.min(maxBrake, -vt * 0.55));
                        } else {
                            const speedFactor = Math.max(0, 1 - Math.abs(vt) / MAX_DRIVE_SPEED);
                            tangentImpulse = moveDir * DRIVE_ACCEL * (0.28 + 0.72 * speedFactor) * subDt;
                        }
                        car.wheelRot += moveDir * 10.5 * subDt;
                    } else {
                        tangentImpulse = -vt * 3.8 * subDt;
                        car.wheelRot += (vt * 0.032) * subDt;
                    }

                    // Traktion begrenzen, damit Räder an steilen Wänden realistisch durchdrehen können
                    const maxTraction = normalImpulse * 1.45 + 16 * subDt;
                    tangentImpulse = Math.max(-maxTraction, Math.min(maxTraction, tangentImpulse));
                    applyImpulse(car, tx * tangentImpulse, ty * tangentImpulse, rx, ry);
                } else {
                    if (w.isRear) car.rearComp *= 0.8;
                    else car.frontComp *= 0.8;
                    if (moveDir !== 0) car.wheelRot += moveDir * 7.5 * subDt;
                }
            }

            car.groundedWheels = groundedCount;

            // In der Luft: Direktes Rotations-Drehmoment für Flips & Landungs-Ausrichtung
            if (groundedCount === 0) {
                if (moveDir !== 0) {
                    car.angVel += -moveDir * AIR_TORQUE * subDt;
                } else {
                    car.angVel *= Math.pow(0.08, subDt);
                }
            }

            const curSpeed = Math.hypot(car.vx, car.vy);
            if (curSpeed > MAX_TOTAL_SPEED) {
                car.vx = (car.vx / curSpeed) * MAX_TOTAL_SPEED;
                car.vy = (car.vy / curSpeed) * MAX_TOTAL_SPEED;
            }
            car.angVel = Math.max(-7.5, Math.min(7.5, car.angVel));

            car.x += car.vx * subDt;
            car.y += car.vy * subDt;
            car.angle += car.angVel * subDt;

            // Karosserie-Kollision mit der Arena-Wand (echter Starrkörper-Impuls mit Rotation)
            const bodyCircles = car.getBodyCirclesWorld();
            for (const bc of bodyCircles) {
                const sdf = getWorldSDF(bc.x, bc.y);
                const dist = sdf - bc.r;
                if (dist < 0) {
                    const n = getWorldNormal(bc.x, bc.y);
                    const pen = -dist;
                    car.x += n.x * pen * 0.85;
                    car.y += n.y * pen * 0.85;

                    const rx = bc.x - car.x;
                    const ry = bc.y - car.y;
                    const vpx = car.vx - car.angVel * ry;
                    const vpy = car.vy + car.angVel * rx;
                    const vn = vpx * n.x + vpy * n.y;

                    if (vn < 0) {
                        const crossN = rx * n.y - ry * n.x;
                        const effMass = 1 / car.mass + (crossN * crossN) / car.inertia;
                        const restitution = 0.22;
                        const j = (-(1 + restitution) * vn) / effMass;
                        applyImpulse(car, n.x * j, n.y * j, rx, ry);

                        // Reibung am Chassis beim Rutschen an der Wand
                        const tx = -n.y;
                        const ty = n.x;
                        const vt = vpx * tx + vpy * ty;
                        const jt = Math.max(-j * 0.35, Math.min(j * 0.35, -vt * 0.25));
                        applyImpulse(car, tx * jt, ty * jt, rx, ry);
                    }
                }
            }
        }

        resolveCarToCarCollisions();

        if (state.phase === 'PLAYING') {
            checkHeadWallHits();
        }
    }

    // Auspuff-Rauch beim Gasgeben
    for (const car of cars) {
        if (getCarMoveDir(car) !== 0) {
            car.smokeTimer -= dt;
            if (car.smokeTimer <= 0) {
                car.smokeTimer = 0.042;
                const exhaustLocalX = -38 * car.facing;
                const exhaustPos = car.localToWorld(exhaustLocalX, 4);
                const backDir = car.localToWorld(exhaustLocalX - 18 * car.facing, 2);
                spawnExhaustSmoke(
                    exhaustPos.x,
                    exhaustPos.y,
                    (backDir.x - exhaustPos.x) * 6,
                    (backDir.y - exhaustPos.y) * 6
                );
            }
        }
    }
}

function resolveCarToCarCollisions() {
    const shapesRed = [...carRed.getWheelsWorld(), ...carRed.getBodyCirclesWorld()];
    const shapesBlue = [...carBlue.getWheelsWorld(), ...carBlue.getBodyCirclesWorld()];

    if (state.phase === 'PLAYING') {
        const headRed = carRed.getHeadWorld();
        const headBlue = carBlue.getHeadWorld();

        if (Math.hypot(headRed.x - headBlue.x, headRed.y - headBlue.y) < headRed.r + headBlue.r + 4) {
            triggerKnockout(true, true);
            return;
        }

        let redHit = false;
        let blueHit = false;

        for (const sb of shapesBlue) {
            if (Math.hypot(headRed.x - sb.x, headRed.y - sb.y) < headRed.r + sb.r - 2) {
                redHit = true;
                break;
            }
        }
        for (const sa of shapesRed) {
            if (Math.hypot(headBlue.x - sa.x, headBlue.y - sa.y) < headBlue.r + sa.r - 2) {
                blueHit = true;
                break;
            }
        }

        if (redHit || blueHit) {
            triggerKnockout(redHit, blueHit);
            return;
        }
    }

    // Echte 2D-Starrkörper-Kollision inkl. Hebelarm-Drehmoment (aushebeln & aufbäumen möglich!)
    for (const cA of shapesRed) {
        for (const cB of shapesBlue) {
            const dx = cB.x - cA.x;
            const dy = cB.y - cA.y;
            const dist = Math.hypot(dx, dy);
            const minDist = cA.r + cB.r;

            if (dist > 0.001 && dist < minDist) {
                const nx = dx / dist;
                const ny = dy / dist;
                const overlap = (minDist - dist) * 0.5;

                carRed.x -= nx * overlap;
                carRed.y -= ny * overlap;
                carBlue.x += nx * overlap;
                carBlue.y += ny * overlap;

                const contactX = cA.x + nx * cA.r;
                const contactY = cA.y + ny * cA.r;

                const rAx = contactX - carRed.x;
                const rAy = contactY - carRed.y;
                const rBx = contactX - carBlue.x;
                const rBy = contactY - carBlue.y;

                const vAx = carRed.vx - carRed.angVel * rAy;
                const vAy = carRed.vy + carRed.angVel * rAx;
                const vBx = carBlue.vx - carBlue.angVel * rBy;
                const vBy = carBlue.vy + carBlue.angVel * rBx;

                const rvx = vBx - vAx;
                const rvy = vBy - vAy;
                const velAlongNormal = rvx * nx + rvy * ny;

                if (velAlongNormal < 0) {
                    const crossA = rAx * ny - rAy * nx;
                    const crossB = rBx * ny - rBy * nx;
                    const invMassSum =
                        1 / carRed.mass +
                        1 / carBlue.mass +
                        (crossA * crossA) / carRed.inertia +
                        (crossB * crossB) / carBlue.inertia;

                    const restitution = 0.42;
                    const j = (-(1 + restitution) * velAlongNormal) / invMassSum;

                    applyImpulse(carRed, -nx * j, -ny * j, rAx, rAy);
                    applyImpulse(carBlue, nx * j, ny * j, rBx, rBy);

                    // Tangentiale Reibung zwischen den Fahrzeugen (Reifen klettern übereinander)
                    const tx = -ny;
                    const ty = nx;
                    const vt = rvx * tx + rvy * ty;
                    const jt = Math.max(-j * 0.45, Math.min(j * 0.45, -vt * 0.25));
                    applyImpulse(carRed, -tx * jt, -ty * jt, rAx, rAy);
                    applyImpulse(carBlue, tx * jt, ty * jt, rBx, rBy);

                    if (Math.abs(velAlongNormal) > 95) {
                        sound.playBump(Math.abs(velAlongNormal) / 150);
                    }
                }
            }
        }
    }
}

function checkHeadWallHits() {
    const headRed = carRed.getHeadWorld();
    const headBlue = carBlue.getHeadWorld();

    const redHitWall = getWorldSDF(headRed.x, headRed.y) < headRed.r - 3;
    const blueHitWall = getWorldSDF(headBlue.x, headBlue.y) < headBlue.r - 3;

    const redUnderWater = headRed.y >= getWaterWaveY(headRed.x) + 3;
    const blueUnderWater = headBlue.y >= getWaterWaveY(headBlue.x) + 3;

    if (redUnderWater) spawnWaterSplash(headRed.x, state.waterY);
    if (blueUnderWater) spawnWaterSplash(headBlue.x, state.waterY);

    if (redHitWall || redUnderWater || blueHitWall || blueUnderWater) {
        triggerKnockout(redHitWall || redUnderWater, blueHitWall || blueUnderWater);
    }
}
