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
  const assetTypeSelect = document.getElementById('assetTypeSelect');
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

  function getInfiltrationQuality(rate) {
    if (!Number.isFinite(rate) || rate <= 0) return null;
    if (rate >= 0.5) return { label: 'Excellent', color: '#22c55e', desc: 'Fast drainage — ideal for rain gardens' };
    if (rate >= 0.3) return { label: 'Good', color: '#84cc16', desc: 'Moderate drainage — performs well' };
    if (rate >= 0.1) return { label: 'Fair', color: '#f59e0b', desc: 'Slower drainage — may need maintenance' };
    return { label: 'Poor', color: '#ef4444', desc: 'Very slow drainage — check for clogging' };
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
    updateImpactMessage(weeks, gallons, c);
    updateConditionsSummary();
    updateInsights(weeks, gallons, c);
    updateFeatureDetails();
  }

  function updateInsights(weeks, gallons, count) {
    const section = document.getElementById('insights-section');
    const content = document.getElementById('insights-content');
    
    if (!section || !content) return;
    
    if (count === 0) {
      section.style.display = 'none';
      return;
    }
    
    const insights = [];
    
    // Calculate base capacity for comparison
    let baseCapacity = 0;
    features.forEach(f => {
      if (!selectedIds.has(f.properties.asset_id)) return;
      baseCapacity += f.properties.base_capacity_gal;
    });
    
    const lossPercent = baseCapacity > 0 ? ((baseCapacity - gallons) / baseCapacity * 100) : 0;
    
    if (weeks === 0) {
      insights.push('• <strong>Routine maintenance maximizes performance.</strong> These gardens are operating at full capacity.');
      if (count >= 10) {
        insights.push('• <strong>Small, distributed actions compound at scale.</strong> Maintaining ' + count + ' gardens has significant collective impact.');
      }
    } else if (weeks <= 2) {
      insights.push(`• <strong>Early delays are recoverable.</strong> Performance has dropped ${lossPercent.toFixed(0)}%, but a quick response prevents deeper degradation.`);
    } else if (weeks <= 5) {
      insights.push(`• <strong>Delayed maintenance cuts performance significantly.</strong> These gardens have lost ${lossPercent.toFixed(0)}% of their capacity.`);
      insights.push('• <strong>Routine maintenance has a larger impact than adding new gardens.</strong> Preserving existing infrastructure is key.');
    } else {
      insights.push(`• <strong>Delayed maintenance cuts performance by up to ${lossPercent.toFixed(0)}%.</strong> At this stage, gardens operate at minimum capacity.`);
      insights.push('• <strong>Long delays require intervention, not just routine care.</strong> Restoration may be needed before normal performance resumes.');
    }
    
    // Add district-scale insight if many gardens selected
    if (count >= 50) {
      insights.push('• <strong>This selection shows district-scale potential.</strong> Coordinated maintenance across neighborhoods amplifies individual efforts.');
    }
    
    content.innerHTML = '<ul style="margin: 0; padding-left: 18px;">' + 
      insights.map(i => `<li style="margin-bottom: 8px;">${i}</li>`).join('') + 
      '</ul>';
    section.style.display = 'block';
  }

  function updateImpactMessage(weeks, gallons, count) {
    const section = document.getElementById('impact-message-section');
    const textEl = document.getElementById('impact-message-text');
    const valueEl = document.getElementById('impact-message-value');
    
    if (!section || !textEl || !valueEl) return;
    
    if (count === 0) {
      section.style.display = 'none';
      return;
    }
    
    // Calculate base capacity (week 0) for loss comparison
    let baseCapacity = 0;
    features.forEach(f => {
      if (!selectedIds.has(f.properties.asset_id)) return;
      baseCapacity += f.properties.base_capacity_gal;
    });
    
    const lostCapacity = baseCapacity - gallons;
    
    // Human-scale translation
    function translateGallons(gal) {
      if (gal >= 10000) {
        return 'This can ease pressure on streets, basements, and ground-floor apartments across the neighborhood during heavy rain.';
      } else if (gal >= 1000) {
        return 'This can ease pressure on nearby basements and ground-floor apartments during heavy rain.';
      } else if (gal >= 100) {
        return 'This can help reduce localized flooding during heavy rain.';
      } else {
        return 'Every bit helps reduce strain on the drainage system.';
      }
    }
    
    if (weeks === 0) {
      textEl.textContent = 'If you maintained these rain gardens this week, you would divert:';
      valueEl.innerHTML = `
        <div>${formatNum(gallons)} gallons of stormwater</div>
        <div style="font-size: 13px; font-weight: 400; margin-top: 8px; line-height: 1.5; color: rgba(255,255,255,0.95);">
          ${translateGallons(gallons)}
        </div>
      `;
    } else {
      textEl.textContent = `If maintenance were delayed ${weeks} week${weeks > 1 ? 's' : ''}, diverted water drops to:`;
      valueEl.innerHTML = `
        <div>${formatNum(gallons)} gallons of stormwater</div>
        <div style="font-size: 13px; font-weight: 400; margin-top: 8px; line-height: 1.5; color: rgba(255,255,255,0.95);">
          ${translateGallons(gallons)}
        </div>
        <div style="font-size: 16px; font-weight: 600; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.3); color: #fcd34d;">
          Water lost due to delayed maintenance:<br>
          <span style="font-size: 22px; font-weight: 700;">${formatNum(lostCapacity)} gallons</span>
        </div>
      `;
    }
    
    section.style.display = 'block';
  }

  function updateConditionsSummary() {
    const conditionsSection = document.getElementById('conditions-section');
    const conditionsSummary = document.getElementById('conditions-summary');
    
    if (!conditionsSection || !conditionsSummary) return;

    if (selectedIds.size === 0) {
      conditionsSection.style.display = 'none';
      return;
    }

    const selectedFeatures = features.filter(f => selectedIds.has(f.properties.asset_id));
    
    // Calculate average infiltration rate
    const infilRates = selectedFeatures
      .map(f => f.properties.effective_infiltration_inhr)
      .filter(v => v != null && Number.isFinite(v) && v > 0);
    
    const avgInfil = infilRates.length > 0 
      ? infilRates.reduce((sum, v) => sum + v, 0) / infilRates.length
      : null;

    let html = '';
    
    if (selectedIds.size === 1) {
      html += '<div class="summary-title">Single Asset</div>';
    } else {
      html += `<div class="summary-title">${selectedIds.size} Assets Selected</div>`;
    }

    if (avgInfil != null) {
      const quality = getInfiltrationQuality(avgInfil);
      html += `
        <div class="summary-stat">
          <span class="stat-label">${selectedIds.size === 1 ? 'Infiltration Rate' : 'Avg Infiltration Rate'}:</span>
          <span class="stat-value">${avgInfil.toFixed(3)} in/hr</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px; padding: 8px; background: ${quality.color}15; border-left: 3px solid ${quality.color}; border-radius: 4px;">
          <div style="width: 12px; height: 12px; border-radius: 50%; background: ${quality.color};"></div>
          <div style="flex: 1;">
            <div style="font-weight: 600; color: ${quality.color}; font-size: 13px;">${quality.label} Drainage</div>
            <div style="font-size: 11px; color: #555; margin-top: 2px;">${quality.desc}</div>
          </div>
        </div>
      `;
    }

    if (infilRates.length > 0 && infilRates.length < selectedIds.size) {
      html += `
        <small class="muted" style="display: block; margin-top: 8px; line-height: 1.4;">
          ${infilRates.length} of ${selectedIds.size} assets have infiltration data.
        </small>
      `;
      conditionsSummary.innerHTML = html;
      conditionsSection.style.display = 'block';
    } else if (infilRates.length === 0) {
      // Hide section entirely if no infiltration data
      conditionsSection.style.display = 'none';
    } else {
      conditionsSummary.innerHTML = html;
      conditionsSection.style.display = 'block';
    }
  }

  function updateFeatureDetails() {
    const featureInfoDiv = document.getElementById('feature-info');
    if (!featureInfoDiv) return;

    if (selectedIds.size === 0) {
      featureInfoDiv.innerHTML = '<p class="muted">Select assets on the map to see details</p>';
      return;
    }

    const selectedFeatures = features.filter(f => selectedIds.has(f.properties.asset_id));
    
    let html = '<div style="max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px;">';

    selectedFeatures.forEach(f => {
      const props = f.properties;
      const quality = getInfiltrationQuality(props.effective_infiltration_inhr);
      html += `
        <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <strong style="color: #0f172a; font-size: 13px;">${props.asset_type || 'Rain Garden'}</strong>
            <span style="font-size: 11px; color: #6b7280;">ID: ${props.asset_id}</span>
          </div>
          <div style="display: grid; grid-template-columns: 120px 1fr; row-gap: 6px; column-gap: 10px; font-size: 12px; color: #111827;">
            ${props.asset_area ? `<div style="color:#6b7280;">Area</div><div>${Math.round(props.asset_area)} sq ft</div>` : ''}
            ${props.base_capacity_gal ? `<div style="color:#6b7280;">Base Capacity</div><div>${props.base_capacity_gal.toLocaleString()} gal</div>` : ''}
            ${props.maintenance_hours_per_month ? `<div style="color:#6b7280;">Maintenance</div><div>${props.maintenance_hours_per_month} hrs/mo</div>` : ''}
            ${props.council_dist ? `<div style="color:#6b7280;">Council District</div><div>${Math.round(props.council_dist)}</div>` : ''}
            ${props.community_district ? `<div style="color:#6b7280;">Community District</div><div>${props.community_district}</div>` : ''}
          </div>
          ${quality ? `
            <div style="display: flex; align-items: center; gap: 6px; margin-top: 10px; padding: 6px 8px; background: ${quality.color}15; border-left: 3px solid ${quality.color}; border-radius: 4px;">
              <div style="width: 8px; height: 8px; border-radius: 50%; background: ${quality.color}; flex-shrink: 0;"></div>
              <div style="flex: 1;">
                <div style="font-weight: 600; color: ${quality.color}; font-size: 11px;">${quality.label} Drainage</div>
                <div style="font-size: 10px; color: #555; margin-top: 1px;">${props.effective_infiltration_inhr.toFixed(3)} in/hr — ${quality.desc}</div>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    });

    html += '</div>';
    featureInfoDiv.innerHTML = html;
  }

  function updateDistrictSummary(councilDist = null, communityDist = null) {
    const districtSummarySection = document.getElementById('district-summary-section');
    const districtSummaryDiv = document.getElementById('district-summary');
    
    if (!districtSummarySection || !districtSummaryDiv) return;

    if (!councilDist && !communityDist) {
      districtSummarySection.style.display = 'none';
      return;
    }

    // Filter features by district
    let districtFeatures = features;
    let districtName = '';
    
    if (councilDist && communityDist) {
      districtFeatures = features.filter(f => 
        Math.round(Number(f.properties.council_dist)) === councilDist &&
        f.properties.community_district === communityDist
      );
      districtName = `Council District ${councilDist} / Community District ${communityDist}`;
    } else if (councilDist) {
      districtFeatures = features.filter(f => 
        Math.round(Number(f.properties.council_dist)) === councilDist
      );
      districtName = `City Council District ${councilDist}`;
    } else if (communityDist) {
      districtFeatures = features.filter(f => 
        Math.round(Number(f.properties.community_dist)) === communityDist
      );
      districtName = `Community District ${communityDist}`;
    }

    // Calculate statistics
    const totalAssets = districtFeatures.length;
    const totalArea = districtFeatures.reduce((sum, f) => sum + (f.properties.asset_area || 0), 0);
    const totalCapacity = districtFeatures.reduce((sum, f) => sum + (f.properties.base_capacity_gal || 0), 0);
    const totalMaintenance = districtFeatures.reduce((sum, f) => sum + (f.properties.maintenance_hours_per_month || 0), 0);
    
    // Count by asset type
    const assetTypes = {};
    districtFeatures.forEach(f => {
      const type = f.properties.asset_type || 'Unknown';
      assetTypes[type] = (assetTypes[type] || 0) + 1;
    });

    // Build HTML
    let html = `
      <div class="summary-title">${districtName}</div>
    `;
    
    // Add collective framing
    const districtNum = councilDist || communityDist;
    const districtType = councilDist ? 'District' : 'Community District';
    html += `
      <div style="background: #f0f9ff; border-left: 3px solid #0ea5e9; padding: 12px; margin: 12px 0; border-radius: 4px;">
        <div style="font-weight: 600; font-size: 13px; color: #0369a1; margin-bottom: 4px;">Collective Potential</div>
        <div style="font-size: 12px; color: #0c4a6e; line-height: 1.5;">
          If every rain garden in ${districtType} ${districtNum} were maintained this week:<br>
          <strong style="font-size: 14px; color: #0284c7;">≈ ${formatNum(totalCapacity)} gallons</strong> could be diverted per storm
        </div>
      </div>
    `;
    
    html += `
      <div class="summary-stat">
        <span class="stat-label">Total Assets:</span>
        <span class="stat-value">${totalAssets}</span>
      </div>
      <div class="summary-stat">
        <span class="stat-label">Total Area:</span>
        <span class="stat-value">${formatNum(totalArea)} sq ft</span>
      </div>
      <div class="summary-stat">
        <span class="stat-label">Total Capacity:</span>
        <span class="stat-value">${formatNum(totalCapacity)} gal</span>
      </div>
      <div class="summary-stat">
        <span class="stat-label">Total Maintenance:</span>
        <span class="stat-value">${totalMaintenance.toFixed(1)} hrs/mo</span>
      </div>
    `;

    // Add asset type breakdown if there are multiple types
    if (Object.keys(assetTypes).length > 1) {
      html += '<div class="asset-type-breakdown">';
      html += '<div style="font-weight: 700; margin-bottom: 6px; font-size: 12px; color: #555;">Asset Types:</div>';
      Object.entries(assetTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
        html += `
          <div class="asset-type-item">
            <span class="type-name">${type}</span>
            <span class="type-count">${count}</span>
          </div>
        `;
      });
      html += '</div>';
    }

    districtSummaryDiv.innerHTML = html;
    districtSummarySection.style.display = 'block';
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
    const assetTypes = new Set();
    const isRainGardenType = t => t === 'Rain Garden' || (typeof t === 'string' && t.startsWith('ROW'));
    const labelAssetType = t => {
      if (t === 'Rain Garden') return 'Rain Garden';
      if (typeof t === 'string' && t.startsWith('ROW')) return `Street/ROW (curbside) — ${t}`;
      return t;
    };
    features.forEach(f => {
      const c = f.properties.council_dist;
      const cm = f.properties.community_dist;
      const t = f.properties.asset_type;
      if (c != null && Number.isFinite(Number(c))) councils.add(Math.round(Number(c)));
      if (cm != null && Number.isFinite(Number(cm))) {
        const cmNum = Math.round(Number(cm));
        if (cmNum !== 481 && cmNum !== 482) communities.add(cmNum);
      }
      if (t && isRainGardenType(t)) assetTypes.add(t);
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

    [...assetTypes].sort().forEach(val => {
      const opt = document.createElement('option');
      opt.value = String(val);
      opt.textContent = labelAssetType(val);
      assetTypeSelect.appendChild(opt);
    });
  }

  function getFilters() {
    const councilDist = councilSelect.value ? Number(councilSelect.value) : null;
    const communityDist = communitySelect.value ? Number(communitySelect.value) : null;
    const assetType = assetTypeSelect.value || null;
    return { councilDist, communityDist, assetType };
  }

  function applyFiltersSelection() {
    const { councilDist, communityDist, assetType } = getFilters();
    updateDistrictSummary(councilDist, communityDist);

    if (!councilDist && !communityDist && !assetType) return;

    const ids = features
      .filter(f => {
        const cMatch = councilDist ? Math.round(Number(f.properties.council_dist)) === councilDist : true;
        const cmMatch = communityDist ? Math.round(Number(f.properties.community_dist)) === communityDist : true;
        const tMatch = assetType ? f.properties.asset_type === assetType : true;
        return cMatch && cmMatch && tMatch;
      })
      .map(f => f.properties.asset_id);

    setSelection(ids, getMode());
  }

  function ensureDefaults(raw) {
    const props = raw.properties || {};
    const councilNum = props.council_dist != null ? Number(props.council_dist) : (props.city_counc != null ? Number(props.city_counc) : null);
    const communityNum = props.community_dist != null ? Number(props.community_dist) : (props.community_ != null ? Number(props.community_) : null);
    const gallons2025 = props['2025_gallons_saved'] != null ? Number(props['2025_gallons_saved']) : null;
    const infilRate = props.effective_infiltration_inhr != null ? Number(props.effective_infiltration_inhr) : null;
    const area = props.asset_area != null ? Number(props.asset_area) : null;
    const pondingDepthFt = 0.5; // 6 inches of ponding depth

    let baseCap = 2500;
    if (Number.isFinite(gallons2025) && gallons2025 > 0) {
      baseCap = gallons2025;
    } else if (Number.isFinite(infilRate) && Number.isFinite(area) && infilRate > 0 && area > 0) {
      // Convert infiltration (in/hr) * area (sq ft) -> gallons per hour
      const cubicFeetPerHour = area * (infilRate / 12);
      baseCap = cubicFeetPerHour * 7.48052;
    } else if (Number.isFinite(area) && area > 0) {
      // Ponding-only estimate using 6 in depth when infiltration data is missing
      const cubicFeet = area * pondingDepthFt;
      baseCap = cubicFeet * 7.48052;
    } else if (props.base_capacity_gal != null) {
      baseCap = Number(props.base_capacity_gal);
    }

    const maintHrs = props.maintenance_hours_per_month != null
      ? Number(props.maintenance_hours_per_month)
      : (Number.isFinite(area) && area > 0
          ? (area <= 1000 ? 3 : 4) // 36 hrs/yr for <=1000 sq ft, 48 hrs/yr for larger
          : 3.5);

    const nextProps = {
      ...props,
      asset_id: props.asset_id ?? crypto.randomUUID(),
      council_dist: councilNum,
      community_dist: communityNum,
      asset_area: area,
      maintenance_hours_per_month: maintHrs,
      base_capacity_gal: baseCap,
      effective_infiltration_inhr: infilRate,
      gallons_saved_2025: gallons2025
    };

    return { ...raw, properties: nextProps };
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
    mapScenario.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true
    }), 'top-right');

    mapScenario.on('load', () => {
      fetch('data/processed/gi-surface-queens-RG-2025-totals.geojson')
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

          // Create popup for detailed information
          const assetPopup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: false,
            maxWidth: '350px'
          });

          mapScenario.on('click', 'gardens-base', e => {
            const f = e.features?.[0];
            if (!f) return;
            
            const props = f.properties;
            const coords = f.geometry.coordinates;
            
            // Build detailed info HTML
            let html = `
              <div style="font-family: 'League Spartan', sans-serif;">
                <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #1a1a1a;">
                  ${props.asset_type || 'Rain Garden'}
                </h3>
                <div style="display: grid; gap: 8px; font-size: 13px;">
            `;
            
            if (props.asset_id) {
              html += `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                  <strong style="color: #555;">Asset ID:</strong>
                  <span style="color: #1a1a1a;">${props.asset_id}</span>
                </div>
              `;
            }
            
            if (props.asset_area) {
              html += `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                  <strong style="color: #555;">Area:</strong>
                  <span style="color: #1a1a1a;">${Math.round(props.asset_area)} sq ft</span>
                </div>
              `;
            }
            
            if (props.base_capacity_gal) {
              html += `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                  <strong style="color: #555;">Base Capacity:</strong>
                  <span style="color: #1a1a1a;">${props.base_capacity_gal.toLocaleString()} gal</span>
                </div>
              `;
            }

            if (props.gallons_saved_2025) {
              html += `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                  <strong style="color: #555;">2025 Gallons Saved:</strong>
                  <span style="color: #1a1a1a;">${props.gallons_saved_2025.toLocaleString()}</span>
                </div>
              `;
            }

            if (props.effective_infiltration_inhr) {
              const quality = getInfiltrationQuality(props.effective_infiltration_inhr);
              html += `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                  <strong style="color: #555;">Infiltration Rate:</strong>
                  <span style="color: #1a1a1a;">${props.effective_infiltration_inhr.toFixed(3)} in/hr</span>
                </div>
              `;
              if (quality) {
                html += `
                  <div style="display: flex; align-items: center; gap: 6px; padding: 8px; margin-top: 4px; background: ${quality.color}15; border-left: 3px solid ${quality.color}; border-radius: 4px;">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background: ${quality.color}; flex-shrink: 0;"></div>
                    <div style="flex: 1;">
                      <div style="font-weight: 600; color: ${quality.color}; font-size: 12px;">${quality.label} Drainage</div>
                      <div style="font-size: 11px; color: #555; margin-top: 2px;">${quality.desc}</div>
                    </div>
                  </div>
                `;
              }
            }
            
            if (props.maintenance_hours_per_month) {
              html += `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                  <strong style="color: #555;">Maintenance:</strong>
                  <span style="color: #1a1a1a;">${props.maintenance_hours_per_month} hrs/mo</span>
                </div>
              `;
            }
            
            if (props.council_dist) {
              html += `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                  <strong style="color: #555;">Council District:</strong>
                  <span style="color: #1a1a1a;">${Math.round(props.council_dist)}</span>
                </div>
              `;
            }
            
            if (props.community_district) {
              html += `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                  <strong style="color: #555;">Community District:</strong>
                  <span style="color: #1a1a1a;">${props.community_district}</span>
                </div>
              `;
            }
            
            html += `
                </div>
                <button id="select-asset-${props.asset_id}" 
                  style="width: 100%; margin-top: 12px; padding: 8px; background: #0ea5e9; color: white; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 13px;"
                  onmouseover="this.style.background='#0284c7'" 
                  onmouseout="this.style.background='#0ea5e9'">
                  ${selectedIds.has(props.asset_id) ? '✓ Selected' : 'Select This Garden'}
                </button>
              </div>
            `;
            
            assetPopup
              .setLngLat(coords)
              .setHTML(html)
              .addTo(mapScenario);
            
            // Add event listener for the select button after popup is added
            setTimeout(() => {
              const btn = document.getElementById(`select-asset-${props.asset_id}`);
              if (btn) {
                btn.addEventListener('click', () => {
                  toggleSelection(props.asset_id);
                  assetPopup.remove();
                });
              }
            }, 0);
          });

          // Change cursor on hover
          mapScenario.on('mouseenter', 'gardens-base', () => {
            mapScenario.getCanvas().style.cursor = 'pointer';
          });

          mapScenario.on('mouseleave', 'gardens-base', () => {
            mapScenario.getCanvas().style.cursor = '';
          });

          populateDropdowns();
          updateSummary();

          // Event listeners
          weeksRange.addEventListener('input', updateSummary);

          councilSelect.addEventListener('change', applyFiltersSelection);

          communitySelect.addEventListener('change', applyFiltersSelection);

          assetTypeSelect.addEventListener('change', applyFiltersSelection);

          clearBtn.addEventListener('click', () => {
            selectedIds.clear();
            councilSelect.value = '';
            communitySelect.value = '';
            assetTypeSelect.value = '';
            refreshSelectedLayer();
            updateSummary();
            updateDistrictSummary(null, null);
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