function destroyCountryLevelCharts() {
  // old instances must be destroyed
  // works when before switching dashboard levels or redrawing the same chart.
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

  // For D3 chart, remove the SVG and clear the current instance.
  if (window.cityDurationBudgetStackedBar) {
    window.cityDurationBudgetStackedBar.clear();
  }

  if (window.interactionManager && window.interactionManager.cityDurationBudgetStacked) {
  }
}

window.destroyCountryLevelCharts = destroyCountryLevelCharts;
window.destroyCityLevelCharts = destroyCityLevelCharts;
