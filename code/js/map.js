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

    // load data from country arrivals dataset
    const countriesData = await fetch("../data/clean/countries.csv");
    const countriesCsv = await countriesData.text();
    const arrivals = d3.csvParse(countriesCsv);
    const arrivalsMap = new Map(
      arrivals.map((d) => [d.iso_code.toLowerCase(), d])
    );
    const arrivalsRange = d3.extent(arrivals, (d) => {
      if (!d.iso_code) return null;
      var value = 0;
      for (let year = 2020; year >= 1995; year--) {
        if (d[year.toString()] > value) {
          value = +d[year.toString()];
        }
      }
      return isNaN(value) ? null : value;
    });
    
    geojson.features.forEach((feature, i) => {
      const p = feature.properties || (feature.properties = {});
      const arrivalsData = arrivalsMap.get(p.cca2);

      p.display_name =
        p.name ||
        p.NAME ||
        p.ADMIN ||
        p.shapeName ||
        arrivalsData?.name ||
        `Country ${i + 1}`;

      p.arrival_count = null;
      for (let year = 2020; year >= 1995; year--) {
        if (arrivalsData?.[year.toString()] > p.arrival_count) {
          p.arrival_count = +arrivalsData[year.toString()];
          p.year = year;
        }
      }
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
          ["get", "arrival_count"],
          arrivalsRange[0], "#fde0ef",
          arrivalsRange[1], "#7a0177"
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
          Arrivals: ${new Intl.NumberFormat("de-DE").format(props.arrival_count)}<br>
          Year: ${props.year}
        `)
        .addTo(map);
    });

    map.on("mouseleave", "countries-fill", () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });
  });
}