class BudgetLevelBarChart {
  constructor(containerId) {
    this.containerId = containerId;
    this.budgetLevels = ["Budget", "Mid-range", "Luxury"];
    this.margin = { top: 8, right: 28, bottom: 20, left: 148 };
    this.width = 780;
    this.height = 780;
    this.rowHeight = 36;
  }

  async initChart() {
    const containerElement = document.getElementById(this.containerId);

    if (!containerElement || typeof d3 === "undefined") return;

    const [citiesCsv, countriesCsv] = await Promise.all([
      fetch("../data/clean/cities.csv").then((response) => response.text()),
      fetch("../data/clean/countries.csv").then((response) => response.text())
    ]);
    const cities = d3.csvParse(citiesCsv);
    const countries = d3.csvParse(countriesCsv);

    this.render(this.prepareData(cities, countries));
  }

  getMaxArrival(countryRow) {
    let maxArrival = null;

    for (let year = 1995; year <= 2020; year++) {
      const value = +countryRow[year.toString()];

      if (!Number.isFinite(value) || value <= 0) continue;

      if (!maxArrival || value > maxArrival.value) {
        maxArrival = {
          value,
          year
        };
      }
    }

    return maxArrival;
  }

  prepareData(cities, countries) {
    const { normalizeCountryName } = window.chartUtils;
    const countryBudgetCounts = new Map();
    const maxArrivalsByCountry = new Map();

    countries.forEach((country) => {
      const countryName = normalizeCountryName(country.name);
      const maxArrival = this.getMaxArrival(country);

      if (countryName && maxArrival) {
        maxArrivalsByCountry.set(countryName, maxArrival);
      }
    });

    // Group cities by country and count how many cities fall into each budget tier.
    cities.forEach((city) => {
      if (!city.country || !this.budgetLevels.includes(city.budget_level)) return;

      if (!countryBudgetCounts.has(city.country)) {
        countryBudgetCounts.set(city.country, {
          country: city.country,
          Budget: 0,
        "Mid-range": 0,
        Luxury: 0,
        total: 0,
        maxArrival: null
      });
    }

      const country = countryBudgetCounts.get(city.country);
      country[city.budget_level] += 1;
      country.total += 1;
    });

    countryBudgetCounts.forEach((country) => {
      country.maxArrival = maxArrivalsByCountry.get(normalizeCountryName(country.country)) || null;
    });

    return Array.from(countryBudgetCounts.values())
      .filter((country) => country.maxArrival)
      .sort((a, b) => {
        const aArrival = a.maxArrival?.value || 0;
        const bArrival = b.maxArrival?.value || 0;

        if (bArrival !== aArrival) return bArrival - aArrival;
        return a.country.localeCompare(b.country);
      });
  }

  render(countryRows) {
    this.clear();

    const { getBudgetLevelColor, getBudgetLevelLabel } = window.chartUtils;
    const container = d3.select(`#${this.containerId}`);
    const containerNode = container.node();
    const margin = this.margin;
    const innerHeight = countryRows.length * this.rowHeight;
    const chartHeight = margin.top + innerHeight;
    const footerHeight = 106;
    const innerWidth = this.width - margin.left - margin.right;
    const widthScale = ((containerNode?.clientWidth || this.width) / this.width);
    const scaledChartHeight = chartHeight * widthScale;
    const scrollBody = container.append("div")
      .attr("class", "budget-level-scroll-body");
    const footer = container.append("div")
      .attr("class", "budget-level-footer");

    const svg = scrollBody
      .append("svg")
      .attr("width", this.width)
      .attr("height", chartHeight)
      .attr("viewBox", `0 0 ${this.width} ${chartHeight}`)
      .attr("preserveAspectRatio", "xMidYMin meet")
      .style("width", "100%")
      .style("height", `${scaledChartHeight}px`)
      .style("display", "block");

    const footerSvg = footer
      .append("svg")
      .attr("width", this.width)
      .attr("height", footerHeight)
      .attr("viewBox", `0 0 ${this.width} ${footerHeight}`)
      .attr("preserveAspectRatio", "xMidYMin meet")
      .style("width", "100%")
      .style("height", "100%")
      .style("display", "block");

    const chart = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain([0, 100])
      .range([0, innerWidth]);

    const y = d3.scaleBand()
      .domain(countryRows.map((country) => country.country))
      .range([0, innerHeight])
      .padding(0.12);

    const stackData = countryRows.map((country) => ({
      country: country.country,
      total: country.total,
      Budget: country.total ? (country.Budget / country.total) * 100 : 0,
      "Mid-range": country.total ? (country["Mid-range"] / country.total) * 100 : 0,
      Luxury: country.total ? (country.Luxury / country.total) * 100 : 0,
      raw: country
    }));
    const series = d3.stack()
      .keys(this.budgetLevels)(stackData);

    const tooltip = container
      .append("div")
      .attr("class", "tooltip budget-level-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden");

    chart.append("g")
      .attr("class", "grid-lines")
      .call(
        d3.axisTop(x)
          .ticks(5)
          .tickSize(-innerHeight)
          .tickFormat("")
      )
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll("line")
        .attr("stroke", "rgba(148, 163, 184, 0.2)"));

