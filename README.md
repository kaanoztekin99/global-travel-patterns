# 🌍 Exploring Global Travel Patterns

This project is developed as part of the **DT056A – Visualization course**.

The goal of the project is to explore global travel destinations by analyzing the relationship between:

- Cultural heritage (UNESCO World Heritage sites)
- Tourism popularity (most visited places)
- Travel affordability (budget levels)

The project presents an **interactive multi-view visualization dashboard** that allows users to explore global tourism patterns.

---

## 🎯 Project Goals

We aim to answer questions such as:

- Is there a relationship between cultural heritage richness and tourism popularity?
- Are highly visited destinations generally more expensive?
- Do destinations with more UNESCO sites attract more visitors?
- Which destinations attract many tourists despite having fewer heritage sites?

---

## 📊 Datasets

The project integrates multiple datasets into a unified dataset:

### 1. UNESCO World Heritage Dataset
- Information about cultural and natural heritage sites
- Includes country, site name, category, and location

### 2. Most Visited Places Dataset
- Tourism popularity data (visitor counts / rankings)

### 3. Worldwide Travel Dataset
- Travel-related attributes such as:
  - city
  - country
  - budget level (budget / mid-range / luxury)

---

## ⚙️ Data Processing

The datasets are preprocessed and merged using:

- Country and city names
- Duplicate removal
- Name normalization (country/city consistency)
- Handling missing values
- Preparing categorical data (budget levels)

---

## 📈 Planned Visualizations

The system includes multiple coordinated views:

- 🌍 **World Map**  
  Geographic exploration of visitor counts per country  

- 📊 **Scatter Plot**  
  Relationship between heritage sites and tourism popularity  

- 📉 **Bar Chart**  
  Comparison of tourism based on travel budget levels  

- 🗂 **Treemap**  
  Overview of most visited destinations  

---

## 🔄 Interactivity

The dashboard supports:

- Filtering by country and budget level  
- Brushing and linking between views  
- Hover-based details (detail-on-demand)  
- Interactive map navigation  

---

## 🛠 Technologies

- Python (data processing)
- Pandas
- JavaScript / HTML
- Bokeh / Plotly / Vega-Lite
- GeoJSON (for world map visualization)

---

## 🚀 Future Improvements

- Add more datasets (e.g., climate, safety index)
- Improve interaction design
- Enhance visual styling and UI
- Deploy as a web-based dashboard

---

## 📚 References

- UNESCO World Heritage Dataset  
- Kaggle Tourism Datasets  
- Natural Earth GeoJSON  

---

## 👥 Authors
<table>
  <tr>
    <td align="center">
      <a href="https://github.com/kaanoztekin99">
        <img src="https://avatars.githubusercontent.com/kaanoztekin99" width="80" alt="Kaan Tekin Öztekin"/><br />
        <sub><b>Kaan Tekin Öztekin</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/leo">
        <img src="https://avatars.githubusercontent.com/leo" width="80" alt="Kevin Rasmusson"/><br />
        <sub><b>Leonardo Noia Nanci de Araujo Silva</b></sub>
      </a>
    </td>

  </tr>
</table>

---
