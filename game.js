'use strict';

/* ════════════════════════════════════════════════════════
   CIRCUITO ELÉCTRICO — GAME LOGIC
   Touch + Mouse unified drag & drop
════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────
   CONFIGURATION
   correctPiece: the piece type that must go in this slot
   rotation:     CSS degrees applied to the piece image when placed
────────────────────────────────────────────────────── */
const SLOT_CONFIG = {
  //               correctPiece   rotation
  'slot-corner-tl':     { correctPiece: 'corner',  rotation:  90 },
  'slot-top-right':     { correctPiece: 'lamp',    rotation:   0 },
  'slot-corner-tr':     { correctPiece: 'corner',  rotation: 180 },
  'slot-mid-right':     { correctPiece: 'line',    rotation:  90 },
  'slot-corner-br':     { correctPiece: 'corner',  rotation: 270 },
  'slot-bottom-center': { correctPiece: 'battery', rotation:   0 },
  'slot-corner-bl':     { correctPiece: 'corner',  rotation:   0 },
  'slot-mid-left':      { correctPiece: 'switch',  rotation:   0 },
};

const PIECE_CONFIG = {
  //           file              totalCount   label
  lamp:    { file: 'lamp.png',    totalCount: 1, label: 'Lámpara' },
  corner:  { file: 'corner.png',  totalCount: 4, label: 'Esquina' },
  switch:  { file: 'switch.png',  totalCount: 1, label: 'Switch'  },
  battery: { file: 'battery.png', totalCount: 1, label: 'Batería' },
  line:    { file: 'line.png',    totalCount: 1, label: 'Línea'   },
};

/* ──────────────────────────────────────────────────────
   GAME STATE
────────────────────────────────────────────────────── */
let state = {
  // slotId → { occupiedBy: string|null, isCorrect: bool|null }
  slots: {},
  // pieceType → remaining count in bank
  bank: {},
  // undo history stack: [{ pieceType, fromSlotId, toSlotId }, ...]
  // fromSlotId === null means the piece came from the bank
  history: [],
  // 'IDLE' | 'IN_PROGRESS' | 'COMPLETE' | 'SUCCESS' | 'ERROR'
  phase: 'IDLE',
};

/* ──────────────────────────────────────────────────────
   DRAG STATE
────────────────────────────────────────────────────── */
let drag = {
  active:           false,
  pieceType:        null,
  fromSlotId:       null,   // null = dragged from bank
  highlightedSlot:  null,   // currently highlighted drop-slot element
};

/* ════════════════════════════════════════════════════════
   INITIALISATION
════════════════════════════════════════════════════════ */
function initGame() {
  // Build fresh state
  state.slots = {};
  Object.keys(SLOT_CONFIG).forEach(id => {
    state.slots[id] = { occupiedBy: null, isCorrect: null };
  });

  state.bank = {};
  Object.keys(PIECE_CONFIG).forEach(type => {
    state.bank[type] = PIECE_CONFIG[type].totalCount;
  });

  state.history = [];
  state.phase   = 'IDLE';

  bindEvents();
  renderAll();
}

/* ════════════════════════════════════════════════════════
   RENDER
════════════════════════════════════════════════════════ */

/** Full re-render of all UI components from state. */
function renderAll() {
  renderSlots();
  renderBank();
  renderButtons();
}

function renderSlots() {
  Object.keys(SLOT_CONFIG).forEach(slotId => {
    const el   = document.getElementById(slotId);
    const data = state.slots[slotId];
    const cfg  = SLOT_CONFIG[slotId];

    // Reset
    el.innerHTML = '';
    el.className = 'drop-slot';

    if (data.occupiedBy) {
      const img = document.createElement('img');
      img.src           = `images/${PIECE_CONFIG[data.occupiedBy].file}`;
      img.alt           = PIECE_CONFIG[data.occupiedBy].label;
      img.style.transform = `rotate(${cfg.rotation}deg)`;
      img.draggable     = false;
      el.appendChild(img);

      if (data.isCorrect === true)  el.classList.add('correct');
      if (data.isCorrect === false) el.classList.add('incorrect');
    }
  });
}

