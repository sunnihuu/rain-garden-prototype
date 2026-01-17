// CTA scroll behavior: go to next screen
(function(){
  const btn = document.getElementById('cta-explore');
  if (btn) {
    btn.addEventListener('click', () => {
      const next = document.getElementById('screen-story');
      if (next) next.scrollIntoView({ behavior: 'smooth' });
    });
  }
})();

// Scenario controls and summary wiring (Screen 3)
(function initScenarioPanel() {
  const screen = document.getElementById('screen-scenario');
  if (!screen) return;

  let features = [];
  let mapScenario = null;
  const selectedIds = new Set();

  // District names from official NYC City Council Districts
  const councilDistrictNames = {
    19: 'District 19 - Bayside / Whitestone',
    20: 'District 20 - Flushing',
    21: 'District 21 - Corona / Elmhurst',
    22: 'District 22 - Astoria',
    23: 'District 23 - Bayside / Little Neck',
    24: 'District 24 - Jamaica',
    25: 'District 25 - Jackson Heights',
    26: 'District 26 - Long Island City',
    27: 'District 27 - Cambria Heights / Rosedale',
    28: 'District 28 - South Jamaica',
    29: 'District 29 - Forest Hills / Rego Park',
    30: 'District 30 - Middle Village / Ridgewood',
    31: 'District 31 - Far Rockaway',
    32: 'District 32 - Rockaways / Breezy Point'
  };

  const communityDistrictNames = {
    401: 'Community 401 - Astoria',
    402: 'Community 402 - Long Island City',
    403: 'Community 403 - Jackson Heights',
    404: 'Community 404 - Elmhurst / Corona',
    405: 'Community 405 - Ridgewood / Maspeth',
    406: 'Community 406 - Rego Park / Forest Hills',
    407: 'Community 407 - Flushing',
    408: 'Community 408 - Hillcrest / Fresh Meadows',
    409: 'Community 409 - Kew Gardens / Woodhaven',
    410: 'Community 410 - South Ozone Park / Howard Beach',
    411: 'Community 411 - Bayside / Little Neck',
    412: 'Community 412 - Jamaica / Hollis',
    413: 'Community 413 - Queens Village',
    414: 'Community 414 - Rockaway / Broad Channel'
  };

  const councilSelect = document.getElementById('councilSelect');
  const communitySelect = document.getElementById('communitySelect');
  const clearBtn = document.getElementById('clearBtn');
  const weeksRange = document.getElementById('weeksRange');
  const weeksValue = document.getElementById('weeksValue');
  const countEl = document.getElementById('count');
  const gallonsEl = document.getElementById('gallons');
  const hoursEl = document.getElementById('hours');
  const avgEl = document.getElementById('avg');
  const modeInputs = document.querySelectorAll('input[name="mode"]');

  function getMode() {
    return Array.from(modeInputs).find(r => r.checked)?.value || 'replace';
  }

  function capacityFactor(weeks) {
    return Math.max(0.2, 1 - 0.1 * weeks);
  }

  function effectiveCapacity(base, weeks) {
    return base * capacityFactor(weeks);
  }

  function formatNum(n) {
    return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0';
  }

  function updateSummary() {
    const weeks = Number(weeksRange.value);
    let c = 0, gallons = 0, hours = 0;
    features.forEach(f => {
      if (!selectedIds.has(f.properties.asset_id)) return;
      c += 1;
      gallons += effectiveCapacity(f.properties.base_capacity_gal, weeks);
      hours += f.properties.maintenance_hours_per_month;
    });
    countEl.textContent = c;
    gallonsEl.textContent = formatNum(gallons);
    hoursEl.textContent = hours.toFixed(1);
    avgEl.textContent = c ? formatNum(gallons / c) : '0';
    weeksValue.textContent = weeks;
  }

  function refreshSelectedLayer() {
    if (mapScenario && mapScenario.getLayer('gardens-selected')) {
      mapScenario.setFilter('gardens-selected', ['in', ['get', 'asset_id'], ['literal', Array.from(selectedIds)]]);
    }
  }

  function setSelection(ids, mode) {
    if (mode === 'replace') selectedIds.clear();
    ids.forEach(id => selectedIds.add(id));
    refreshSelectedLayer();
    updateSummary();
  }

  function toggleSelection(id) {
    const mode = getMode();
    if (mode === 'replace') {
      selectedIds.clear();
      selectedIds.add(id);
    } else {
      if (selectedIds.has(id)) selectedIds.delete(id);
      else selectedIds.add(id);
    }
    refreshSelectedLayer();
    updateSummary();
  }

  function populateDropdowns() {
    const councils = new Set();
    const communities = new Set();
    features.forEach(f => {
      const c = f.properties.council_dist;
      const cm = f.properties.community_dist;
      if (c != null && Number.isFinite(Number(c))) councils.add(Math.round(Number(c)));
      if (cm != null && Number.isFinite(Number(cm))) {
        const cmNum = Math.round(Number(cm));
        if (cmNum !== 481 && cmNum !== 482) communities.add(cmNum);
      }
    });
    
    [...councils].sort((a, b) => a - b).forEach(val => {
      const opt = document.createElement('option');
      opt.value = String(val);
      opt.textContent = councilDistrictNames[val] || `District ${val}`;
      councilSelect.appendChild(opt);
    });
    
    [...communities].sort((a, b) => a - b).forEach(val => {
      const opt = document.createElement('option');
      opt.value = String(val);
      opt.textContent = communityDistrictNames[val] || `Community ${val}`;
      communitySelect.appendChild(opt);
    });
  }

  function ensureDefaults(raw) {
    const props = raw.properties || {};
    const councilNum = props.council_dist != null ? Number(props.council_dist) : (props.city_counc != null ? Number(props.city_counc) : null);
    const communityNum = props.community_dist != null ? Number(props.community_dist) : (props.community_ != null ? Number(props.community_) : null);
    const baseCap = props.base_capacity_gal != null ? Number(props.base_capacity_gal) : 2500;
    const maintHrs = props.maintenance_hours_per_month != null ? Number(props.maintenance_hours_per_month) : 3.5;
    return {
      ...raw,
      properties: {
        asset_id: props.asset_id ?? crypto.randomUUID(),
        council_dist: councilNum,
        community_dist: communityNum,
        maintenance_hours_per_month: maintHrs,
        base_capacity_gal: baseCap
      }
    };
  }

  function initMapScenario() {
    mapboxgl.accessToken = 'pk.eyJ1Ijoic3VubmlodSIsImEiOiJjbWQ2bDBwNzcwMThwMm9weTVjc2JuNG90In0.sVXA1xGrFWnG-1ZV_EyO1w';
    mapScenario = new mapboxgl.Map({
      container: 'map-scenario',
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-73.8298, 40.73],
      zoom: 11
    });

    mapScenario.addControl(new mapboxgl.NavigationControl(), 'top-right');

    mapScenario.on('load', () => {
      fetch('data/processed/gi-surface-queens.geojson')
        .then(r => r.json())
        .then(data => {
          features = (data.features || [])
            .filter(f => f.geometry && f.geometry.type === 'Point')
            .map(ensureDefaults);

          mapScenario.addSource('gardens', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features }
          });

          mapScenario.addLayer({
            id: 'gardens-base',
            type: 'circle',
            source: 'gardens',
            paint: {
              'circle-radius': 6,
              'circle-color': '#0ea5e9',
              'circle-stroke-color': '#0b759e',
              'circle-stroke-width': 1,
              'circle-opacity': 0.7
            }
          });

          mapScenario.addLayer({
            id: 'gardens-selected',
            type: 'circle',
            source: 'gardens',
            filter: ['in', ['get', 'asset_id'], ['literal', []]],
            paint: {
              'circle-radius': 8,
              'circle-color': '#22c55e',
              'circle-stroke-color': '#15803d',
              'circle-stroke-width': 2,
              'circle-opacity': 0.95
            }
          });

          mapScenario.on('click', 'gardens-base', e => {
            const f = e.features?.[0];
            if (!f) return;
            toggleSelection(f.properties.asset_id);
          });

          populateDropdowns();
          updateSummary();

          // Event listeners
          weeksRange.addEventListener('input', updateSummary);

          councilSelect.addEventListener('change', e => {
            const val = e.target.value;
            if (!val) return;
            const num = Number(val);
            const ids = features.filter(f => Math.round(Number(f.properties.council_dist)) === num).map(f => f.properties.asset_id);
            setSelection(ids, getMode());
          });

          communitySelect.addEventListener('change', e => {
            const val = e.target.value;
            if (!val) return;
            const num = Number(val);
            const ids = features.filter(f => Math.round(Number(f.properties.community_dist)) === num).map(f => f.properties.asset_id);
            setSelection(ids, getMode());
          });

          clearBtn.addEventListener('click', () => {
            selectedIds.clear();
            refreshSelectedLayer();
            updateSummary();
          });
        })
        .catch(err => console.error('Failed to load GeoJSON', err));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMapScenario);
  } else {
    initMapScenario();
  }
})();