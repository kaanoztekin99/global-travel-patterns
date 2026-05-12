class CityDurationBudgetStackedBar {
  constructor(containerId, data) {
    this.containerId = containerId;
    this.data = data;
    this.budgetLevels = ["Budget", "Mid-range", "Luxury"];
    this.durationOrder = ["Day trip", "Weekend", "Short trip", "One week", "Long trip"];
    this.margin = { top: 10, right: 30, bottom: 30, left: 50 };

    this.events = {
      click: "cdbsClick"
    }
  }

  initChart(data) {
    if (!data) 
      data = this.data;
    

    const {
      getBudgetLevelColor,
      getBudgetLevelLabel,
      parseIdealDurations,
      sampleRandomItems
    } = window.chartUtils;

    // A sample keeps the city-level chart visually manageable while still showing
    // the relationship between trip duration and budget level.
    const sampledCities = data.filter((city) =>
        city.city &&
        city.country &&
        this.budgetLevels.includes(city.budget_level) &&
        parseIdealDurations(city.ideal_durations).length
      );    

    const durationCounts = new Map();

    // Pre-seed rows to preserve the intended duration order in the final chart.
    this.durationOrder.forEach((duration) => {
      durationCounts.set(duration, {
        duration,
        Budget: 0,
        "Mid-range": 0,
        Luxury: 0,
        total: 0
      });
    });

    sampledCities.forEach((city) => {
      parseIdealDurations(city.ideal_durations).forEach((duration) => {
        if (!durationCounts.has(duration)) return;

        const row = durationCounts.get(duration);
        row[city.budget_level] += 1;
        row.total += 1;
      });
    });

    this.durationRows = this.durationOrder
      .map((duration) => durationCounts.get(duration))
      .filter((duration) => duration.total > 0);

    // Remove previous chart if exists
    d3.select(`#${this.containerId}`).select("svg").remove();

    const margin = this.margin;
    const width = 600; // Fixed width for viewBox
    const height = 400; // Fixed height for viewBox

    const container = d3.select(`#${this.containerId}`);
    
    const svg = container.append("svg")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "100%");

    this.chart = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Prepare data for stacking (convert to percentages)
    const stackData = this.durationRows.map(d => {
      const total = d.total;
      return {
        duration: d.duration,
        Budget: total ? (d.Budget / total) * 100 : 0,
        "Mid-range": total ? (d["Mid-range"] / total) * 100 : 0,
        Luxury: total ? (d.Luxury / total) * 100 : 0,
        total: d.total
      };
    });

    // Scales
    const x = d3.scaleBand()
      .domain(stackData.map(d => d.duration))
      .range([0, width])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);

    const color = d3.scaleOrdinal()
      .domain(this.budgetLevels)
      .range(this.budgetLevels.map(level => getBudgetLevelColor(level)));

    // Stack the data
    const stack = d3.stack()
      .keys(this.budgetLevels)
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const series = stack(stackData);

    // Create tooltip
    this.tooltip = container
      .append("div")
      .attr("class", "tooltip city-duration-budget-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden");

    // Draw bars
    this.chart.selectAll("g.layer")
      .data(series)
      .enter()
      .append("g")
      .attr("class", "layer")
      .attr("fill", d => color(d.key))
      .selectAll("rect")
      .data(d => d)
      .enter()
      .append("rect")
      .attr("x", d => x(d.data.duration))
      .attr("y", d => y(d[1]))
      .attr("height", d => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth())
      .on("mouseover", (event, d) => this.handleMouseOver(event, d, getBudgetLevelLabel, color))
      .on("mousemove", (event) => this.handleMouseMove(event))
      .on("mouseout", () => this.handleMouseOut());

    // Add axes
    this.chart.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "middle")
      .style("font-size", "20px");

    this.chart.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d}%`))
      .selectAll("text")
      .style("font-size", "20px");  
  }

  handleMouseOver(event, d, getBudgetLevelLabel, color) {
    const duration = d.data.duration;
    const level = d3.select(event.target.parentNode).datum().key;
    const count = this.durationRows.find(r => r.duration === duration)[level];
    const percent = (d[1] - d[0]).toFixed(1);
    this.tooltip.style("visibility", "visible")
      .html(`${getBudgetLevelLabel(level)}: ${count} cities (${percent}%)<br>${duration} (${d.data.total} sampled matches)`);
  }

  handleMouseMove(event) {
    window.chartUtils.positionTooltip(
      event,
      this.tooltip,
      d3.select(`#${this.containerId}`).node()
    );
  }

  handleMouseOut() {
    this.tooltip.style("visibility", "hidden");
  }

  handleEvent(data){
    this.clear();
    this.initChart(data.filter(d => d.active));
  }

  clear() {
    d3.select(`#${this.containerId}`).selectAll("*").remove();    
  }
}