function renderBank() {
  Object.keys(PIECE_CONFIG).forEach(type => {
    const bankEl  = document.getElementById(`bank-${type}`);
    const badgeEl = document.getElementById(`count-${type}`);
    const count   = state.bank[type];
    const total   = PIECE_CONFIG[type].totalCount;

    bankEl.classList.toggle('empty', count <= 0);

    // Only show badge for pieces with totalCount > 1 (i.e. corners)
    if (total > 1) {
      badgeEl.textContent  = `×${count}`;
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
   EVENT BINDING
════════════════════════════════════════════════════════ */
function bindEvents() {
  // ── Bank pieces ──
  Object.keys(PIECE_CONFIG).forEach(type => {
    const el = document.getElementById(`bank-${type}`);
    el.addEventListener('mousedown',  e => onStartFromBank(e, type));
    el.addEventListener('touchstart', e => onStartFromBank(e, type), { passive: false });
  });

  // ── Slots (re-drag placed pieces) ──
  Object.keys(SLOT_CONFIG).forEach(slotId => {
    const el = document.getElementById(slotId);
    el.addEventListener('mousedown',  e => onStartFromSlot(e, slotId));
    el.addEventListener('touchstart', e => onStartFromSlot(e, slotId), { passive: false });
  });

  // ── Global move / end ──
  document.addEventListener('mousemove',   onDragMove);
  document.addEventListener('mouseup',     onDragEnd);
  document.addEventListener('touchmove',   onDragMove,  { passive: false });
  document.addEventListener('touchend',    onDragEnd);
  document.addEventListener('touchcancel', onDragEnd);

  // ── Buttons ──
  document.getElementById('btn-undo').addEventListener('click',  doUndo);
  document.getElementById('btn-reset').addEventListener('click', doReset);
  document.getElementById('btn-test').addEventListener('click',  doTest);

  const btnNext = document.getElementById('btn-next');
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      document.getElementById('success-overlay').classList.add('hidden');
      // TODO: transition to Level 2
    });
  }
}

/* ════════════════════════════════════════════════════════
   DRAG — UNIFIED MOUSE + TOUCH
════════════════════════════════════════════════════════ */

/** Extract {x, y} from mouse or touch event. */
function getPos(e) {
  const src = e.touches?.[0] ?? e.changedTouches?.[0] ?? e;
  return { x: src.clientX, y: src.clientY };
}

const ghostEl = () => document.getElementById('drag-ghost');

function showGhost(pieceType, rotation, x, y) {
  const g = ghostEl();
  g.innerHTML = '';
  const img = document.createElement('img');
  img.src             = `images/${PIECE_CONFIG[pieceType].file}`;
  img.alt             = PIECE_CONFIG[pieceType].label;
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

/* ──────────────────────────────────────────────────────
   Drag start – from bank
────────────────────────────────────────────────────── */
function onStartFromBank(e, pieceType) {
  if (drag.active)                     return;
  if (state.bank[pieceType] <= 0)      return;
  if (state.phase === 'SUCCESS')       return;

  e.preventDefault();

  drag.active    = true;
  drag.pieceType = pieceType;
  drag.fromSlotId = null;

  const pos = getPos(e);
  showGhost(pieceType, 0, pos.x, pos.y);
}

/* ──────────────────────────────────────────────────────
   Drag start – from an occupied slot
────────────────────────────────────────────────────── */
function onStartFromSlot(e, slotId) {
  if (drag.active)                         return;
  if (!state.slots[slotId].occupiedBy)     return;
  if (state.phase === 'SUCCESS')           return;

  // Stop propagation so we don't also trigger a bank handler
  e.preventDefault();
  e.stopPropagation();

  const pieceType = state.slots[slotId].occupiedBy;
  const rotation  = SLOT_CONFIG[slotId].rotation;

  // Clear the source slot from STATE immediately
  // (we restore it on drop failure in onDragEnd)
  state.slots[slotId] = { occupiedBy: null, isCorrect: null };

  // Clear visual immediately
  const slotEl = document.getElementById(slotId);
  slotEl.innerHTML = '';
  slotEl.className = 'drop-slot';

  drag.active     = true;
  drag.pieceType  = pieceType;
  drag.fromSlotId = slotId;

  const pos = getPos(e);
  showGhost(pieceType, rotation, pos.x, pos.y);
}

/* ──────────────────────────────────────────────────────
   Drag move
────────────────────────────────────────────────────── */
function onDragMove(e) {
  if (!drag.active) return;
  e.preventDefault();

  const pos = getPos(e);
  moveGhost(pos.x, pos.y);

  // ── Slot highlight under finger/cursor ──
  // (ghost has pointer-events:none so elementFromPoint skips it)
  const elUnder      = document.elementFromPoint(pos.x, pos.y);
  const targetSlotEl = elUnder?.closest('[data-slot]');

  // Remove previous highlight
  if (drag.highlightedSlot && drag.highlightedSlot !== targetSlotEl) {
    drag.highlightedSlot.classList.remove('drag-over');
    drag.highlightedSlot = null;
  }

  if (targetSlotEl) {
    const slotId   = targetSlotEl.id;
    const slotData = state.slots[slotId];
    const canDrop  = !slotData.occupiedBy && slotId !== drag.fromSlotId;
    if (canDrop) {
      targetSlotEl.classList.add('drag-over');
      drag.highlightedSlot = targetSlotEl;
    }
  }
}

/* ──────────────────────────────────────────────────────
   Drag end – drop or return
────────────────────────────────────────────────────── */
function onDragEnd(e) {
  if (!drag.active) return;

  const pos = getPos(e);

  // Find element under finger/cursor (ghost is pointer-events:none, so it's skipped)
  const elUnder      = document.elementFromPoint(pos.x, pos.y);
  const targetSlotEl = elUnder?.closest('[data-slot]');

  // Remove all drag-over highlights
  document.querySelectorAll('.drop-slot.drag-over').forEach(el => el.classList.remove('drag-over'));
  drag.highlightedSlot = null;

  let dropped = false;

  if (targetSlotEl) {
    const targetId   = targetSlotEl.id;
    const targetData = state.slots[targetId];
    const canDrop    = !targetData.occupiedBy && targetId !== drag.fromSlotId;

    if (canDrop) {
      commitDrop(drag.pieceType, drag.fromSlotId, targetId);
      dropped = true;
    }
  }

  if (!dropped) {
    // ── Return piece to its origin ──
    if (drag.fromSlotId) {
      // Restore source slot in state (visual restored via renderAll below)
      const isCorrect = SLOT_CONFIG[drag.fromSlotId].correctPiece === drag.pieceType;
      state.slots[drag.fromSlotId] = { occupiedBy: drag.pieceType, isCorrect };
    }
    // If piece came from bank: bank count was never modified, so nothing to restore.
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

/**
 * Permanently place a piece in a target slot.
 * Records the move in history and validates correctness.
 */
function commitDrop(pieceType, fromSlotId, toSlotId) {
  // Record for undo
  state.history.push({ pieceType, fromSlotId, toSlotId });

  // Deduct from bank when piece came from bank
  if (fromSlotId === null) {
    state.bank[pieceType]--;
  }
  // fromSlotId slot was already cleared in state during onStartFromSlot
  // (or was null for bank), so nothing more to clear.

  // Place in target
  const isCorrect = SLOT_CONFIG[toSlotId].correctPiece === pieceType;
  state.slots[toSlotId] = { occupiedBy: pieceType, isCorrect };

  // Trigger placement animation after render
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const el = document.getElementById(toSlotId);
      const anim = isCorrect ? 'anim-place' : 'anim-shake';
      el.classList.add(anim);
      el.addEventListener('animationend', () => el.classList.remove(anim), { once: true });
    });
  });

  // Update phase
  const allFilled = Object.values(state.slots).every(s => s.occupiedBy !== null);
  if (allFilled) {
    state.phase = 'COMPLETE';
  } else {
    state.phase = state.history.length > 0 ? 'IN_PROGRESS' : 'IDLE';
  }
}

