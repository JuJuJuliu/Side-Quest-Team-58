const fetch = require("node-fetch");
const axios = require("axios");

// Function to fetch 24-hour weather data
async function getWeatherData() {
  const apiUrl =
    "https://api.data.gov.sg/v1/environment/24-hour-weather-forecast";
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.api_info.status === "healthy") {
      return {
        forecast: data.items[0].general.forecast,
        temperatureLow: data.items[0].general.temperature.low,
        temperatureHigh: data.items[0].general.temperature.high,
        humidityLow: data.items[0].general.relative_humidity.low,
        humidityHigh: data.items[0].general.relative_humidity.high,
        windSpeedLow: data.items[0].general.wind.speed.low,
        windSpeedHigh: data.items[0].general.wind.speed.high,
        windDirection: data.items[0].general.wind.direction,
      };
    } else {
      throw new Error("Unable to fetch 24-hour weather data");
    }
  } catch (error) {
    throw new Error("Error fetching data: " + error.message);
  }
}

// Function to fetch 2-hour weather data
const twoHourForecastApiUrl =
  "https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast";

async function getTwoHourWeatherData() {
  try {
    const response = await axios.get(twoHourForecastApiUrl, {
      timeout: 5000, // Timeout
    });

    const data = response.data;

    if (
      data.code === 0 &&
      data.data &&
      data.data.items &&
      data.data.items.length > 0
    ) {
      const forecastItems = data.data.items[0].forecasts;

      // Process the forecast data
      const twoHourForecasts = forecastItems.map((forecast) => {
        return {
          area: forecast.area,
          forecast: forecast.forecast,
        };
      });

      return twoHourForecasts;
    } else {
      throw new Error("No data found or invalid response");
    }
  } catch (error) {
    return null; // Return null
  }
}

module.exports = { getWeatherData, getTwoHourWeatherData };
