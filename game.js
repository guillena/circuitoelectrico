'use strict';

/* ════════════════════════════════════════════════════════
   CIRCUITO ELÉCTRICO — GAME LOGIC
   Touch + Mouse unified drag & drop — Level 1 & 2
════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────
   LEVEL CONFIGURATIONS
   correctPiece: the piece type that must go in this slot
   rotation:     CSS degrees applied to the piece image when placed
────────────────────────────────────────────────────── */
const LEVELS = {
  1: {
    circuitImage:  'images/serial_circuit.png',
    circuitAlt:    'Diagrama del circuito en serie',
    subtitle:      'Nivel 1 — Circuito en Serie',
    slotGroupId:   'level1-slots',
    slots: {
      // corner.png base image = top-right corner (no rotation needed there)
      'slot-corner-tl':     { correctPiece: 'corner',  rotation: -90 },  // 90° izquierda
      'slot-top-right':     { correctPiece: 'lamp',    rotation:   0 },
      'slot-corner-tr':     { correctPiece: 'corner',  rotation:   0 },  // base, sin rotar
      'slot-mid-right':     { correctPiece: 'line',    rotation:  90 },
      'slot-corner-br':     { correctPiece: 'corner',  rotation:  90 },  // 90° derecha
      'slot-bottom-center': { correctPiece: 'battery', rotation:   0 },
      'slot-corner-bl':     { correctPiece: 'corner',  rotation: 180 },  // 180°
      'slot-mid-left':      { correctPiece: 'switch',  rotation:   0 },
    },
    bank: {
      lamp:    { file: 'lamp.png',    totalCount: 1, label: 'Lámpara'  },
      corner:  { file: 'corner.png',  totalCount: 4, label: 'Esquina'  },
      switch:  { file: 'switch.png',  totalCount: 1, label: 'Switch'   },
      battery: { file: 'battery.png', totalCount: 1, label: 'Batería'  },
      line:    { file: 'line.png',    totalCount: 1, label: 'Línea'    },
    },
    success: {
      title: 'Circuito en Servicio',
      msg:   'Construiste un circuito en serie.<br>La corriente dispone de un único recorrido.',
      btn:   'Siguiente desafío',
    },
  },
  2: {
    circuitImage:  'images/parallel_circuit.png',
    circuitAlt:    'Diagrama del circuito en paralelo',
    subtitle:      'Nivel 2 — Circuito en Paralelo',
    slotGroupId:   'level2-slots',
    slots: {
      // Same corner orientation rules as level 1
      'p-slot-corner-tl':     { correctPiece: 'corner',  rotation: -90 },  // 90° izquierda
      'p-slot-pline-left':    { correctPiece: 'pline',   rotation:   0 },
      'p-slot-pline-right':   { correctPiece: 'pline',   rotation:   0 },
      'p-slot-corner-tr':     { correctPiece: 'corner',  rotation:   0 },  // base, sin rotar
      'p-slot-mid-left':      { correctPiece: 'switch',  rotation:   0 },
      'p-slot-corner-mr-top': { correctPiece: 'corner',  rotation:  90 },  // 90° derecha
      'p-slot-lamp-center':   { correctPiece: 'lamp',    rotation:   0 },
      'p-slot-corner-mr-bot': { correctPiece: 'corner',  rotation: 180 },  // 180°
      'p-slot-corner-bl':     { correctPiece: 'corner',  rotation: 180 },  // 180°
      'p-slot-battery':       { correctPiece: 'battery', rotation:   0 },
      'p-slot-corner-br':     { correctPiece: 'corner',  rotation:  90 },  // 90° derecha
    },
    bank: {
      lamp:    { file: 'lamp.png',          totalCount: 1, label: 'Lámpara'   },
      corner:  { file: 'corner.png',        totalCount: 4, label: 'Esquina'   },
      switch:  { file: 'switch.png',        totalCount: 1, label: 'Switch'    },
      battery: { file: 'battery.png',       totalCount: 1, label: 'Batería'   },
      pline:   { file: 'line-parallel.png', totalCount: 2, label: 'Paralela'  },
    },
    success: {
      title: 'Circuito en Servicio',
      msg:   '¡Excelente! Construiste un circuito en paralelo.<br>La corriente tiene múltiples recorridos.',
      btn:   '¡Felicitaciones!',
    },
  },
};

/* ──────────────────────────────────────────────────────
   GAME STATE
────────────────────────────────────────────────────── */
let currentLevel = 1;
let levelConfig  = LEVELS[1];

