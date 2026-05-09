const regionMapViews = {
  World: {
    center: [10, 25],
    zoom: 1.5
  },
  Europe: {
    bounds: [[-25, 34], [45, 72]]
  },
  Asia: {
    bounds: [[25, -10], [150, 80]]
  },
  Africa: {
    bounds: [[-20, -35], [55, 38]]
  },
  "North America": {
    bounds: [[-170, 5], [-50, 75]]
  },
  "South America": {
    bounds: [[-82, -56], [-34, 13]]
  },
  Oceania: {
    bounds: [[110, -50], [180, 10]]
  }
};

function focusMapRegion(regionName) {
  const map = window.dashboardMap;
  const view = regionMapViews[regionName];

  if (!map || !view) return;

  const focus = () => {
    map.resize();

    if (view.bounds) {
      map.fitBounds(view.bounds, {
        padding: 40,
        duration: 900
      });
      return;
    }

    map.flyTo({
      center: view.center,
      zoom: view.zoom,
      duration: 900
    });
  };

  if (map.loaded()) {
    focus();
  } else {
    map.once("load", focus);
  }
}

window.focusMapRegion = focusMapRegion;

const heritageLayerIds = [
  "heritage-clusters",
  "heritage-cluster-count",
  "heritage-sites-symbol"
];

function getFilteredHeritageGeojson() {
  const heritageGeojson = window.heritageGeojson || {
    type: "FeatureCollection",
    features: []
  };
  const selectedTypes = window.selectedHeritageTypes || [];

  if (!selectedTypes.length) {
    return {
      type: "FeatureCollection",
      features: []
    };
  }

  return {
    type: "FeatureCollection",
    features: heritageGeojson.features.filter((feature) =>
      selectedTypes.includes(feature.properties.category)
    )
  };
}

function updateHeritageSourceData() {
  const map = window.dashboardMap;
  const source = map?.getSource("heritage-sites");

  if (source) {
    source.setData(getFilteredHeritageGeojson());
  }
}

function setHeritageLocationsVisible(isVisible) {
  window.showHeritageLocations = isVisible;

  const map = window.dashboardMap;
  if (!map) return;

  const visibility = isVisible ? "visible" : "none";

  heritageLayerIds.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  });
}

function setHeritageCategoryFilter(selectedTypes) {
  window.selectedHeritageTypes = selectedTypes;
  updateHeritageSourceData();
}

window.showHeritageLocations = false;
window.selectedHeritageTypes = [];
window.setHeritageLocationsVisible = setHeritageLocationsVisible;
window.setHeritageCategoryFilter = setHeritageCategoryFilter;

window.arrivalYearFilter = {
  showRecent: true,
  startYear: 1995,
  endYear: 2020
};

function getArrivalForFilter(arrivalsData, filter) {
  if (!arrivalsData) return null;

  const startYear = filter.showRecent ? 1995 : Math.min(filter.startYear, filter.endYear);
  const endYear = filter.showRecent ? 2020 : Math.max(filter.startYear, filter.endYear);

  for (let year = endYear; year >= startYear; year--) {
    const value = +arrivalsData[year.toString()];

    if (Number.isFinite(value) && value > 0) {
      return {
        value,
        year
      };
    }
  }

  return null;
}

function applyArrivalFilterToCountries() {
  const map = window.dashboardMap;
  const geojson = window.countriesGeojson;
  const arrivalsMap = window.arrivalsMap;
  const filter = window.arrivalYearFilter;

  if (!map || !geojson || !arrivalsMap || !filter) return;

  const values = [];

  geojson.features.forEach((feature) => {
    const p = feature.properties || (feature.properties = {});
    const arrivalsData = arrivalsMap.get(p.cca2?.toLowerCase());
    const arrival = getArrivalForFilter(arrivalsData, filter);

    p.arrival_count = arrival?.value ?? null;
    p.year = arrival?.year ?? null;

    if (arrival) {
      values.push(arrival.value);
    }
  });

  const arrivalsRange = d3.extent(values);
  const fallbackRange = arrivalsRange[0] === arrivalsRange[1]
    ? [0, arrivalsRange[1] || 1]
    : arrivalsRange;

  if (map.getLayer("countries-fill")) {
    map.setPaintProperty("countries-fill", "fill-color", [
      "case",
      ["==", ["get", "arrival_count"], null],
      "#e5e7eb",
      [
        "interpolate",
        ["linear"],
        ["get", "arrival_count"],
        fallbackRange[0], "#fde0ef",
        fallbackRange[1], "#7a0177"
      ]
    ]);
  }

  const countriesSource = map.getSource("countries");
  if (countriesSource) {
    countriesSource.setData(geojson);
  }
}

function setArrivalYearFilter(nextFilter) {
  window.arrivalYearFilter = {
    ...window.arrivalYearFilter,
    ...nextFilter
  };

  applyArrivalFilterToCountries();
}

window.setArrivalYearFilter = setArrivalYearFilter;

function createHeritagePinImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <path d="M20 3C12.8 3 7 8.8 7 16c0 9.3 13 21 13 21s13-11.7 13-21C33 8.8 27.2 3 20 3Z" fill="#dc2626" stroke="#ffffff" stroke-width="2"/>
      <circle cx="20" cy="16" r="4.5" fill="#ffffff"/>
    </svg>
  `;

  return new Promise((resolve, reject) => {
    const image = new Image(40, 40);

    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

function initMap() {
  if (window.dashboardMap) return;

  const map = new maplibregl.Map({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: [10, 25],
    zoom: 1.5,
    maxZoom: 7
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
    window.arrivalsMap = arrivalsMap;

    const heritageData = await fetch("../data/clean/heritage.csv");
    const heritageCsv = await heritageData.text();
    const heritageSites = d3.csvParse(heritageCsv);
    const heritageGeojson = {
      type: "FeatureCollection",
      features: heritageSites
        .map((site) => {
          const latitude = +site.latitude;
          const longitude = +site.longitude;

          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null;
          }

          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [longitude, latitude]
            },
            properties: {
              name: site.name,
              category: site.category,
              country: site.states_name,
              danger: site.danger
            }
          };
        })
        .filter(Boolean)
    };

    window.heritageGeojson = heritageGeojson;
    
    geojson.features.forEach((feature, i) => {
      const p = feature.properties || (feature.properties = {});
      const arrivalsData = arrivalsMap.get(p.cca2?.toLowerCase());

      p.display_name =
        p.name ||
        p.NAME ||
        p.ADMIN ||
        p.shapeName ||
        arrivalsData?.name ||
        `Country ${i + 1}`;

      const arrival = getArrivalForFilter(arrivalsData, window.arrivalYearFilter);
      p.arrival_count = arrival?.value ?? null;
      p.year = arrival?.year ?? null;
    });

    window.countriesGeojson = geojson;

    map.addSource("countries", {
      type: "geojson",
      data: geojson
    });

    map.addLayer({
      id: "countries-fill",
      type: "fill",
      source: "countries",
      paint: {
        "fill-color": "#e5e7eb",
        "fill-opacity": 0.65
      }
    });

    applyArrivalFilterToCountries();

    map.addLayer({
      id: "countries-outline",
      type: "line",
      source: "countries",
      paint: {
        "line-color": "#555",
        "line-width": 0.7
      }
    });

    if (!map.hasImage("heritage-pin")) {
      const heritagePin = await createHeritagePinImage();
      map.addImage("heritage-pin", heritagePin);
    }

    map.addSource("heritage-sites", {
      type: "geojson",
      data: getFilteredHeritageGeojson(),
      cluster: true,
      clusterMaxZoom: 5,
      clusterRadius: 48
    });

    map.addLayer({
      id: "heritage-clusters",
      type: "circle",
      source: "heritage-sites",
      filter: ["has", "point_count"],
      layout: {
        visibility: window.showHeritageLocations ? "visible" : "none"
      },
      paint: {
        "circle-color": [
          "step",
          ["get", "point_count"],
          "#111827",
          10, "#7f1d1d",
          30, "#dc2626"
        ],
        "circle-radius": [
          "step",
          ["get", "point_count"],
          10,
          10, 15,
          30, 21
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2
      }
    });

    map.addLayer({
      id: "heritage-cluster-count",
      type: "symbol",
      source: "heritage-sites",
      filter: ["has", "point_count"],
      layout: {
        visibility: window.showHeritageLocations ? "visible" : "none",
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        "text-size": 12
      },
      paint: {
        "text-color": "#ffffff"
      }
    });

    map.addLayer({
      id: "heritage-sites-symbol",
      type: "symbol",
      source: "heritage-sites",
      filter: ["!", ["has", "point_count"]],
      layout: {
        visibility: window.showHeritageLocations ? "visible" : "none",
        "icon-image": "heritage-pin",
        "icon-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          1, 0.32,
          7, 0.62
        ],
        "icon-anchor": "bottom",
        "icon-allow-overlap": true
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
          Arrivals: ${props.arrival_count ? new Intl.NumberFormat("de-DE").format(props.arrival_count) : "N/A"}<br>
          Year: ${props.year || "N/A"}
        `)
        .addTo(map);
    });

    map.on("mouseleave", "countries-fill", () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });

    map.on("click", "heritage-clusters", async (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["heritage-clusters"]
      });
      if (!features.length) return;

      const clusterId = features[0].properties.cluster_id;
      const source = map.getSource("heritage-sites");
      const focusCluster = (zoom) => {
        map.easeTo({
          center: features[0].geometry.coordinates,
          zoom
        });
      };

      const expansionZoom = source.getClusterExpansionZoom(clusterId, (error, zoom) => {
        if (!error) {
          focusCluster(zoom);
        }
      });

      if (expansionZoom && typeof expansionZoom.then === "function") {
        focusCluster(await expansionZoom);
      }
    });

    map.on("mousemove", "heritage-clusters", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "heritage-clusters", () => {
      map.getCanvas().style.cursor = "";
    });

    map.on("mousemove", "heritage-sites-symbol", (e) => {
      const props = e.features[0].properties;
      map.getCanvas().style.cursor = "pointer";

      popup
        .setLngLat(e.features[0].geometry.coordinates)
        .setHTML(`
          <strong>${props.name}</strong><br>
          Category: ${props.category}<br>
          Country: ${props.country}
        `)
        .addTo(map);
    });

    map.on("mouseleave", "heritage-sites-symbol", () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });
  });
}
