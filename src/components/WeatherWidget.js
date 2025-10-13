import React from "react";

export default function WeatherWidget() {
  return (
    <div className="sidebar-section">
      <div className="weather-widget">
        <p><strong>Mumbai:</strong> 29°C ☀️ Sunny</p>
        <p><strong>High:</strong> 31°C, <strong>Low:</strong> 24°C</p>
        <p><strong>Tomorrow:</strong> ⛅ Partly Cloudy</p>
      </div>
    </div>
  );
}
