function App() {
  const [isMapFull, setIsMapFull] = React.useState(false);
  const [mapMode, setMapMode] = React.useState("2d");
  const [selectedRegion, setSelectedRegion] = React.useState("World");
  const [plotLevel, setPlotLevel] = React.useState("country");
  const [selectedHeritageTypes, setSelectedHeritageTypes] = React.useState([]);
  const [showDangerHeritageSites, setShowDangerHeritageSites] = React.useState(false);
  const [countrySelectionMode, setCountrySelectionMode] = React.useState(false);
  const [showRecentArrivals, setShowRecentArrivals] = React.useState(true);
  const [arrivalYearRange, setArrivalYearRange] = React.useState([1995, 2020]);

  React.useEffect(() => {
    initMap();
  }, []);

  React.useEffect(() => {
  setTimeout(() => {
    if (mapMode === "2d") {
      if (window.globeTimer) {
        window.globeTimer.stop();
        window.globeTimer = null;
      }

      if (window.dashboardMap && typeof window.dashboardMap.resize === "function") {
        window.dashboardMap.resize();
      }
    }

    if (mapMode === "3d") {
      initGlobe();
    }
    }, 300);
    }, [mapMode, isMapFull]);

  React.useEffect(() => {
    if (mapMode !== "2d") return;

    setTimeout(() => {
      if (typeof window.focusMapRegion === "function") {
        window.focusMapRegion(selectedRegion);
      }
    }, 350);
  }, [selectedRegion, mapMode, isMapFull]);

  React.useEffect(() => {
    if (typeof window.setCountrySelectionMode === "function") {
      window.setCountrySelectionMode(mapMode === "2d" && countrySelectionMode);
    }
  }, [countrySelectionMode, mapMode]);

  React.useEffect(() => {
    setTimeout(() => {
      if (plotLevel === "country") {
        if (typeof window.destroyCityLevelCharts === "function") {
          window.destroyCityLevelCharts();
        }

        if (typeof window.initCountryHeritageScatter === "function") {
          window.initCountryHeritageScatter();
        }

        if (typeof window.initBudgetLevelBarChart === "function") {
          window.initBudgetLevelBarChart();
        }
      }

      if (plotLevel === "city") {
        if (typeof window.destroyCountryLevelCharts === "function") {
          window.destroyCountryLevelCharts();
        }

        if (typeof window.initCityTemperatureViolin === "function") {
          window.initCityTemperatureViolin();
        }

        if (typeof window.initCityDurationBudgetStackedBar === "function") {
          window.initCityDurationBudgetStackedBar();
        }
      }
    }, 100);
  }, [plotLevel]);

  const handleRegionChange = (event) => {
    setSelectedRegion(event.target.value);
    setMapMode("2d");
  };

  const handleHeritageTypeChange = (event) => {
    const type = event.target.value;
    const isChecked = event.target.checked;
    const nextTypes = isChecked
      ? [...selectedHeritageTypes, type]
      : selectedHeritageTypes.filter((selectedType) => selectedType !== type);

    setSelectedHeritageTypes(nextTypes);

    if (typeof window.setHeritageCategoryFilter === "function") {
      window.setHeritageCategoryFilter(nextTypes);
    }
  };

  const handleDangerHeritageChange = (event) => {
    const isChecked = event.target.checked;
    setShowDangerHeritageSites(isChecked);

    if (typeof window.setDangerHeritageFilter === "function") {
      window.setDangerHeritageFilter(isChecked);
    }
  };

  const handleCountrySelectionModeChange = () => {
    setCountrySelectionMode((isActive) => !isActive);
    setMapMode("2d");
  };

  const handleClearCountrySelection = () => {
    if (typeof window.clearSelectedCountries === "function") {
      window.clearSelectedCountries();
    }
  };

  const updateArrivalFilter = (nextShowRecent, nextRange) => {
    setShowRecentArrivals(nextShowRecent);
    setArrivalYearRange(nextRange);

    if (typeof window.setArrivalYearFilter === "function") {
      window.setArrivalYearFilter({
        showRecent: nextShowRecent,
        startYear: nextRange[0],
        endYear: nextRange[1]
      });
    }
  };

  const handleShowRecentArrivalsChange = (event) => {
    const isChecked = event.target.checked;
    updateArrivalFilter(isChecked, isChecked ? [1995, 2020] : arrivalYearRange);
  };

  const handleArrivalYearRangeChange = (index, value) => {
    const year = +value;
    const nextRange = [...arrivalYearRange];

    nextRange[index] = year;

    if (nextRange[0] > nextRange[1]) {
      nextRange[1 - index] = year;
    }

    updateArrivalFilter(false, nextRange);
  };

  // create d3 parallel coordinates chart
  React.useEffect(() => {
    const pc = new ParallelCoordinates("mos-parallel-coordinates", []);
  }, []);

  return (
    <div className="dashboard">
      <header className="topbar">
        <button
          className={mapMode === "3d" ? "title-globe-button active" : "title-globe-button"}
          onClick={() => setMapMode(mapMode === "2d" ? "3d" : "2d")}
          aria-label={mapMode === "2d" ? "Switch to 3D globe" : "Switch to 2D map"}
          title={mapMode === "2d" ? "Switch to 3D globe" : "Switch to 2D map"}
        >
          <span className="title-globe">
            <span className="title-globe-shine"></span>
          </span>
        </button>

        <div className="title-copy">
          <h1>Global Travel Dashboard</h1>
          <p>Tourism, cultural heritage and travel patterns</p>
        </div>
      </header>

      <div className="dashboard-body">
        <aside className="sidebar">
          <h2>Filters</h2>

          <label>Region</label>
          <select value={selectedRegion} onChange={handleRegionChange}>
            <option>World</option>
            <option>Europe</option>
            <option>Asia</option>
            <option>Africa</option>
            <option>North America</option>
            <option>South America</option>
            <option>Oceania</option>
          </select>

          <div className="filter-group">
            <span className="filter-label">Heritage Type:</span>

            <div className="checkbox-row">
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  value="Natural"
                  checked={selectedHeritageTypes.includes("Natural")}
                  onChange={handleHeritageTypeChange}
                />
                Natural
              </label>

              <label className="checkbox-option">
                <input
                  type="checkbox"
                  value="Cultural"
                  checked={selectedHeritageTypes.includes("Cultural")}
                  onChange={handleHeritageTypeChange}
                />
                Cultural
              </label>

              <label className="checkbox-option">
                <input
                  type="checkbox"
                  value="Mixed"
                  checked={selectedHeritageTypes.includes("Mixed")}
                  onChange={handleHeritageTypeChange}
                />
                Mixed
              </label>
            </div>
          </div>

          <div className="toggle-filter">
            <span className="filter-label">Danger Zone</span>

            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={showDangerHeritageSites}
                onChange={handleDangerHeritageChange}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div id="mos-parallel-coordinates" class="pc-div"></div>
        </aside>

        <main className="main-content">
          <section className={isMapFull ? "map-card fullscreen-map" : "map-card"}>
            <div className="card-header map-header">
              <h2>Geographical Overview</h2>

              <div className="map-buttons">
                <button
                  className="map-toggle-btn"
                  onClick={() => setIsMapFull(!isMapFull)}
                  aria-label={isMapFull ? "Close map" : "Expand map"}
                  title={isMapFull ? "Close map" : "Expand map"}
                >
                  {isMapFull ? "✕" : "⛶"}
                </button>
              </div>
            </div>

            <div className="map-visual-area">
                <div
                    id="map"
                    className={mapMode === "2d" ? "viz-visible" : "viz-hidden"}
                ></div>

                <div
                    id="globe"
                    className={mapMode === "3d" ? "viz-visible" : "viz-hidden"}
                ></div>

                <button
                  className={countrySelectionMode ? "map-selection-btn active" : "map-selection-btn"}
                  onClick={handleCountrySelectionModeChange}
                  aria-label={countrySelectionMode ? "Disable country selection" : "Enable country selection"}
                  title={countrySelectionMode ? "Disable country selection" : "Enable country selection"}
                >
                  <svg
                    className="map-selection-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M5 3L18 14L12.6 15.1L15.8 21L12.9 22.5L9.8 16.6L5 20V3Z" />
                  </svg>
                </button>

                <button
                  className="map-clear-selection-btn"
                  onClick={handleClearCountrySelection}
                  aria-label="Clear country selection"
                  title="Clear country selection"
                >
                  <svg
                    className="map-clear-selection-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M8 4H16L17 6H21V8H19.6L18.5 21H5.5L4.4 8H3V6H7L8 4ZM6.4 8L7.3 19H16.7L17.6 8H6.4ZM9 10H11V17H9V10ZM13 10H15V17H13V10Z" />
                  </svg>
                </button>

                <div className="arrival-filter-panel">
                  <div className="arrival-filter-icon" aria-hidden="true">⚙</div>

                  <div className="arrival-filter-content">
                    <label className="arrival-recent-option">
                      <input
                        type="checkbox"
                        checked={showRecentArrivals}
                        onChange={handleShowRecentArrivalsChange}
                      />
                      Show Recent
                    </label>

                    <div className="arrival-range-header">
                      <span>Years Range</span>
                      <strong>{arrivalYearRange[0]} - {arrivalYearRange[1]}</strong>
                    </div>

                    <div className="arrival-range-control">
                      <input
                        type="range"
                        min="1995"
                        max="2020"
                        value={arrivalYearRange[0]}
                        onChange={(event) => handleArrivalYearRangeChange(0, event.target.value)}
                      />
                      <input
                        type="range"
                        min="1995"
                        max="2020"
                        value={arrivalYearRange[1]}
                        onChange={(event) => handleArrivalYearRangeChange(1, event.target.value)}
                      />
                    </div>
                  </div>
                </div>
            </div>
          </section>

          <section className="charts-grid">
            <div className="chart-level-control">
              <label htmlFor="plot-level">Plot Level</label>
              <select
                id="plot-level"
                value={plotLevel}
                onChange={(event) => setPlotLevel(event.target.value)}
              >
                <option value="country">Country-level</option>
                <option value="city">City-level</option>
              </select>
            </div>

            {plotLevel === "country" ? (
              <React.Fragment>
                <div className="chart-card">
                  <h2>UNESCO Sites vs Visitors</h2>
                  <div className="chart-canvas-wrap">
                    <canvas id="country-heritage-scatter"></canvas>
                  </div>
                </div>

                <div className="chart-card">
                  <h2>Budget Level Distribution</h2>
                  <div className="chart-canvas-wrap">
                    <canvas id="budget-level-bar"></canvas>
                  </div>
                </div>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <div className="chart-card">
                  <h2>Temperature Distribution by City</h2>
                  <div className="chart-canvas-wrap">
                    <canvas id="city-temperature-violin"></canvas>
                  </div>
                </div>

                <div className="chart-card">
                  <h2>Duration Budget Mix</h2>
                  <div className="chart-canvas-wrap">
                    <canvas id="city-duration-budget-stacked"></canvas>
                  </div>
                </div>
              </React.Fragment>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
