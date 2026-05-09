const chartUtils = {
  normalizeCountryName(name) {
    return (name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  },

  getBudgetLevelColor(level) {
    if (level === "Budget") return "rgba(34, 197, 94, 0.78)";
    if (level === "Mid-range") return "rgba(250, 204, 21, 0.82)";
    return "rgba(220, 38, 38, 0.72)";
  },

  getBudgetLevelLabel(level) {
    return level === "Budget" ? "Budget-Friendly" : level;
  },

  sampleRandomItems(items, sampleSize) {
    // Shuffle a copy so the original parsed dataset is not mutated.
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }

    return shuffled.slice(0, sampleSize);
  },

  parseIdealDurations(value) {
    try {
      // ideal_durations is encoded as JSON in the CSV.
      const durations = JSON.parse(value);
      return Array.isArray(durations) ? durations : [];
    } catch {
      return [];
    }
  }
};

window.chartUtils = chartUtils;
