function getRecentArrivalValue(countryRow) {
  // Use the most recent non-empty arrivals value so countries with missing
  // 2020 data can still appear in the scatter plot.
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

async function initCountryHeritageScatter() {
  const canvas = document.getElementById("country-heritage-scatter");

  if (!canvas || typeof Chart === "undefined") return;

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

  // Chart.js scatter points are enriched with country metadata for tooltips.
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