/* ──────────────────────────────────────────────────────
   UNDO
────────────────────────────────────────────────────── */
function doUndo() {
  if (state.history.length === 0) return;

  const last = state.history.pop();

  // Clear destination slot
  state.slots[last.toSlotId] = { occupiedBy: null, isCorrect: null };

  // Restore origin
  if (last.fromSlotId === null) {
    // Piece came from bank → return to bank
    state.bank[last.pieceType]++;
  } else {
    // Piece came from another slot → restore that slot
    const isCorrect = SLOT_CONFIG[last.fromSlotId].correctPiece === last.pieceType;
    state.slots[last.fromSlotId] = { occupiedBy: last.pieceType, isCorrect };
  }

  state.phase = state.history.length > 0 ? 'IN_PROGRESS' : 'IDLE';
  renderAll();
}

/* ──────────────────────────────────────────────────────
   RESET
────────────────────────────────────────────────────── */
function doReset() {
  // Clear all slots
  Object.keys(SLOT_CONFIG).forEach(id => {
    state.slots[id] = { occupiedBy: null, isCorrect: null };
  });

  // Restore full bank
  Object.keys(PIECE_CONFIG).forEach(type => {
    state.bank[type] = PIECE_CONFIG[type].totalCount;
  });

  state.history = [];
  state.phase   = 'IDLE';

  // Reset success effects
  document.getElementById('success-overlay').classList.add('hidden');
  document.getElementById('lamp-fixed-glow').classList.remove('lit');

  const slotLamp = document.getElementById('slot-top-right');
  slotLamp.classList.remove('lamp-lit');
  slotLamp.style.filter     = '';
  slotLamp.style.transition = '';

  renderAll();
}

