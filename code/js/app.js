function App() {
  const [isMapFull, setIsMapFull] = React.useState(false);
  const [mapMode, setMapMode] = React.useState("2d");
  const [selectedRegion, setSelectedRegion] = React.useState("World");
  const [plotLevel, setPlotLevel] = React.useState("country");
  const [showHeritageLocations, setShowHeritageLocations] = React.useState(false);
  const [selectedHeritageTypes, setSelectedHeritageTypes] = React.useState([]);
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

  const handleHeritageLocationChange = (event) => {
    const isVisible = event.target.checked;
    setShowHeritageLocations(isVisible);

    if (!isVisible) {
      setSelectedHeritageTypes([]);

      if (typeof window.setHeritageCategoryFilter === "function") {
        window.setHeritageCategoryFilter([]);
      }
    }

    if (typeof window.setHeritageLocationsVisible === "function") {
      window.setHeritageLocationsVisible(isVisible);
    }
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
            <span className="filter-label">Show Heritage Location</span>

            <label className="toggle-switch heritage-toggle">
              <input
                type="checkbox"
                checked={showHeritageLocations}
                onChange={handleHeritageLocationChange}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="toggle-filter">
            <span className="filter-label">Danger Zone</span>

            <label className="toggle-switch">
              <input type="checkbox" />
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
