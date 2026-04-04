/* analysis.js — Surface analysis: equation info, area estimate, intersections */

function runAnalysis() {
  const panel   = document.getElementById('analysis-panel');
  const content = document.getElementById('analysis-content');
  const list    = document.getElementById('intersection-list');

  if (State.graphs.length === 0) {
    panel.classList.remove('visible');
    list.innerHTML = '<div class="result-empty">No functions to analyse.</div>';
    return;
  }

  const xR  = parseFloat(document.getElementById('xRange').value);
  const yR  = parseFloat(document.getElementById('yRange').value);
  const seg = 80; // fixed resolution for analysis
  const dx  = (2 * xR) / seg;
  const dy  = (2 * yR) / seg;

  // ── Per-graph stats ──────────────────────────────────────────────────────
  const stats = State.graphs
    .filter(g => g.compiled)
    .map(g => {
      let zMin = Infinity, zMax = -Infinity, zSum = 0, count = 0;
      let surfaceArea = 0;

      for (let i = 0; i <= seg; i++) {
        for (let j = 0; j <= seg; j++) {
          const x = -xR + i * dx;
          const y = -yR + j * dy;
          let z;
          try { z = g.compiled.evaluate({ x, y }); } catch { z = 0; }
          if (!isFinite(z) || isNaN(z)) z = 0;
          z = Math.max(-25, Math.min(25, z));
          if (z < zMin) zMin = z;
          if (z > zMax) zMax = z;
          zSum += z;
          count++;

          // Approximate surface area using quad element patch size
          if (i < seg && j < seg) {
            const x1 = -xR + (i+1) * dx, y1 = -yR + (j+1) * dy;
            let z1, z2, z3;
            try { z1 = g.compiled.evaluate({ x: x1, y }); } catch { z1 = 0; }
            try { z2 = g.compiled.evaluate({ x, y: y1 }); } catch { z2 = 0; }
            try { z3 = g.compiled.evaluate({ x: x1, y: y1 }); } catch { z3 = 0; }
            [z1,z2,z3].forEach(v => { if (!isFinite(v)||isNaN(v)) v=0; });

            // Two triangles: cross product magnitude / 2 each
            const ax=dx, ay=0, az=z1-z;
            const bx=0,  by=dy, bz=z2-z;
            const cx=dx, cy=dy, cz=z3-z;
            const nx1 = ay*bz - az*by, ny1 = az*bx - ax*bz, nz1 = ax*by - ay*bx;
            const nx2 = by*cz - bz*cy, ny2 = bz*cx - bx*cz, nz2 = bx*cy - by*cx;
            surfaceArea += 0.5 * Math.sqrt(nx1*nx1+ny1*ny1+nz1*nz1);
            surfaceArea += 0.5 * Math.sqrt(nx2*nx2+ny2*ny2+nz2*nz2);
          }
        }
      }

      // Volume under surface (above z=0 plane) via midpoint rule
      let volume = 0;
      for (let i = 0; i < seg; i++) {
        for (let j = 0; j < seg; j++) {
          const xm = -xR + (i + 0.5) * dx;
          const ym = -yR + (j + 0.5) * dy;
          let zm;
          try { zm = g.compiled.evaluate({ x: xm, y: ym }); } catch { zm = 0; }
          if (!isFinite(zm)||isNaN(zm)) zm = 0;
          volume += zm * dx * dy;
        }
      }

      return {
        expr: g.expr,
        color: g.color,
        zMin: zMin.toFixed(4),
        zMax: zMax.toFixed(4),
        zMean: (zSum / count).toFixed(4),
        surfaceArea: surfaceArea.toFixed(3),
        volume: volume.toFixed(3),
      };
    });

  // ── Intersection detection (2 functions) ────────────────────────────────
  let intersections = [];
  if (State.graphs.length >= 2) {
    const [g1, g2] = State.graphs.filter(g => g.compiled);
    if (g1 && g2) {
      const threshold = (xR + yR) / seg * 0.6;
      for (let i = 0; i <= seg; i++) {
        for (let j = 0; j <= seg; j++) {
          const x = -xR + i * dx;
          const y = -yR + j * dy;
          let z1, z2;
          try { z1 = g1.compiled.evaluate({ x, y }); } catch { z1 = 0; }
          try { z2 = g2.compiled.evaluate({ x, y }); } catch { z2 = 0; }
          if (!isFinite(z1)||isNaN(z1)) z1 = 0;
          if (!isFinite(z2)||isNaN(z2)) z2 = 0;
          if (Math.abs(z1 - z2) < threshold) {
            intersections.push({ x: x.toFixed(2), y: y.toFixed(2), z: ((z1+z2)/2).toFixed(2) });
          }
        }
      }
      // Cluster: keep only one point per 1-unit cell
      const seen = new Set();
      intersections = intersections.filter(pt => {
        const key = `${Math.round(pt.x)},${Math.round(pt.y)}`;
        if (seen.has(key)) return false;
        seen.add(key); return true;
      }).slice(0, 12);
    }
  }

  // ── Render analysis panel (near graph) ──────────────────────────────────
  panel.classList.add('visible');
  document.getElementById('analysis-title').textContent =
    stats.length === 1 ? `f(x,y) = ${stats[0].expr}` : 'Analysis Results';

  content.innerHTML = stats.map(s => `
    <div style="margin-bottom:0.5rem;">
      ${stats.length > 1 ? `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
        <div style="width:10px;height:10px;border-radius:50%;background:${s.color};flex-shrink:0;"></div>
        <span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-muted);">${s.expr}</span>
      </div>` : ''}
      <div class="analysis-row"><span class="analysis-label">Z min</span><span class="analysis-value">${s.zMin}</span></div>
      <div class="analysis-row"><span class="analysis-label">Z max</span><span class="analysis-value">${s.zMax}</span></div>
      <div class="analysis-row"><span class="analysis-label">Z mean</span><span class="analysis-value">${s.zMean}</span></div>
      <div class="analysis-row"><span class="analysis-label">Surface area</span><span class="analysis-value">${s.surfaceArea} u²</span></div>
      <div class="analysis-row"><span class="analysis-label">Volume</span><span class="analysis-value">${s.volume} u³</span></div>
    </div>
  `).join('<hr style="border:none;border-top:1px solid var(--color-divider);margin:0.4rem 0;"/>');

  // ── Render intersection list in sidebar ──────────────────────────────────
  if (intersections.length > 0) {
    list.innerHTML = `
      <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:4px;">
        ${intersections.length} intersection region${intersections.length !== 1 ? 's' : ''} found
      </div>
      ${intersections.map((pt, i) => `
        <div class="intersection-item">
          <span class="int-label">P${i+1}</span>
          <span>x=${pt.x}</span><span>y=${pt.y}</span><span>z≈${pt.z}</span>
        </div>
      `).join('')}`;
  } else if (State.graphs.filter(g => g.compiled).length < 2) {
    list.innerHTML = '<div class="result-empty">Add 2 functions to find intersections.</div>';
  } else {
    list.innerHTML = '<div class="result-empty">No intersections found in range.</div>';
  }

  // ── Visualise intersection markers ───────────────────────────────────────
  clearIntersectionMarkers();
  intersections.forEach(pt => {
    const geo = new THREE.SphereGeometry(0.12, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.position.set(parseFloat(pt.x), parseFloat(pt.z), parseFloat(pt.y));
    State.scene.add(sphere);
    State.intersectionMarkers.push(sphere);
  });
}

function clearAnalysis() {
  document.getElementById('analysis-panel').classList.remove('visible');
  document.getElementById('intersection-list').innerHTML = '';
  clearIntersectionMarkers();
}

function clearIntersectionMarkers() {
  State.intersectionMarkers.forEach(m => {
    State.scene.remove(m);
    m.geometry.dispose();
    m.material.dispose();
  });
  State.intersectionMarkers = [];
}
