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
  // a small kernel-density estimate for the custom violin shape.
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

const cityTemperatureViolinPlugin = {
  id: "cityTemperatureViolinPlugin",
  beforeDatasetsDraw(chart) {
    // Chart.js has no built-in violin chart, so this plugin draws the density
    // shapes directly on the canvas before the invisible scatter dataset renders.
    const { ctx, chartArea, scales } = chart;
    const cityStats = chart.options.plugins.cityTemperatureViolin?.cityStats || [];
    const xScale = scales.x;
    const yScale = scales.y;

    if (!cityStats.length || !xScale || !yScale) return;

    const slotWidth = chartArea.width / Math.max(cityStats.length, 1);
    const maxHalfWidth = Math.min(slotWidth * 0.34, 18);

    ctx.save();

    cityStats.forEach((city, index) => {
      const centerX = xScale.getPixelForValue(index);
      const density = buildTemperatureDensity(city.avgValues, city.min, city.max);
      const rightSide = density.map((point) => ({
        x: centerX + point.value * maxHalfWidth,
        y: yScale.getPixelForValue(point.temp)
      }));
      const leftSide = [...density].reverse().map((point) => ({
        x: centerX - point.value * maxHalfWidth,
        y: yScale.getPixelForValue(point.temp)
      }));

      ctx.beginPath();
      [...rightSide, ...leftSide].forEach((point, pointIndex) => {
        if (pointIndex === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.closePath();
      ctx.fillStyle = "rgba(14, 165, 233, 0.28)";
      ctx.strokeStyle = "rgba(2, 132, 199, 0.85)";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();

      const minY = yScale.getPixelForValue(city.min);
      const maxY = yScale.getPixelForValue(city.max);
      const meanY = yScale.getPixelForValue(city.mean);

      ctx.beginPath();
      ctx.moveTo(centerX, minY);
      ctx.lineTo(centerX, maxY);
      ctx.strokeStyle = "rgba(15, 23, 42, 0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, meanY, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#dc2626";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    ctx.restore();
  }
};

if (typeof Chart !== "undefined") {
  Chart.register(cityTemperatureViolinPlugin);
}

async function initCityTemperatureViolin() {
  const canvas = document.getElementById("city-temperature-violin");

  if (!canvas || typeof Chart === "undefined") return;

  const { sampleRandomItems } = window.chartUtils;
  const citiesCsv = await fetch("../data/clean/cities.csv").then((response) =>
    response.text()
  );
  const cityStats = sampleRandomItems(
    d3.csvParse(citiesCsv).map(parseCityTemperatureStats).filter(Boolean),
    12
  );
  // Scale the y-axis to the sampled cities, with padding for readability.
  const minTemperature = Math.floor(Math.min(...cityStats.map((city) => city.min)) - 2);
  const maxTemperature = Math.ceil(Math.max(...cityStats.map((city) => city.max)) + 2);

  if (window.cityTemperatureViolinChart) {
    window.cityTemperatureViolinChart.destroy();
  }

  window.cityTemperatureViolinChart = new Chart(canvas, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Mean temperature",
          data: cityStats.map((city, index) => ({
            x: index,
            y: city.mean,
            city
          })),
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHitRadius: 16,
          backgroundColor: "rgba(220, 38, 38, 0.85)"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      plugins: {
        legend: {
          display: false
        },
        cityTemperatureViolin: {
          cityStats
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              const city = items[0].raw.city;
              return `${city.city}, ${city.country}`;
            },
            label: (context) => {
              const city = context.raw.city;
              return [
                `Mean avg temp: ${city.mean.toFixed(1)} C`,
                `Monthly min/max: ${city.min.toFixed(1)} C / ${city.max.toFixed(1)} C`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          type: "linear",
          min: -0.5,
          max: cityStats.length - 0.5,
          ticks: {
            stepSize: 1,
            callback: (value) => {
              if (!Number.isInteger(value)) return "";

              const city = cityStats[value];
              if (!city) return "";

              return city.city.length > 10 ? `${city.city.slice(0, 10)}...` : city.city;
            },
            maxRotation: 45,
            minRotation: 45,
            font: {
              size: 10
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          min: minTemperature,
          max: maxTemperature,
          title: {
            display: true,
            text: "Temperature (C)"
          },
          grid: {
            color: "rgba(148, 163, 184, 0.2)"
          }
        }
      }
    }
  });
}

window.initCityTemperatureViolin = initCityTemperatureViolin;
