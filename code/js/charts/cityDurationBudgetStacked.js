async function initCityDurationBudgetStackedBar() {
  const canvas = document.getElementById("city-duration-budget-stacked");

  if (!canvas || typeof Chart === "undefined") return;

  const {
    getBudgetLevelColor,
    getBudgetLevelLabel,
    parseIdealDurations,
    sampleRandomItems
  } = window.chartUtils;
  const citiesCsv = await fetch("../data/clean/cities.csv").then((response) =>
    response.text()
  );
  const budgetLevels = ["Budget", "Mid-range", "Luxury"];
  const durationOrder = ["Day trip", "Weekend", "Short trip", "One week", "Long trip"];
  // A sample keeps the city-level chart visually manageable while still showing
  // the relationship between trip duration and budget level.
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

  // Pre-seed rows to preserve the intended duration order in the final chart.
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
