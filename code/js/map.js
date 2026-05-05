function initMap() {
  if (window.dashboardMap) return;

  const map = new maplibregl.Map({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: [10, 25],
    zoom: 1.5,
    maxZoom: 5
  });

  window.dashboardMap = map;

  map.on("load", async () => {
    const response = await fetch("../data/geojson/countries.geojson");
    const geojson = await response.json();

    geojson.features.forEach((feature, i) => {
      const p = feature.properties || (feature.properties = {});

      p.display_name =
        p.name ||
        p.NAME ||
        p.ADMIN ||
        p.shapeName ||
        `Country ${i + 1}`;

      p.dummy_score = 40 + ((i * 7) % 61);
    });

    map.addSource("countries", {
      type: "geojson",
      data: geojson
    });

    map.addLayer({
      id: "countries-fill",
      type: "fill",
      source: "countries",
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["get", "dummy_score"],
          40, "#fde0ef",
          70, "#c51b8a",
          100, "#7a0177"
        ],
        "fill-opacity": 0.65
      }
    });

    map.addLayer({
      id: "countries-outline",
      type: "line",
      source: "countries",
      paint: {
        "line-color": "#555",
        "line-width": 0.7
      }
    });

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false
    });

    map.on("mousemove", "countries-fill", (e) => {
      const props = e.features[0].properties;
      map.getCanvas().style.cursor = "pointer";

      popup
        .setLngLat(e.lngLat)
        .setHTML(`
          <strong>${props.display_name}</strong><br>
          Score: ${props.dummy_score}
        `)
        .addTo(map);
    });

    map.on("mouseleave", "countries-fill", () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });
  });
}