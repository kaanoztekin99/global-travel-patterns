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

function getFilteredHeritageGeojson() {
  const heritageGeojson = window.heritageGeojson || {
    type: "FeatureCollection",
    features: []
  };
  const selectedTypes = window.selectedHeritageTypes || [];
  const includeDangerSites = window.includeDangerHeritageSites || false;

  if (!selectedTypes.length) {
    return {
      type: "FeatureCollection",
      features: []
    };
  }

  return {
    type: "FeatureCollection",
    features: heritageGeojson.features.filter((feature) =>
      selectedTypes.includes(feature.properties.category) &&
      (includeDangerSites || feature.properties.danger === "0")
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

function setHeritageCategoryFilter(selectedTypes) {
  window.selectedHeritageTypes = selectedTypes;
  updateHeritageSourceData();
}

function setDangerHeritageFilter(includeDangerSites) {
  window.includeDangerHeritageSites = includeDangerSites;
  updateHeritageSourceData();
}

window.selectedHeritageTypes = [];
window.setHeritageCategoryFilter = setHeritageCategoryFilter;
window.includeDangerHeritageSites = false;
window.setDangerHeritageFilter = setDangerHeritageFilter;
window.countrySelectionMode = false;
window.selectedCountryCodes = [];

window.arrivalYearFilter = {
  showRecent: true,
  showRecord: false,
  startYear: 1995,
  endYear: 2020
};

function getArrivalForFilter(arrivalsData, filter) {
  if (!arrivalsData) return null;

  const startYear = filter.showRecent ? 1995 : Math.min(filter.startYear, filter.endYear);
  const endYear = filter.showRecent ? 2020 : Math.max(filter.startYear, filter.endYear);
  let recordArrival = null;

  if (filter.showRecord) {
    for (let year = 1995; year <= 2020; year++) {
      const value = +arrivalsData[year.toString()];

      if (!Number.isFinite(value) || value <= 0) continue;

      if (!recordArrival || value > recordArrival.value) {
        recordArrival = {
          value,
          year
        };
      }
    }

    return recordArrival;
  }

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

function getSelectedCountriesFilter() {
  return ["in", ["get", "cca2"], ["literal", window.selectedCountryCodes || []]];
}

function updateSelectedCountryLayers() {
  const map = window.dashboardMap;
  const filter = getSelectedCountriesFilter();

  if (map?.getLayer("countries-selected-fill")) {
    map.setFilter("countries-selected-fill", filter);
  }

  if (map?.getLayer("countries-selected-outline")) {
    map.setFilter("countries-selected-outline", filter);
  }
}

function addCountryCodesToSelection(countryCodes) {
  const selectedCodes = new Set(window.selectedCountryCodes || []);

  countryCodes.forEach((countryCode) => {
    if (countryCode) {
      selectedCodes.add(countryCode);
    }
  });

  window.selectedCountryCodes = [...selectedCodes];
  updateSelectedCountryLayers();
}

function toggleCountrySelection(countryCode) {
  if (!countryCode) return;

  const selectedCodes = window.selectedCountryCodes || [];
  const isSelected = selectedCodes.includes(countryCode);

  window.selectedCountryCodes = isSelected
    ? selectedCodes.filter((code) => code !== countryCode)
    : [...selectedCodes, countryCode];

  updateSelectedCountryLayers();
}

function clearSelectedCountries() {
  window.selectedCountryCodes = [];
  updateSelectedCountryLayers();
}

function setCountrySelectionMode(isActive) {
  window.countrySelectionMode = isActive;

  const map = window.dashboardMap;
  if (!map) return;

  if (isActive) {
    map.dragPan.disable();
    map.getCanvas().style.cursor = "crosshair";
  } else {
    map.dragPan.enable();
    map.getCanvas().style.cursor = "";
  }
}

window.setCountrySelectionMode = setCountrySelectionMode;
window.clearSelectedCountries = clearSelectedCountries;

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

// Strip CSV-provided HTML so popup descriptions render as plain text.
function getTextFromHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html || "";

  return (template.content.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
}

// Escape dynamic popup text before inserting it into HTML strings.
function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value || "";

  return element.innerHTML;
}

// Keep the initial heritage popup compact before the user expands it.
function getTextExcerpt(text, maxLength = 160) {
  if (!text) return "No description available.";
  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength).trim()}...`;
}

function initMap() {
  if (window.dashboardMap) return;

  const map = new maplibregl.Map({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: [10, 25],
    zoom: 1.5,
    maxZoom: 7,
    attributionControl: false
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
              short_description: site.short_description,
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

    map.addLayer({
      id: "countries-selected-fill",
      type: "fill",
      source: "countries",
      filter: getSelectedCountriesFilter(),
      paint: {
        "fill-color": "#facc15",
        "fill-opacity": 0.36
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

    map.addLayer({
      id: "countries-selected-outline",
      type: "line",
      source: "countries",
      filter: getSelectedCountriesFilter(),
      paint: {
        "line-color": "#111827",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          1, 1.8,
          4, 3,
          7, 5
        ]
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
        visibility: "visible"
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
        visibility: "visible",
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
        visibility: "visible",
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
      closeOnClick: false,
      className: "dashboard-map-popup"
    });
    let activeHeritagePopup = null;
    let showFullHeritageDescription = false;

    const renderHeritagePopup = () => {
      if (!activeHeritagePopup) return;

      const { props, coordinates } = activeHeritagePopup;
      const fullDescription = getTextFromHtml(props.short_description);
      const displayDescription = showFullHeritageDescription
        ? fullDescription || "No description available."
        : getTextExcerpt(fullDescription);
      const isDangerous = props.danger === "1";
      const dangerLabel = isDangerous ? "Danger" : "Safe";
      const dangerClass = isDangerous ? " dangerous" : "";
      const prompt = showFullHeritageDescription
        ? ""
        : '<div class="heritage-popup-prompt">Press M to read more</div>';

      popup
        .setLngLat(coordinates)
        .setHTML(`
          <div class="heritage-popup-title">${escapeHtml(props.name)}</div>
          <div class="heritage-popup-meta">
            <span>${escapeHtml(props.category)}</span>
            <span>${escapeHtml(props.country)}</span>
            <span class="heritage-popup-danger${dangerClass}">${dangerLabel}</span>
          </div>
          <div class="heritage-popup-description">${escapeHtml(displayDescription)}</div>
          ${prompt}
        `)
        .addTo(map);
    };

    window.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() !== "m" || !activeHeritagePopup) return;

      showFullHeritageDescription = true;
      renderHeritagePopup();
    });

    let selectionStartPoint = null;
    let selectionBox = null;
    let hasDraggedSelectionBox = false;

    const removeSelectionBox = () => {
      if (selectionBox) {
        selectionBox.remove();
        selectionBox = null;
      }
    };

    const updateSelectionBox = (currentPoint) => {
      if (!selectionBox || !selectionStartPoint) return;

      const minX = Math.min(selectionStartPoint.x, currentPoint.x);
      const maxX = Math.max(selectionStartPoint.x, currentPoint.x);
      const minY = Math.min(selectionStartPoint.y, currentPoint.y);
      const maxY = Math.max(selectionStartPoint.y, currentPoint.y);

      selectionBox.style.left = `${minX}px`;
      selectionBox.style.top = `${minY}px`;
      selectionBox.style.width = `${maxX - minX}px`;
      selectionBox.style.height = `${maxY - minY}px`;
    };

    map.on("mousedown", (e) => {
      if (!window.countrySelectionMode || e.originalEvent.button !== 0) return;

      e.preventDefault();
      popup.remove();
      selectionStartPoint = e.point;
      hasDraggedSelectionBox = false;
      map.getCanvas().style.cursor = "crosshair";

      removeSelectionBox();
      selectionBox = document.createElement("div");
      selectionBox.className = "country-selection-box";
      map.getContainer().appendChild(selectionBox);
      updateSelectionBox(e.point);
    });

    map.on("mousemove", (e) => {
      if (!selectionStartPoint) return;

      const distanceX = Math.abs(e.point.x - selectionStartPoint.x);
      const distanceY = Math.abs(e.point.y - selectionStartPoint.y);

      if (distanceX > 4 || distanceY > 4) {
        hasDraggedSelectionBox = true;
      }

      updateSelectionBox(e.point);
    });

    map.on("mouseup", (e) => {
      if (!selectionStartPoint) return;

      const startPoint = selectionStartPoint;
      const endPoint = e.point;

      selectionStartPoint = null;
      removeSelectionBox();

      if (!hasDraggedSelectionBox) return;

      window.suppressNextCountryClickSelection = true;
      window.setTimeout(() => {
        window.suppressNextCountryClickSelection = false;
      }, 100);

      const bounds = [
        [Math.min(startPoint.x, endPoint.x), Math.min(startPoint.y, endPoint.y)],
        [Math.max(startPoint.x, endPoint.x), Math.max(startPoint.y, endPoint.y)]
      ];
      const features = map.queryRenderedFeatures(bounds, {
        layers: ["countries-fill"]
      });
      const countryCodes = features.map((feature) => feature.properties.cca2);

      addCountryCodesToSelection(countryCodes);
    });

    map.on("mousemove", "countries-fill", (e) => {
      if (selectionStartPoint) return;

      const props = e.features[0].properties;
      map.getCanvas().style.cursor = window.countrySelectionMode ? "crosshair" : "pointer";

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
      map.getCanvas().style.cursor = window.countrySelectionMode ? "crosshair" : "";
      popup.remove();
    });

    map.on("click", "countries-fill", (e) => {
      if (!window.countrySelectionMode) return;

      if (window.suppressNextCountryClickSelection) {
        window.suppressNextCountryClickSelection = false;
        return;
      }

      toggleCountrySelection(e.features[0].properties.cca2);
    });

    map.on("click", "heritage-clusters", async (e) => {
      if (window.countrySelectionMode) return;

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
      const coordinates = e.features[0].geometry.coordinates;
      const isSameSite = activeHeritagePopup?.props.name === props.name;

      activeHeritagePopup = { props, coordinates };

      if (!isSameSite) {
        showFullHeritageDescription = false;
      }

      renderHeritagePopup();
    });

    map.on("mouseleave", "heritage-sites-symbol", () => {
      map.getCanvas().style.cursor = "";
      activeHeritagePopup = null;
      showFullHeritageDescription = false;
      popup.remove();
    });
  });
}