let state = {
  slots:   {},  // slotId → { occupiedBy: string|null, isCorrect: bool|null }
  bank:    {},  // pieceType → remaining count
  history: [],  // undo stack: [{ pieceType, fromSlotId, toSlotId }]
  phase:   'IDLE',
};

/* ──────────────────────────────────────────────────────
   DRAG STATE
────────────────────────────────────────────────────── */
let drag = {
  active:          false,
  pieceType:       null,
  fromSlotId:      null,
  highlightedSlot: null,
};

/* ════════════════════════════════════════════════════════
   INITIALISATION
════════════════════════════════════════════════════════ */
function initGame(level) {
  currentLevel = level;
  levelConfig  = LEVELS[level];

  // Build fresh state from level config
  state.slots = {};
  Object.keys(levelConfig.slots).forEach(id => {
    state.slots[id] = { occupiedBy: null, isCorrect: null };
  });

  state.bank = {};
  Object.keys(levelConfig.bank).forEach(type => {
    state.bank[type] = levelConfig.bank[type].totalCount;
  });

  state.history = [];
  state.phase   = 'IDLE';

  updateLevelUI(level);
  renderAll();
}

/* ════════════════════════════════════════════════════════
   LEVEL UI SWITCH
════════════════════════════════════════════════════════ */
function updateLevelUI(level) {
  const cfg = LEVELS[level];

  // Swap circuit image
  const bg = document.getElementById('circuit-bg');
  bg.src = cfg.circuitImage;
  bg.alt = cfg.circuitAlt;

  // Swap subtitle
  document.getElementById('header-subtitle').textContent = cfg.subtitle;

  // Swap slot groups
  document.getElementById('level1-slots').classList.toggle('hidden', level !== 1);
  document.getElementById('level2-slots').classList.toggle('hidden', level !== 2);

  // Reset glow
  const glow = document.getElementById('lamp-fixed-glow');
  glow.classList.remove('lit');

  // Update level pills
  for (let i = 1; i <= 2; i++) {
    const pill = document.getElementById(`pill-${i}`);
    pill.className = 'level-pill';
    if (i < level)      pill.classList.add('completed');
    else if (i === level) pill.classList.add('active');
    else                  pill.classList.add('locked');
  }

  // Show/hide bank pieces based on level config
  const allPieceTypes = ['lamp', 'corner', 'switch', 'battery', 'line', 'pline'];
  allPieceTypes.forEach(type => {
    const el = document.getElementById(`bank-${type}`);
    if (!el) return;
    const inLevel = !!cfg.bank[type];
    el.classList.toggle('hidden', !inLevel);
  });

  // Reset lamp slot effect from level 1 if transitioning
  const slotLamp = document.getElementById('slot-top-right');
  if (slotLamp) {
    slotLamp.classList.remove('lamp-lit');
    slotLamp.style.filter     = '';
    slotLamp.style.transition = '';
  }
}

/* ════════════════════════════════════════════════════════
   RENDER
════════════════════════════════════════════════════════ */
function renderAll() {
  renderSlots();
  renderBank();
  renderButtons();
}

function renderSlots() {
  Object.keys(levelConfig.slots).forEach(slotId => {
    const el   = document.getElementById(slotId);
    if (!el) return;
    const data = state.slots[slotId];
    const cfg  = levelConfig.slots[slotId];
    const bank = levelConfig.bank;

    // Reset
    el.innerHTML = '';
    el.className = 'drop-slot';

    if (data.occupiedBy) {
      const img = document.createElement('img');
      img.src             = `images/${bank[data.occupiedBy].file}`;
      img.alt             = bank[data.occupiedBy].label;
      img.style.transform = `rotate(${cfg.rotation}deg)`;
      img.draggable       = false;
      el.appendChild(img);

      if (data.isCorrect === true)  el.classList.add('correct');
      if (data.isCorrect === false) el.classList.add('incorrect');
    }
  });
}

function renderBank() {
  const bankCfg = levelConfig.bank;
  Object.keys(bankCfg).forEach(type => {
    const bankEl  = document.getElementById(`bank-${type}`);
    const badgeEl = document.getElementById(`count-${type}`);
    if (!bankEl || !badgeEl) return;

    const count = state.bank[type] ?? 0;
    const total = bankCfg[type].totalCount;

    bankEl.classList.toggle('empty', count <= 0);

    if (total > 1) {
      badgeEl.textContent   = `×${count}`;
      badgeEl.style.display = count > 0 ? '' : 'none';
    }
  });
}

