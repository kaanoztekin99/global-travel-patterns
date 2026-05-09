async function initBudgetLevelBarChart() {
  const canvas = document.getElementById("budget-level-bar");

  if (!canvas || typeof Chart === "undefined") return;

  const { getBudgetLevelColor, getBudgetLevelLabel } = window.chartUtils;
  const citiesCsv = await fetch("../data/clean/cities.csv").then((response) =>
    response.text()
  );
  const cities = d3.csvParse(citiesCsv);
  const budgetLevels = ["Budget", "Mid-range", "Luxury"];
  const countryBudgetCounts = new Map();

  // Group cities by country and count how many cities fall into each budget tier.
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
    // Limit the chart to the busiest countries so the labels remain readable.
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
