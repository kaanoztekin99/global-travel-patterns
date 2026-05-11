class ParallelCoordinates {
  constructor(containerId, data) {
    this.containerId = containerId;
    this.data = data;
    this.dimensions = ["adventure","nature","beaches","nightlife","cuisine","wellness","urban","seclusion"];

    this.margin = {top: 30, right: 10, bottom: 120, left: 10};

    this.events = {
        brush: "pcBrush"
    }

    this.initChart();
  }

    initChart() {
        const margin = this.margin;
        const dimensions = this.dimensions;

        const container = d3.select(`#${this.containerId}`)
        const width = container.node().clientWidth - margin.left - margin.right;
        const height = container.node().clientHeight - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "100%");

        this.chart = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

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
        const lines = this.chart.selectAll(".line")
            .data(this.data)
            .join("path")
            .attr("class", "line")
            .attr("d", path)
            .style("fill", "none")
            .style("stroke", "#7a0177")
            .style("opacity", 0.1);

        const activeBrushes = new Map();

        const isLineActive = (d) => {
            if (activeBrushes.size === 0) return true;
            for (const [dimension, selection] of activeBrushes.entries()) {
                const [x0, x1] = selection;
                const value = d[dimension];
                const px = x(value);
                if (px < x0 || px > x1) {
                    return false;
                }
            }
            return true;
        };

        const updateLines = () => {
            lines.style("stroke", d => isLineActive(d) ? "#7a0177" : "#999")
                 .style("opacity", d => isLineActive(d) ? 0.1 : 0.01);
        };

        const brushMoved = (event, dimension) => {
            const selection = event.selection;
            if (selection) {
                activeBrushes.set(dimension, selection);
            } else {
                activeBrushes.delete(dimension);
            }
            updateLines();
            console.log(this);
            
            this.data.forEach(element => {
                element.active = isLineActive(element);
            });
            this.interactionManager.publish(this.events.brush, this.data);
        };

        // Draw the axis:
        const axes = this.chart.selectAll("myAxis")
            .data(dimensions).enter()
            .append("g")
            .attr("transform", function(d) { return "translate(0," + y(d) + ")"; });

        axes.each(function(d) {
                const axis = d3.axisBottom().scale(x);
                const domain = x.domain();
                const tickCount = Math.max(1, Math.ceil((domain[1] - domain[0])));
                axis.ticks(tickCount);
                d3.select(this).call(axis);
            });

        axes.append("g")
            .attr("class", "brush")
            .call(d3.brushX()
                .extent([[0, -10], [width, 20]])
                .on("brush end", (event, d) => brushMoved(event, d))
            )
            .selectAll("rect")
            .attr("y", -10)
            .attr("height", 20);

        axes.append("text")
            .style("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", 30)
            .text(function(d) { return d; })
            .style("fill", "black");
    }

    
    
}