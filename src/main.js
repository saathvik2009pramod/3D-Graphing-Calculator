/* main.js — Entry point: wires everything together */

window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initThree();
  initControls();
  initUI();

  // Default graph on load
  addGraph('sin(x) * cos(y)');

  // Hide loading screen
  setTimeout(() => {
    const el = document.getElementById('loading');
    el.classList.add('hidden');
    setTimeout(() => el.remove(), 400);
  }, 700);
});