/* ──────────────────────────────────────────────────────
   TEST CIRCUIT
────────────────────────────────────────────────────── */
function doTest() {
  // Safety check: all slots must be filled (button should be disabled otherwise)
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

/* ──────────────────────────────────────────────────────
   SUCCESS SEQUENCE
────────────────────────────────────────────────────── */
function triggerSuccess() {
  const slotLamp  = document.getElementById('slot-top-right');
  const fixedGlow = document.getElementById('lamp-fixed-glow');

  // Blink both lamps 3 times, then stay lit
  let tick = 0;
  const BLINK_INTERVAL = 280; // ms per half-cycle
  const BLINKS = 6;           // 6 half-cycles = 3 full blinks

  const blinkTimer = setInterval(() => {
    const lit = tick % 2 === 0;
    slotLamp.style.filter = lit
      ? 'brightness(2.2) drop-shadow(0 0 16px #FBBF24)'
      : 'brightness(1)';
    tick++;

    if (tick >= BLINKS) {
      clearInterval(blinkTimer);
      // Stay permanently lit
      slotLamp.classList.add('lamp-lit');
      slotLamp.style.filter     = '';
      slotLamp.style.transition = '';
    }
  }, BLINK_INTERVAL);

  // Fixed lamp overlay blinks via CSS animation
  fixedGlow.classList.add('lit');

  // Show success modal after lamps finish animating
  setTimeout(() => {
    document.getElementById('success-overlay').classList.remove('hidden');
  }, BLINK_INTERVAL * BLINKS + 600);
}

/* ──────────────────────────────────────────────────────
   ERROR FEEDBACK
────────────────────────────────────────────────────── */
function triggerError() {
  // Shake the test button
  const btn = document.getElementById('btn-test');
  btn.classList.add('anim-shake');
  btn.addEventListener('animationend', () => btn.classList.remove('anim-shake'), { once: true });

  // Count how many pieces are wrong
  const wrongCount = Object.values(state.slots).filter(s => s.isCorrect === false).length;
  const msg = wrongCount === 1
    ? '¡Corregí el circuito! Hay 1 pieza en el lugar incorrecto.'
    : `¡Corregí el circuito! Hay ${wrongCount} piezas en lugares incorrectos.`;

  showToast(msg, 'error');
}

/* ──────────────────────────────────────────────────────
   TOAST
────────────────────────────────────────────────────── */
let _toastTimer = null;

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');

  // Reset animation
  toast.classList.remove('show', 'toast-error');
  void toast.offsetWidth; // force reflow

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
document.addEventListener('DOMContentLoaded', initGame);
