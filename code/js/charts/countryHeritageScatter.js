function getRecentArrivalValue(countryRow) {
  // Use the most recent non-empty arrivals value so countries with missing
  for (let year = 2020; year >= 1995; year--) {
    const value = +countryRow[year.toString()];

    if (Number.isFinite(value) && value > 0) {
      return {
        year,
        value
      };
    }
  }

  return null;
}

class CountryHeritageScatter {
  constructor(containerId) {
    this.containerId = containerId;
    this.margin = { top: 14, right: 18, bottom: 48, left: 68 };
    this.width = 720;
    this.height = 380;
  }

  async initChart() {
    const containerElement = document.getElementById(this.containerId);

    if (!containerElement || typeof d3 === "undefined") return;

    const { normalizeCountryName } = window.chartUtils;

    // Load both datasets together because the chart combines arrival numbers
    // from countries.csv with heritage-site counts from heritage.csv.
    const [countriesCsv, heritageCsv] = await Promise.all([
      fetch("../data/clean/countries.csv").then((response) => response.text()),
      fetch("../data/clean/heritage.csv").then((response) => response.text())
    ]);

    const countries = d3.csvParse(countriesCsv);
    const heritageSites = d3.csvParse(heritageCsv);
    const heritageCountsByCountry = new Map();

    // Convert many heritage-site rows into one count per country.
    heritageSites.forEach((site) => {
      const countryName = normalizeCountryName(site.states_name);
      if (!countryName) return;

      heritageCountsByCountry.set(
        countryName,
        (heritageCountsByCountry.get(countryName) || 0) + 1
      );
    });

    const scatterData = countries
      .map((country) => {
        const countryName = normalizeCountryName(country.name);
        const heritageCount = heritageCountsByCountry.get(countryName) || 0;
        const recentArrivals = getRecentArrivalValue(country);

        if (!countryName || !heritageCount || !recentArrivals) {
          return null;
        }

        return {
          x: heritageCount,
          y: recentArrivals.value,
          country: country.name,
          year: recentArrivals.year
        };
      })
      .filter(Boolean);

    this.render(scatterData);
  }

  render(scatterData) {
    this.clear();

    const container = d3.select(`#${this.containerId}`);
    const margin = this.margin;
    const innerWidth = this.width - margin.left - margin.right;
    const innerHeight = this.height - margin.top - margin.bottom;

    const svg = container
      .append("svg")
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "100%");

    const chart = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain([0, 60])
      .range([0, innerWidth]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(scatterData, (d) => d.y) || 1])
      .nice()
      .range([innerHeight, 0]);

    const tooltip = container
      .append("div")
      .attr("class", "tooltip country-heritage-tooltip")
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
        .attr("stroke", "rgba(148, 163, 184, 0.22)"));

    chart.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickValues(d3.range(0, 61, 10)))
      .call((g) => g.selectAll("text")
        .style("font-size", "16px")
        .style("font-weight", "700"));

    chart.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat((value) =>
        new Intl.NumberFormat("en", {
          notation: "compact",
          maximumFractionDigits: 1
        }).format(value)
      ))
      .call((g) => g.selectAll("text")
        .style("font-size", "16px")
        .style("font-weight", "700"));

    chart.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 42)
      .attr("text-anchor", "middle")
      .attr("fill", "#374151")
      .attr("font-size", 16)
      .attr("font-weight", 800)
      .text("Number of heritage sites");

    chart.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -52)
      .attr("text-anchor", "middle")
      .attr("fill", "#374151")
      .attr("font-size", 16)
      .attr("font-weight", 800)
      .text("Recent arrivals");

    chart.selectAll("circle")
      .data(scatterData)
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d.x))
      .attr("cy", (d) => y(d.y))
      .attr("r", 4.8)
      .attr("fill", "rgba(220, 38, 38, 0.35)")
      .attr("stroke", "rgba(127, 29, 29, 0.55)")
      .attr("stroke-width", 1)
      .on("mouseover", (event, d) => {
        const arrivals = new Intl.NumberFormat("de-DE").format(d.y);

        tooltip
          .style("visibility", "visible")
          .html(`${d.country}: ${d.x} heritage, ${arrivals} arrivals (${d.year})`);

        d3.select(event.currentTarget)
          .attr("r", 7)
          .attr("fill", "rgba(220, 38, 38, 0.62)");
      })
      .on("mousemove", (event) => {
        window.chartUtils.positionTooltip(
          event,
          tooltip,
          d3.select(`#${this.containerId}`).node()
        );
      })
      .on("mouseout", (event) => {
        tooltip.style("visibility", "hidden");

        d3.select(event.currentTarget)
          .attr("r", 4.8)
          .attr("fill", "rgba(220, 38, 38, 0.35)");
      });
  }

  clear() {
    d3.select(`#${this.containerId}`).selectAll("*").remove();
  }

  destroy() {
    this.clear();
  }
}

async function initCountryHeritageScatter() {
  if (!window.countryHeritageScatterChart) {
    window.countryHeritageScatterChart = new CountryHeritageScatter("country-heritage-scatter");
  }

  await window.countryHeritageScatterChart.initChart();
}

window.initCountryHeritageScatter = initCountryHeritageScatter;
