async function initGlobe() {
  const container = document.getElementById("globe");
  if (!container) return;

  container.innerHTML = "";

  const width = container.clientWidth;
  const height = container.clientHeight;
  const radius = Math.min(width, height) / 2.25;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const projection = d3
    .geoOrthographic()
    .scale(radius)
    .translate([width / 2, height / 2])
    .clipAngle(90);

  const path = d3.geoPath(projection);

  const geojson = await d3.json("../data/geojson/countries.geojson");

  svg
    .append("circle")
    .attr("cx", width / 2)
    .attr("cy", height / 2)
    .attr("r", radius)
    .attr("fill", "#dbeafe")
    .attr("stroke", "#1e3a8a")
    .attr("stroke-width", 1.5);

  svg
    .selectAll("path")
    .data(geojson.features)
    .join("path")
    .attr("d", path)
    .attr("fill", "#c51b8a")
    .attr("stroke", "white")
    .attr("stroke-width", 0.4)
    .attr("opacity", 0.85);

  let rotate = [0, -20];

  if (window.globeTimer) {
    window.globeTimer.stop();
  }

  window.globeTimer = d3.timer(() => {
    rotate[0] += 0.25;
    projection.rotate(rotate);
    svg.selectAll("path").attr("d", path);
  });
}