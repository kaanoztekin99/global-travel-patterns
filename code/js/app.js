function App() {
  const [isMapFull, setIsMapFull] = React.useState(false);
  const [mapMode, setMapMode] = React.useState("2d");

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

  // create d3 parallel coordinates chart
  React.useEffect(() => {
    const pc = new ParallelCoordinates("mos-parallel-coordinates", []);
  }, []);

  return (
    <div className="dashboard">
      <header className="topbar">
        <div>
          <h1>Global Travel Dashboard</h1>
          <p>Tourism, cultural heritage and travel patterns</p>
        </div>
      </header>

      <div className="dashboard-body">
        <aside className="sidebar">
          <h2>Filters</h2>

          <label>Dataset</label>
          <select>
            <option>All datasets</option>
            <option>Tourism</option>
            <option>UNESCO Heritage</option>
            <option>Budget Level</option>
          </select>

          <label>Region</label>
          <select>
            <option>World</option>
            <option>Europe</option>
            <option>Asia</option>
            <option>Africa</option>
            <option>North America</option>
            <option>South America</option>
            <option>Oceania</option>
          </select>

          <div id="mos-parallel-coordinates" class="pc-div"></div>         
        </aside>

        <main className="main-content">
          <section className={isMapFull ? "map-card fullscreen-map" : "map-card"}>
            <div className="card-header map-header">
              <h2>Geographical Overview</h2>

              <div className="map-buttons">
                <button
                  className="map-toggle-btn"
                  onClick={() => setMapMode(mapMode === "2d" ? "3d" : "2d")}
                >
                  {mapMode === "2d" ? "3D Globe" : "2D Map"}
                </button>

                <button
                  className="map-toggle-btn"
                  onClick={() => setIsMapFull(!isMapFull)}
                >
                  {isMapFull ? "✕ Close Map" : "⛶ Expand Map"}
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
            </div>
          </section>

          <section className="charts-grid">
            <div className="chart-card">
              <h2>UNESCO Sites vs Visitors</h2>
              <div className="placeholder">D3 Scatter Plot</div>
            </div>

            <div className="chart-card">
              <h2>Budget Level Distribution</h2>
              <div className="placeholder">D3 Bar Chart</div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);