function renderButtons() {
  const btnUndo = document.getElementById('btn-undo');
  const btnTest = document.getElementById('btn-test');

  btnUndo.disabled = state.history.length === 0;

  const allFilled = Object.values(state.slots).every(s => s.occupiedBy !== null);
  btnTest.disabled = !allFilled || state.phase === 'SUCCESS';
}

/* ════════════════════════════════════════════════════════
   EVENT BINDING — called once on DOMContentLoaded
════════════════════════════════════════════════════════ */
function bindEvents() {
  // ── Bank pieces (event delegation — handles all types including pline) ──
  document.getElementById('bank-pieces').addEventListener('mousedown',  e => {
    const piece = e.target.closest('.bank-piece');
    if (piece) onStartFromBank(e, piece.dataset.piece);
  });
  document.getElementById('bank-pieces').addEventListener('touchstart', e => {
    const piece = e.target.closest('.bank-piece');
    if (piece) onStartFromBank(e, piece.dataset.piece);
  }, { passive: false });

  // ── Slot drag-from — delegated to both slot groups ──
  ['level1-slots', 'level2-slots'].forEach(groupId => {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.addEventListener('mousedown',  e => {
      const slot = e.target.closest('[data-slot]');
      if (slot) onStartFromSlot(e, slot.id);
    });
    group.addEventListener('touchstart', e => {
      const slot = e.target.closest('[data-slot]');
      if (slot) onStartFromSlot(e, slot.id);
    }, { passive: false });
  });

  // ── Global move / end ──
  document.addEventListener('mousemove',   onDragMove);
  document.addEventListener('mouseup',     onDragEnd);
  document.addEventListener('touchmove',   onDragMove,  { passive: false });
  document.addEventListener('touchend',    onDragEnd);
  document.addEventListener('touchcancel', onDragEnd);

  // ── Control buttons ──
  document.getElementById('btn-undo').addEventListener('click',  doUndo);
  document.getElementById('btn-reset').addEventListener('click', doReset);
  document.getElementById('btn-test').addEventListener('click',  doTest);

  // ── Success overlay: next level / finish ──
  document.getElementById('btn-next').addEventListener('click', () => {
    document.getElementById('success-overlay').classList.add('hidden');
    if (currentLevel === 1) {
      initGame(2);
    }
    // Level 2 is the last level — button just closes overlay
  });

  // ── Fail overlay buttons ──
  document.getElementById('btn-fail-back').addEventListener('click', () => {
    document.getElementById('fail-overlay').classList.add('hidden');
  });

  document.getElementById('btn-fail-reset').addEventListener('click', () => {
    document.getElementById('fail-overlay').classList.add('hidden');
    doReset();
  });
}

/* ════════════════════════════════════════════════════════
   DRAG — UNIFIED MOUSE + TOUCH
════════════════════════════════════════════════════════ */

function getPos(e) {
  const src = e.touches?.[0] ?? e.changedTouches?.[0] ?? e;
  return { x: src.clientX, y: src.clientY };
}

const ghostEl = () => document.getElementById('drag-ghost');

function showGhost(pieceType, rotation, x, y) {
  const g = ghostEl();
  g.innerHTML = '';
  const img = document.createElement('img');
  img.src             = `images/${levelConfig.bank[pieceType].file}`;
  img.alt             = levelConfig.bank[pieceType].label;
  img.style.transform = `rotate(${rotation}deg)`;
  img.draggable       = false;
  g.appendChild(img);
  g.classList.add('dragging');
  moveGhost(x, y);
}

function moveGhost(x, y) {
  const g = ghostEl();
  g.style.left = x + 'px';
  g.style.top  = y + 'px';
}

function hideGhost() {
  const g = ghostEl();
  g.classList.remove('dragging');
  g.innerHTML = '';
}

/* ── Drag start – from bank ── */
function onStartFromBank(e, pieceType) {
  if (drag.active)                      return;
  if (!levelConfig.bank[pieceType])     return;
  if (state.bank[pieceType] <= 0)       return;
  if (state.phase === 'SUCCESS')        return;

  e.preventDefault();

  drag.active     = true;
  drag.pieceType  = pieceType;
  drag.fromSlotId = null;

  const pos = getPos(e);
  showGhost(pieceType, 0, pos.x, pos.y);
}

