/* ui.js — DOM rendering: graph list, color picker, presets, slider handlers */

let _activeColorTarget = null;

function initUI() {
  document.getElementById('btn-add').addEventListener('click', () => addGraph());
  document.getElementById('btn-analyze').addEventListener('click', runAnalysis);
  document.getElementById('btn-clear-analysis').addEventListener('click', clearAnalysis);

  document.getElementById('xRange').addEventListener('input', onRangeChange);
  document.getElementById('yRange').addEventListener('input', onRangeChange);
  document.getElementById('resolution').addEventListener('input', onRangeChange);
  document.getElementById('opacity').addEventListener('input', onDisplayChange);
  document.getElementById('wireframe').addEventListener('change', onDisplayChange);
  document.getElementById('showAxes').addEventListener('change', onDisplayChange);
  document.getElementById('showGrid').addEventListener('change', onDisplayChange);

  document.addEventListener('click', e => {
    if (!e.target.closest('#color-picker-popup') && !e.target.classList.contains('color-dot')) {
      document.getElementById('color-picker-popup').classList.remove('open');
    }
  });

  buildColorPicker();
  buildPresets();
}

function addGraph(expr, color) {
  const id = ++State.graphId;
  const c  = color || COLORS[State.graphs.length % COLORS.length];
  State.graphs.push({ id, expr: expr || '', color: c, compiled: null });
  renderGraphsList();
  if (expr) scheduleRebuild(id);
  return id;
}

function removeGraph(id) {
  State.graphs = State.graphs.filter(g => g.id !== id);
  removeMesh(id);
  renderGraphsList();
}

function renderGraphsList() {
  const list = document.getElementById('graphs-list');
  list.innerHTML = '';
  State.graphs.forEach(g => {
    const el = document.createElement('div');
    el.className = 'graph-entry';
    el.dataset.id = g.id;
    el.innerHTML = `
      <div class="graph-entry-top">
        <div class="color-dot" style="background:${g.color}" title="Change colour" data-gid="${g.id}"></div>
        <input class="fn-input" type="text" placeholder="e.g. sin(x)*cos(y)"
          value="${esc(g.expr)}" data-gid="${g.id}"
          spellcheck="false" autocomplete="off" autocorrect="off"/>
        <div class="graph-entry-actions">
          <button class="btn-icon danger" title="Remove" data-remove="${g.id}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="fn-error" id="err-${g.id}"></div>`;
    list.appendChild(el);
  });

  // Event delegation
  list.querySelectorAll('.fn-input').forEach(inp => {
    inp.addEventListener('input', e => {
      const id = parseInt(e.target.dataset.gid);
      const g  = State.graphs.find(g => g.id === id);
      if (g) { g.expr = e.target.value; scheduleRebuild(id); }
    });
  });
  list.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => removeGraph(parseInt(btn.dataset.remove)));
  });
  list.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', e => openColorPicker(e, parseInt(dot.dataset.gid)));
  });
}

function onRangeChange() {
  document.getElementById('xRangeVal').textContent = `±${document.getElementById('xRange').value}`;
  document.getElementById('yRangeVal').textContent = `±${document.getElementById('yRange').value}`;
  document.getElementById('resolutionVal').textContent = document.getElementById('resolution').value;
  scheduleRebuildAll();
}

function onDisplayChange() {
  const op = parseFloat(document.getElementById('opacity').value);
  document.getElementById('opacityVal').textContent = Math.round(op * 100) + '%';
  if (State.axesGroup)  State.axesGroup.visible  = document.getElementById('showAxes').checked;
  if (State.gridHelper) State.gridHelper.visible  = document.getElementById('showGrid').checked;
  const wireframe = document.getElementById('wireframe').checked;
  Object.values(State.graphMeshes).forEach(mesh => {
    mesh.material.wireframe = wireframe;
    mesh.material.opacity   = op;
    mesh.material.transparent = op < 1;
  });
}

function buildColorPicker() {
  const pop = document.getElementById('color-picker-popup');
  pop.innerHTML = '';
  COLORS.forEach(c => {
    const d = document.createElement('div');
    d.className = 'color-option';
    d.style.background = c;
    d.dataset.color = c;
    d.addEventListener('click', () => setGraphColor(_activeColorTarget, c));
    pop.appendChild(d);
  });
}

function openColorPicker(e, id) {
  e.stopPropagation();
  _activeColorTarget = id;
  const pop  = document.getElementById('color-picker-popup');
  const rect = e.target.getBoundingClientRect();
  pop.style.top  = (rect.bottom + 6) + 'px';
  pop.style.left = rect.left + 'px';
  pop.classList.add('open');
  const g = State.graphs.find(g => g.id === id);
  pop.querySelectorAll('.color-option').forEach(d => {
    d.classList.toggle('selected', d.dataset.color === g?.color);
  });
}

function setGraphColor(id, color) {
  const g = State.graphs.find(g => g.id === id);
  if (g) {
    g.color = color;
    renderGraphsList();
    if (State.graphMeshes[id]) {
      const hex = parseInt(color.replace('#', ''), 16);
      State.graphMeshes[id].material.color.setHex(hex);
      State.graphMeshes[id].material.emissive.setHex(hex);
    }
  }
  document.getElementById('color-picker-popup').classList.remove('open');
}

function buildPresets() {
  const grid = document.getElementById('presets-grid');
  PRESETS.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.title = p.expr;
    btn.textContent = p.label;
    btn.addEventListener('click', () => {
      State.graphs = [];
      Object.keys(State.graphMeshes).forEach(id => removeMesh(parseInt(id)));
      clearAnalysis();
      addGraph(p.expr);
    });
    grid.appendChild(btn);
  });
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
