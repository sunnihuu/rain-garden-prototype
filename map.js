document.addEventListener("DOMContentLoaded", () => {
	const TOKEN = "pk.eyJ1Ijoic3VubmlodSIsImEiOiJjbWQ2bDBwNzcwMThwMm9weTVjc2JuNG90In0.sVXA1xGrFWnG-1ZV_EyO1w";

	const container = document.getElementById("map");
	if (!container) {
		console.error("Map container #map not found in DOM.");
		return;
	}
	if (!window.mapboxgl) {
		console.error("Mapbox GL JS is not loaded. Check the CDN script tag.");
		return;
	}

	mapboxgl.accessToken = TOKEN;

	const osmFallbackStyle = {
		version: 8,
		sources: {
			osm: {
				type: "raster",
				tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
				tileSize: 256,
				attribution: "© OpenStreetMap contributors"
			}
		},
		layers: [{ id: "osm", type: "raster", source: "osm" }]
	};

	const map = new mapboxgl.Map({
		container,
		style: "mapbox://styles/mapbox/light-v11",
		center: [-73.83, 40.72],
		zoom: 11,
		attributionControl: true
	});

	map.addControl(new mapboxgl.NavigationControl({ showCompass: true, showZoom: true }), "top-right");
	map.addControl(new mapboxgl.ScaleControl({ maxWidth: 120, unit: "imperial" }));

	map.once("load", () => {
		// Ensure the map fills the viewport in case initial layout was off.
		map.resize();

		// Load GI surface distribution Shapefile (Queens) and add as GeoJSON layer
		const shpPath = "data/processed/gi-surface-distribution/gi-surface-queens.shp";
		if (!window.shp) {
			console.error("shpjs is not loaded; cannot read Shapefile. Check the CDN tag.");
			return;
		}

		shp(shpPath)
			.then((geojson) => {
				if (!geojson || !geojson.features || geojson.features.length === 0) {
					console.warn("GI surface distribution returned empty GeoJSON.");
					return;
				}

				// Compute bounds to fit the layer
				const bounds = new mapboxgl.LngLatBounds();
				for (const f of geojson.features) {
					const geom = f.geometry;
					if (!geom) continue;
					const type = geom.type;
					const coords = geom.coordinates;
					const addCoord = (c) => bounds.extend(c);
					const walk = (arr) => {
						if (!arr) return;
						if (typeof arr[0] === "number") addCoord(arr);
						else arr.forEach(walk);
					};
					walk(coords);
				}

				if (!map.getSource("gi-surface-distribution")) {
					map.addSource("gi-surface-distribution", { type: "geojson", data: geojson });
				}

				// Fill layer
				if (!map.getLayer("gi-surface-fill")) {
					map.addLayer({
						id: "gi-surface-fill",
						type: "fill",
						source: "gi-surface-distribution",
						paint: {
							"fill-color": "#2ecc71",
							"fill-opacity": 0.35
						}
					});
				}

				// Outline layer
				if (!map.getLayer("gi-surface-outline")) {
					map.addLayer({
						id: "gi-surface-outline",
						type: "line",
						source: "gi-surface-distribution",
						paint: {
							"line-color": "#1f8e54",
							"line-width": 1
						}
					});
				}

				// Fit to layer bounds with padding
				if (bounds && bounds.isEmpty && !bounds.isEmpty()) {
					map.fitBounds(bounds, { padding: 24, duration: 600 });
				}
			})
			.catch((err) => {
				console.error("Failed to load GI surface distribution Shapefile:", err);
			});
	});

	// If the Mapbox style fails to load (e.g., auth/network), fall back to OSM raster.
	let fellBack = false;
	map.on("error", (e) => {
		const msg = e && e.error && (e.error.message || String(e.error)) || "";
		if (!fellBack && (/unauthorized|forbidden|token|style/i).test(msg)) {
			fellBack = true;
			console.warn("Mapbox style error detected; falling back to OSM raster.", msg);
			map.setStyle(osmFallbackStyle);
		}
	});
});

