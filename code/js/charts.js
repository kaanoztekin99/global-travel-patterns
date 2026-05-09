function normalizeCountryName(name) {
  return (name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getRecentArrivalValue(countryRow) {
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

function destroyCountryLevelCharts() {
  if (window.countryHeritageScatterChart) {
    window.countryHeritageScatterChart.destroy();
    window.countryHeritageScatterChart = null;
  }

  if (window.budgetLevelBarChart) {
    window.budgetLevelBarChart.destroy();
    window.budgetLevelBarChart = null;
  }
}

function destroyCityLevelCharts() {
  if (window.cityTemperatureViolinChart) {
    window.cityTemperatureViolinChart.destroy();
    window.cityTemperatureViolinChart = null;
  }

  if (window.cityDurationBudgetStackedChart) {
    window.cityDurationBudgetStackedChart.destroy();
    window.cityDurationBudgetStackedChart = null;
  }
}

async function initCountryHeritageScatter() {
  const canvas = document.getElementById("country-heritage-scatter");

  if (!canvas || typeof Chart === "undefined") return;

  const [countriesCsv, heritageCsv] = await Promise.all([
    fetch("../data/clean/countries.csv").then((response) => response.text()),
    fetch("../data/clean/heritage.csv").then((response) => response.text())
  ]);

  const countries = d3.csvParse(countriesCsv);
  const heritageSites = d3.csvParse(heritageCsv);
  const heritageCountsByCountry = new Map();

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

  if (window.countryHeritageScatterChart) {
    window.countryHeritageScatterChart.destroy();
  }

  window.countryHeritageScatterChart = new Chart(canvas, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Countries",
          data: scatterData,
          backgroundColor: "rgba(220, 38, 38, 0.72)",
          borderColor: "rgba(127, 29, 29, 0.9)",
          borderWidth: 1,
          pointRadius: 4,
          pointHoverRadius: 6
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
        tooltip: {
          callbacks: {
            label: (context) => {
              const point = context.raw;
              const arrivals = new Intl.NumberFormat("de-DE").format(point.y);

              return `${point.country}: ${point.x} heritage, ${arrivals} arrivals (${point.year})`;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Number of heritage sites"
          },
          ticks: {
            precision: 0
          },
          grid: {
            color: "rgba(148, 163, 184, 0.2)"
          }
        },
        y: {
          title: {
            display: true,
            text: "Recent arrivals"
          },
          ticks: {
            callback: (value) => new Intl.NumberFormat("en", {
              notation: "compact",
              maximumFractionDigits: 1
            }).format(value)
          },
          grid: {
            color: "rgba(148, 163, 184, 0.2)"
          }
        }
      }
    }
  });
}

window.initCountryHeritageScatter = initCountryHeritageScatter;
window.destroyCountryLevelCharts = destroyCountryLevelCharts;

function getBudgetLevelColor(level) {
  if (level === "Budget") return "rgba(34, 197, 94, 0.78)";
  if (level === "Mid-range") return "rgba(250, 204, 21, 0.82)";
  return "rgba(220, 38, 38, 0.72)";
}

function getBudgetLevelLabel(level) {
  return level === "Budget" ? "Budget-Friendly" : level;
}

async function initBudgetLevelBarChart() {
  const canvas = document.getElementById("budget-level-bar");

  if (!canvas || typeof Chart === "undefined") return;

  const citiesCsv = await fetch("../data/clean/cities.csv").then((response) =>
    response.text()
  );
  const cities = d3.csvParse(citiesCsv);
  const budgetLevels = ["Budget", "Mid-range", "Luxury"];
  const countryBudgetCounts = new Map();

  cities.forEach((city) => {
    if (!city.country || !budgetLevels.includes(city.budget_level)) return;

    if (!countryBudgetCounts.has(city.country)) {
      countryBudgetCounts.set(city.country, {
        country: city.country,
        Budget: 0,
        "Mid-range": 0,
        Luxury: 0,
        total: 0
      });
    }

    const country = countryBudgetCounts.get(city.country);
    country[city.budget_level] += 1;
    country.total += 1;
  });

  const countryRows = Array.from(countryBudgetCounts.values())
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.country.localeCompare(b.country);
    })
    .slice(0, 25);

  if (window.budgetLevelBarChart) {
    window.budgetLevelBarChart.destroy();
  }

  window.budgetLevelBarChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: countryRows.map((country) => country.country),
      datasets: budgetLevels.map((level) => ({
        label: getBudgetLevelLabel(level),
        budgetLevel: level,
        data: countryRows.map((country) =>
          country.total ? (country[level] / country.total) * 100 : 0
        ),
        backgroundColor: getBudgetLevelColor(level),
        borderColor: "rgba(255, 255, 255, 0.75)",
        borderWidth: 1,
        stack: "budget-levels",
        barPercentage: 0.8,
        categoryPercentage: 0.9
      }))
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            font: {
              size: 11
            }
          }
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              const country = countryRows[items[0].dataIndex];
              return `${country.country} (${country.total} cities)`;
            },
            label: (context) => {
              const country = countryRows[context.dataIndex];
              const level = context.dataset.budgetLevel;
              const percent = context.parsed.x.toFixed(1);

              return `${getBudgetLevelLabel(level)}: ${country[level]} cities (${percent}%)`;
            }
          }
        }
      },
      scales: {
        x: {
          min: 0,
          max: 100,
          stacked: true,
          ticks: {
            callback: (value) => `${value}%`
          },
          grid: {
            color: "rgba(148, 163, 184, 0.2)"
          }
        },
        y: {
          stacked: true,
          ticks: {
            autoSkip: false,
            callback: function(value) {
              const label = this.getLabelForValue(value);
              return label.length > 18 ? `${label.slice(0, 18)}...` : label;
            },
            font: {
              size: 10
            }
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

window.initBudgetLevelBarChart = initBudgetLevelBarChart;

function sampleRandomItems(items, sampleSize) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled.slice(0, sampleSize);
}

function parseCityTemperatureStats(city) {
  let monthlyTemps;

  try {
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

  const citiesCsv = await fetch("../data/clean/cities.csv").then((response) =>
    response.text()
  );
  const cityStats = sampleRandomItems(
    d3.csvParse(citiesCsv).map(parseCityTemperatureStats).filter(Boolean),
    12
  );
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
window.destroyCityLevelCharts = destroyCityLevelCharts;

function parseIdealDurations(value) {
  try {
    const durations = JSON.parse(value);
    return Array.isArray(durations) ? durations : [];
  } catch {
    return [];
  }
}

async function initCityDurationBudgetStackedBar() {
  const canvas = document.getElementById("city-duration-budget-stacked");

  if (!canvas || typeof Chart === "undefined") return;

  const citiesCsv = await fetch("../data/clean/cities.csv").then((response) =>
    response.text()
  );
  const budgetLevels = ["Budget", "Mid-range", "Luxury"];
  const durationOrder = ["Day trip", "Weekend", "Short trip", "One week", "Long trip"];
  const sampledCities = sampleRandomItems(
    d3.csvParse(citiesCsv).filter((city) =>
      city.city &&
      city.country &&
      budgetLevels.includes(city.budget_level) &&
      parseIdealDurations(city.ideal_durations).length
    ),
    80
  );
  const durationCounts = new Map();

  durationOrder.forEach((duration) => {
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

  const durationRows = durationOrder
    .map((duration) => durationCounts.get(duration))
    .filter((duration) => duration.total > 0);

  if (window.cityDurationBudgetStackedChart) {
    window.cityDurationBudgetStackedChart.destroy();
  }

  window.cityDurationBudgetStackedChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: durationRows.map((duration) => duration.duration),
      datasets: budgetLevels.map((level) => ({
        label: getBudgetLevelLabel(level),
        budgetLevel: level,
        data: durationRows.map((duration) =>
          duration.total ? (duration[level] / duration.total) * 100 : 0
        ),
        backgroundColor: getBudgetLevelColor(level),
        borderColor: "rgba(255, 255, 255, 0.75)",
        borderWidth: 1,
        stack: "duration-budget"
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            font: {
              size: 11
            }
          }
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              const duration = durationRows[items[0].dataIndex];
              return `${duration.duration} (${duration.total} sampled matches)`;
            },
            label: (context) => {
              const duration = durationRows[context.dataIndex];
              const level = context.dataset.budgetLevel;
              const percent = context.parsed.y.toFixed(1);

              return `${getBudgetLevelLabel(level)}: ${duration[level]} cities (${percent}%)`;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 10
            }
          }
        },
        y: {
          min: 0,
          max: 100,
          stacked: true,
          ticks: {
            callback: (value) => `${value}%`
          },
          grid: {
            color: "rgba(148, 163, 184, 0.2)"
          }
        }
      }
    }
  });
}

window.initCityDurationBudgetStackedBar = initCityDurationBudgetStackedBar;
