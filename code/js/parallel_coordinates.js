// create Parallel coordinates chart class using d3
class ParallelCoordinates {
  constructor(containerId, data) {
    this.containerId = containerId;
    this.data = data;

    this.margin = {top: 30, right: 10, bottom: 90, left: 10};

    this.initChart();

  }

    initChart() {
        const margin = this.margin;

        const container = d3.select(`#${this.containerId}`)
        const width = container.node().clientWidth - margin.left - margin.right;
        const height = container.node().clientHeight - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "auto");

        const chart = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Parse the Data
        d3.csv("..\\data\\clean\\cities.csv").then( function(data) {        

        // Extract the list of dimensions we want to keep in the plot. Here I keep all except the column called Species
        const dimensions = ["adventure","nature","beaches","nightlife","cuisine","wellness","urban","seclusion"];

        // For each dimension, I build a linear scale. I store all in an x object
        const x = d3.scaleLinear()
            .domain([1, 5])
            .range([0, width]);

        // Build the Y scale -> it finds the best vertical position for each horizontal axis
        const y = d3.scalePoint()
            .range([0, height - margin.bottom - margin.top])
            .padding(0)
            .domain(dimensions);

        // The path function takes a row of the csv as input, and returns x and y coordinates after rotation.
        function path(d) {
            return d3.line()(dimensions.map(function(p) { return [x(d[p]), y(p)]; }));
        }

        // Draw the lines
        chart
            .selectAll("myPath")
            .data(data)
            .join("path")
            .attr("d",  path)
            .style("fill", "none")
            .style("stroke", "#7a0177")
            .style("opacity", 0.05)

        // Draw the axis:
        chart.selectAll("myAxis")
            // For each dimension of the dataset I add a 'g' element:
            .data(dimensions).enter()
            .append("g")
            // I translate this element to its vertical position on the y axis
            .attr("transform", function(d) { return "translate(0," + y(d) + ")"; })
            // And I build the axis with the call function
            .each(function(d) {
                const axis = d3.axisBottom().scale(x);
                const domain = x.domain();
                const tickCount = Math.max(1, Math.ceil((domain[1] - domain[0])));
                axis.ticks(tickCount);
                d3.select(this).call(axis);
            })
            // Add axis title
            .append("text")
            .style("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", 30)
            .text(function(d) { return d; })
            .style("fill", "black")

        })
    }
}