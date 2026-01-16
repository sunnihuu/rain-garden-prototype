document.addEventListener("DOMContentLoaded", () => {
  const stormSlider = document.getElementById("stormSlider");
  const stormValue = document.getElementById("stormValue");
  const captureValue = document.getElementById("captureValue");
  const soakTime = document.getElementById("soakTime");
  const liveCapture = document.getElementById("liveCapture");
  const themeToggle = document.getElementById("themeToggle");

  const accents = ["#7df5b8", "#7dd5f5", "#f57de7", "#f5c77d"];
  let accentIndex = 0;

  const updateStorm = (value) => {
    const depth = parseFloat(value);
    const capturePercent = Math.max(40, Math.min(95, 110 - depth * 10));
    const soakHours = (depth * 3).toFixed(1);

    stormValue.textContent = depth.toFixed(1);
    captureValue.textContent = capturePercent.toFixed(0);
    soakTime.textContent = `${soakHours} hrs`;
    liveCapture.textContent = (capturePercent / 40).toFixed(1);
  };

  const cycleAccent = () => {
    accentIndex = (accentIndex + 1) % accents.length;
    const next = accents[accentIndex];
    document.documentElement.style.setProperty("--accent", next);
  };

  stormSlider.addEventListener("input", (e) => updateStorm(e.target.value));
  themeToggle.addEventListener("click", cycleAccent);

  updateStorm(stormSlider.value);
});