/* ── Drag start – from an occupied slot ── */
function onStartFromSlot(e, slotId) {
  if (drag.active)                      return;
  if (!state.slots[slotId])             return;
  if (!state.slots[slotId].occupiedBy)  return;
  if (state.phase === 'SUCCESS')        return;

  e.preventDefault();
  e.stopPropagation();

  const pieceType = state.slots[slotId].occupiedBy;
  const rotation  = levelConfig.slots[slotId].rotation;

  // Clear source slot immediately
  state.slots[slotId] = { occupiedBy: null, isCorrect: null };
  const slotEl = document.getElementById(slotId);
  slotEl.innerHTML = '';
  slotEl.className = 'drop-slot';

  drag.active     = true;
  drag.pieceType  = pieceType;
  drag.fromSlotId = slotId;

  const pos = getPos(e);
  showGhost(pieceType, rotation, pos.x, pos.y);
}

/* ── Drag move ── */
function onDragMove(e) {
  if (!drag.active) return;
  e.preventDefault();

  const pos = getPos(e);
  moveGhost(pos.x, pos.y);

  const elUnder      = document.elementFromPoint(pos.x, pos.y);
  const targetSlotEl = elUnder?.closest('[data-slot]');

  if (drag.highlightedSlot && drag.highlightedSlot !== targetSlotEl) {
    drag.highlightedSlot.classList.remove('drag-over');
    drag.highlightedSlot = null;
  }

  if (targetSlotEl) {
    const slotId   = targetSlotEl.id;
    const slotData = state.slots[slotId];
    if (slotData && !slotData.occupiedBy && slotId !== drag.fromSlotId) {
      targetSlotEl.classList.add('drag-over');
      drag.highlightedSlot = targetSlotEl;
    }
  }
}

/* ── Drag end – drop or return ── */
function onDragEnd(e) {
  if (!drag.active) return;

  const pos = getPos(e);
  const elUnder      = document.elementFromPoint(pos.x, pos.y);
  const targetSlotEl = elUnder?.closest('[data-slot]');

  document.querySelectorAll('.drop-slot.drag-over').forEach(el => el.classList.remove('drag-over'));
  drag.highlightedSlot = null;

  let dropped = false;

  if (targetSlotEl) {
    const targetId   = targetSlotEl.id;
    const targetData = state.slots[targetId];
    const canDrop    = targetData && !targetData.occupiedBy && targetId !== drag.fromSlotId;

    if (canDrop) {
      commitDrop(drag.pieceType, drag.fromSlotId, targetId);
      dropped = true;
    }
  }

  if (!dropped) {
    // Return piece to origin
    if (drag.fromSlotId) {
      const isCorrect = levelConfig.slots[drag.fromSlotId].correctPiece === drag.pieceType;
      state.slots[drag.fromSlotId] = { occupiedBy: drag.pieceType, isCorrect };
    }
    // If from bank: bank count was never modified
  }

  hideGhost();
  drag.active     = false;
  drag.pieceType  = null;
  drag.fromSlotId = null;

  renderAll();
}

/* ════════════════════════════════════════════════════════
   CORE GAME ACTIONS
════════════════════════════════════════════════════════ */
function commitDrop(pieceType, fromSlotId, toSlotId) {
  state.history.push({ pieceType, fromSlotId, toSlotId });

  if (fromSlotId === null) {
    state.bank[pieceType]--;
  }

  const isCorrect = levelConfig.slots[toSlotId].correctPiece === pieceType;
  state.slots[toSlotId] = { occupiedBy: pieceType, isCorrect };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const el   = document.getElementById(toSlotId);
      const anim = isCorrect ? 'anim-place' : 'anim-shake';
      el.classList.add(anim);
      el.addEventListener('animationend', () => el.classList.remove(anim), { once: true });
    });
  });

  const allFilled = Object.values(state.slots).every(s => s.occupiedBy !== null);
  state.phase = allFilled ? 'COMPLETE' : (state.history.length > 0 ? 'IN_PROGRESS' : 'IDLE');
}

/* ── UNDO ── */
function doUndo() {
  if (state.history.length === 0) return;

  const last = state.history.pop();
  state.slots[last.toSlotId] = { occupiedBy: null, isCorrect: null };

  if (last.fromSlotId === null) {
    state.bank[last.pieceType]++;
  } else {
    const isCorrect = levelConfig.slots[last.fromSlotId].correctPiece === last.pieceType;
    state.slots[last.fromSlotId] = { occupiedBy: last.pieceType, isCorrect };
  }

  state.phase = state.history.length > 0 ? 'IN_PROGRESS' : 'IDLE';
  renderAll();
}

