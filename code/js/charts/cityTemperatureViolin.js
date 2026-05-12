function parseCityTemperatureStats(city) {
  let monthlyTemps;

  try {
    // avg_temp_monthly is stored as a JSON object inside the CSV cell.
    monthlyTemps = JSON.parse(city.avg_temp_monthly);
  } catch {
    return null;
  }

  const months = Object.values(monthlyTemps);
  const avgValues = months.map((month) => +month.avg).filter(Number.isFinite);
  const minValues = months.map((month) => +month.min).filter(Number.isFinite);
  const maxValues = months.map((month) => +month.max).filter(Number.isFinite);

  if (!avgValues.length || !minValues.length || !maxValues.length) return null;

  const mean =
    avgValues.reduce((total, value) => total + value, 0) / avgValues.length;

  return {
    city: city.city,
    country: city.country,
    avgValues,
    min: Math.min(...minValues),
    max: Math.max(...maxValues),
    mean
  };
}

function buildTemperatureDensity(values, min, max) {
  // A small kernel-density estimate for the custom violin shape.
  const steps = 32;
  const bandwidth = Math.max((max - min) / 7, 1.8);
  const density = [];

  for (let index = 0; index <= steps; index++) {
    const temp = min + ((max - min) * index) / steps;
    const value = values.reduce((total, item) => {
      const distance = (temp - item) / bandwidth;
      return total + Math.exp(-0.5 * distance * distance);
    }, 0);

    density.push({ temp, value });
  }

  const maxDensity = Math.max(...density.map((item) => item.value)) || 1;

  return density.map((item) => ({
    temp: item.temp,
    value: item.value / maxDensity
  }));
}

class CityTemperatureViolinChart {
  constructor(containerId) {
    this.containerId = containerId;
    this.margin = { top: 14, right: 22, bottom: 70, left: 58 };
    this.width = 720;
    this.height = 380;
  }

  async initChart() {
    const containerElement = document.getElementById(this.containerId);

    if (!containerElement || typeof d3 === "undefined") return;

    const { sampleRandomItems } = window.chartUtils;
    const citiesCsv = await fetch("../data/clean/cities.csv").then((response) =>
      response.text()
    );
    const cityStats = sampleRandomItems(
      d3.csvParse(citiesCsv).map(parseCityTemperatureStats).filter(Boolean),
      12
    );

    this.render(cityStats);
  }

  render(cityStats) {
    this.clear();

    if (!cityStats.length) return;

    const container = d3.select(`#${this.containerId}`);
    const margin = this.margin;
    const innerWidth = this.width - margin.left - margin.right;
    const innerHeight = this.height - margin.top - margin.bottom;
    const minTemperature = Math.floor(Math.min(...cityStats.map((city) => city.min)) - 2);
    const maxTemperature = Math.ceil(Math.max(...cityStats.map((city) => city.max)) + 2);

    const svg = container
      .append("svg")
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "100%");

    const chart = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint()
      .domain(cityStats.map((city) => city.city))
      .range([0, innerWidth])
      .padding(0.6);

    const y = d3.scaleLinear()
      .domain([minTemperature, maxTemperature])
      .nice()
      .range([innerHeight, 0]);

    const tooltip = container
      .append("div")
      .attr("class", "tooltip city-temperature-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden");

    chart.append("g")
      .attr("class", "grid-lines")
      .call(
        d3.axisLeft(y)
          .ticks(5)
          .tickSize(-innerWidth)
          .tickFormat("")
      )
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll("line")
        .attr("stroke", "rgba(148, 163, 184, 0.2)"));

    chart.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickFormat((label) =>
        label.length > 10 ? `${label.slice(0, 10)}...` : label
      ))
      .call((g) => g.select(".domain").attr("stroke", "#9ca3af"))
      .call((g) => g.selectAll("text")
        .attr("transform", "rotate(-35)")
        .style("text-anchor", "end")
        .style("font-size", "12px")
        .style("font-weight", "700"));

    chart.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat((value) => `${value} C`))
      .call((g) => g.selectAll("text")
        .style("font-size", "13px")
        .style("font-weight", "700"));

    chart.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -44)
      .attr("text-anchor", "middle")
      .attr("fill", "#374151")
      .attr("font-size", 14)
      .attr("font-weight", 800)
      .text("Temperature (C)");

    const maxHalfWidth = Math.min(innerWidth / cityStats.length * 0.32, 22);
    const area = d3.area()
      .x0((d) => d.x0)
      .x1((d) => d.x1)
      .y((d) => d.y)
      .curve(d3.curveCatmullRom.alpha(0.45));

    const cityGroups = chart.selectAll("g.violin-city")
      .data(cityStats)
      .enter()
      .append("g")
      .attr("class", "violin-city");

    cityGroups.each((city, index, nodes) => {
      const group = d3.select(nodes[index]);
      const centerX = x(city.city);
      const density = buildTemperatureDensity(city.avgValues, city.min, city.max);
      const pathData = density.map((point) => ({
        y: y(point.temp),
        x0: centerX - point.value * maxHalfWidth,
        x1: centerX + point.value * maxHalfWidth
      }));

      group.append("path")
        .datum(pathData)
        .attr("d", area)
        .attr("fill", "rgba(14, 165, 233, 0.28)")
        .attr("stroke", "rgba(2, 132, 199, 0.85)")
        .attr("stroke-width", 1.2);

      group.append("line")
        .attr("x1", centerX)
        .attr("x2", centerX)
        .attr("y1", y(city.min))
        .attr("y2", y(city.max))
        .attr("stroke", "rgba(15, 23, 42, 0.55)")
        .attr("stroke-width", 1.2);

      group.append("circle")
        .attr("cx", centerX)
        .attr("cy", y(city.mean))
        .attr("r", 4)
        .attr("fill", "#dc2626")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1.6);

      group.append("rect")
        .attr("x", centerX - maxHalfWidth)
        .attr("y", y(city.max) - 6)
        .attr("width", maxHalfWidth * 2)
        .attr("height", y(city.min) - y(city.max) + 12)
        .attr("fill", "transparent")
        .on("mouseover", (event) => {
          tooltip
            .style("visibility", "visible")
            .html(
              `<strong>${city.city}, ${city.country}</strong><br>` +
              `Mean avg temp: ${city.mean.toFixed(1)} C<br>` +
              `Monthly min/max: ${city.min.toFixed(1)} C / ${city.max.toFixed(1)} C`
            );

          group.select("path")
            .attr("fill", "rgba(14, 165, 233, 0.42)")
            .attr("stroke-width", 1.8);
        })
        .on("mousemove", (event) => {
          window.chartUtils.positionTooltip(
            event,
            tooltip,
            d3.select(`#${this.containerId}`).node()
          );
        })
        .on("mouseout", () => {
          tooltip.style("visibility", "hidden");

          group.select("path")
            .attr("fill", "rgba(14, 165, 233, 0.28)")
            .attr("stroke-width", 1.2);
        });
    });
  }

  clear() {
    d3.select(`#${this.containerId}`).selectAll("*").remove();
  }

  destroy() {
    this.clear();
  }
}

async function initCityTemperatureViolin() {
  if (!window.cityTemperatureViolinChart) {
    window.cityTemperatureViolinChart = new CityTemperatureViolinChart("city-temperature-violin");
  }

  await window.cityTemperatureViolinChart.initChart();
}

window.initCityTemperatureViolin = initCityTemperatureViolin;
