function screenToGameCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    const dx = localX - viewTransform.offsetX;
    const dy = localY - viewTransform.offsetY;
    const cos = Math.cos(-viewTransform.rotation);
    const sin = Math.sin(-viewTransform.rotation);

    const rx = (dx * cos - dy * sin) / viewTransform.scale;
    const ry = (dx * sin + dy * cos) / viewTransform.scale;

    return {
        x: rx + GAME_W / 2,
        y: ry + GAME_H / 2
    };
}

function isInsideRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

function updateTouchButtonStates() {
    inputs.redLeft = false;
    inputs.redRight = false;
    inputs.blueLeft = false;
    inputs.blueRight = false;

    for (const pos of activePointers.values()) {
        let closestBtn = null;
        let minDist = Infinity;

        for (const btn of controlButtons) {
            const dist = Math.hypot(pos.x - btn.x, pos.y - btn.y);
            if (dist <= btn.hitR && dist < minDist) {
                minDist = dist;
                closestBtn = btn;
            }
        }

        if (closestBtn) {
            inputs[closestBtn.id] = true;
        }
    }
}

function checkUIActions(pt) {
    if (isInsideRect(pt.x, pt.y, uiButtons.ende)) {
        resetMatchScores();
        return true;
    }
    if (isInsideRect(pt.x, pt.y, uiButtons.rotate)) {
        viewTransform.flip180 = !viewTransform.flip180;
        return true;
    }
    if (isInsideRect(pt.x, pt.y, uiButtons.sound)) {
        state.soundEnabled = !state.soundEnabled;
        return true;
    }
    return false;
}

function syncTouches(e) {
    e.preventDefault();
    sound.init();

    if (e.type === 'touchstart' && e.changedTouches) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            checkUIActions(screenToGameCoords(t.clientX, t.clientY));
        }
    }

    activePointers.clear();
    for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        activePointers.set('touch_' + t.identifier, screenToGameCoords(t.clientX, t.clientY));
    }
    updateTouchButtonStates();
}

canvas.addEventListener('touchstart', syncTouches, { passive: false });
canvas.addEventListener('touchmove', syncTouches, { passive: false });
canvas.addEventListener('touchend', syncTouches, { passive: false });
canvas.addEventListener('touchcancel', syncTouches, { passive: false });

let isMouseDown = false;
canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    sound.init();
    const pt = screenToGameCoords(e.clientX, e.clientY);
    if (checkUIActions(pt)) return;
    isMouseDown = true;
    activePointers.set('mouse', pt);
    updateTouchButtonStates();
});

window.addEventListener('mousemove', (e) => {
    if (!isMouseDown) return;
    activePointers.set('mouse', screenToGameCoords(e.clientX, e.clientY));
    updateTouchButtonStates();
});

window.addEventListener('mouseup', () => {
    if (!isMouseDown) return;
    isMouseDown = false;
    activePointers.delete('mouse');
    updateTouchButtonStates();
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
    sound.init();
    if (e.key === 'a' || e.key === 'A') keyState.redLeft = true;
    if (e.key === 'd' || e.key === 'D') keyState.redRight = true;
    if (e.key === 'ArrowLeft') keyState.blueLeft = true;
    if (e.key === 'ArrowRight') keyState.blueRight = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'a' || e.key === 'A') keyState.redLeft = false;
    if (e.key === 'd' || e.key === 'D') keyState.redRight = false;
    if (e.key === 'ArrowLeft') keyState.blueLeft = false;
    if (e.key === 'ArrowRight') keyState.blueRight = false;
});