/* ── RESET ── */
function doReset() {
  Object.keys(levelConfig.slots).forEach(id => {
    state.slots[id] = { occupiedBy: null, isCorrect: null };
  });
  Object.keys(levelConfig.bank).forEach(type => {
    state.bank[type] = levelConfig.bank[type].totalCount;
  });

  state.history = [];
  state.phase   = 'IDLE';

  // Reset success/fail effects
  document.getElementById('success-overlay').classList.add('hidden');
  document.getElementById('fail-overlay').classList.add('hidden');
  document.getElementById('lamp-fixed-glow').classList.remove('lit');

  // Reset lit slots
  document.querySelectorAll('.drop-slot.lamp-lit').forEach(el => {
    el.classList.remove('lamp-lit');
    el.style.filter     = '';
    el.style.transition = '';
  });

  renderAll();
}

/* ── TEST CIRCUIT ── */
function doTest() {
  const allFilled = Object.values(state.slots).every(s => s.occupiedBy !== null);
  if (!allFilled) return;

  const allCorrect = Object.values(state.slots).every(s => s.isCorrect === true);

  if (allCorrect) {
    state.phase = 'SUCCESS';
    triggerSuccess();
  } else {
    state.phase = 'ERROR';
    triggerError();
  }

  renderAll();
}

/* ════════════════════════════════════════════════════════
   SUCCESS SEQUENCE
════════════════════════════════════════════════════════ */
function triggerSuccess() {
  const cfg = levelConfig.success;

  // Update overlay content dynamically
  document.getElementById('success-title').textContent = cfg.title;
  document.getElementById('success-msg').innerHTML     = cfg.msg;
  document.getElementById('btn-next-label').textContent = cfg.btn;

  // Determine which lamp slots to animate for this level
  const lampSlots = getLampSlots();

  // Blink lamps
  let tick = 0;
  const BLINK_INTERVAL = 280;
  const BLINKS         = 6;

  const blinkTimer = setInterval(() => {
    const lit = tick % 2 === 0;
    lampSlots.forEach(slotId => {
      const el = document.getElementById(slotId);
      if (!el) return;
      el.style.filter = lit
        ? 'brightness(2.2) drop-shadow(0 0 16px #FBBF24)'
        : 'brightness(1)';
    });
    tick++;

    if (tick >= BLINKS) {
      clearInterval(blinkTimer);
      lampSlots.forEach(slotId => {
        const el = document.getElementById(slotId);
        if (!el) return;
        el.classList.add('lamp-lit');
        el.style.filter     = '';
        el.style.transition = '';
      });
    }
  }, BLINK_INTERVAL);

  // Fixed top lamp glow
  document.getElementById('lamp-fixed-glow').classList.add('lit');

  setTimeout(() => {
    document.getElementById('success-overlay').classList.remove('hidden');
  }, BLINK_INTERVAL * BLINKS + 600);
}

/** Returns the slot IDs of placed lamps for the current level. */
function getLampSlots() {
  return Object.entries(levelConfig.slots)
    .filter(([, cfg]) => cfg.correctPiece === 'lamp')
    .map(([id]) => id);
}

/* ── ERROR FEEDBACK ── */
function triggerError() {
  const btn = document.getElementById('btn-test');
  btn.classList.add('anim-shake');
  btn.addEventListener('animationend', () => btn.classList.remove('anim-shake'), { once: true });

  document.getElementById('fail-overlay').classList.remove('hidden');
}

/* ════════════════════════════════════════════════════════
   TOAST (kept for future use)
════════════════════════════════════════════════════════ */
let _toastTimer = null;

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.classList.remove('show', 'toast-error');
  void toast.offsetWidth;
  toast.textContent = msg;
  if (type === 'error') toast.classList.add('toast-error');
  toast.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    toast.classList.remove('show', 'toast-error');
  }, 3000);
}

/* ════════════════════════════════════════════════════════
   BOOT
════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  bindEvents();

  // ── Splash screen ──
  const splashEl  = document.getElementById('splash-overlay');
  const btnStart  = document.getElementById('btn-start');

  btnStart.addEventListener('click', () => {
    // Animate out
    splashEl.classList.add('splash-exit');
    splashEl.addEventListener('transitionend', () => {
      splashEl.classList.add('hidden');
      initGame(1);
    }, { once: true });
  });
});