    chart.append("g")
      .call(d3.axisLeft(y).tickFormat((label) =>
        label.length > 18 ? `${label.slice(0, 18)}...` : label
      ))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll("text")
        .style("font-size", "18px")
        .style("font-weight", "800"));

    chart.selectAll("g.budget-layer")
      .data(series)
      .enter()
      .append("g")
      .attr("class", "budget-layer")
      .attr("fill", (seriesItem) => getBudgetLevelColor(seriesItem.key))
      .selectAll("rect")
      .data((seriesItem) => seriesItem.map((d) => ({
        ...d,
        level: seriesItem.key
      })))
      .enter()
      .append("rect")
      .attr("x", (d) => x(d[0]))
      .attr("y", (d) => y(d.data.country))
      .attr("width", (d) => Math.max(0, x(d[1]) - x(d[0])))
      .attr("height", y.bandwidth())
      .attr("stroke", "rgba(255, 255, 255, 0.75)")
      .attr("stroke-width", 1)
      .on("mouseover", (event, d) => {
        const country = d.data.raw;
        const percent = (d[1] - d[0]).toFixed(1);
        const recordArrival = country.maxArrival
          ? `${new Intl.NumberFormat("de-DE").format(country.maxArrival.value)} arrivals (${country.maxArrival.year})`
          : "N/A";

        tooltip
          .style("visibility", "visible")
          .html(
            `<strong>${country.country} (${country.total} cities)</strong><br>` +
            `Record: ${recordArrival}<br>` +
            `${getBudgetLevelLabel(d.level)}: ${country[d.level]} cities (${percent}%)`
          );

        d3.select(event.currentTarget)
          .attr("opacity", 0.78);
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
          .attr("opacity", 1);
      });

    footerSvg.append("g")
      .attr("transform", `translate(${margin.left}, 14)`)
      .call(d3.axisBottom(x).ticks(5).tickFormat((value) => `${value}%`))
      .call((g) => g.selectAll("text")
        .style("font-size", "16px")
        .style("font-weight", "800"))
      .call((g) => g.select(".domain")
        .attr("stroke", "#374151"));

    const legendItemWidths = [208, 158, 350];
    const legendGap = 22;
    const legendWidth = legendItemWidths.reduce((sum, width) => sum + width, 0) +
      legendGap * (this.budgetLevels.length - 1);
    const legendX = margin.left + (innerWidth - legendWidth) / 2 + 100;
    const legend = footerSvg.append("g")
      .attr("class", "budget-level-legend")
      .attr("transform", `translate(${legendX}, 64)`);

    let legendOffset = 0;

    this.budgetLevels.forEach((level, index) => {
      const item = legend.append("g")
        .attr("class", "budget-level-legend-item")
        .attr("transform", `translate(${legendOffset}, 0)`);

      legendOffset += legendItemWidths[index] + legendGap;

      item.append("rect")
        .attr("class", "budget-level-legend-swatch")
        .attr("width", 22)
        .attr("height", 22)
        .attr("rx", 5)
        .attr("fill", getBudgetLevelColor(level));

      item.append("text")
        .attr("class", "budget-level-legend-label")
        .attr("x", 32)
        .attr("y", 19)
        .text(getBudgetLevelLabel(level));
    });
  }

  clear() {
    d3.select(`#${this.containerId}`).selectAll("*").remove();
  }

  destroy() {
    this.clear();
  }
}

async function initBudgetLevelBarChart() {
  if (!window.budgetLevelBarChart) {
    window.budgetLevelBarChart = new BudgetLevelBarChart("budget-level-bar");
  }

  await window.budgetLevelBarChart.initChart();
}

window.initBudgetLevelBarChart = initBudgetLevelBarChart;
