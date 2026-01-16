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

