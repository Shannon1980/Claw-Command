"use client";

import { useState, useEffect } from "react";

interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  high: number;
  low: number;
  description: string;
  icon: string;
}

const BURTONSVILLE_LAT = 39.11;
const BURTONSVILLE_LON = -76.93;
const CACHE_KEY = "weather_cache";
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function weatherCodeToInfo(code: number): { description: string; icon: string } {
  const map: Record<number, { description: string; icon: string }> = {
    0: { description: "Clear sky", icon: "sun" },
    1: { description: "Mainly clear", icon: "sun" },
    2: { description: "Partly cloudy", icon: "cloud-sun" },
    3: { description: "Overcast", icon: "cloud" },
    45: { description: "Foggy", icon: "cloud" },
    48: { description: "Rime fog", icon: "cloud" },
    51: { description: "Light drizzle", icon: "cloud-rain" },
    53: { description: "Drizzle", icon: "cloud-rain" },
    55: { description: "Heavy drizzle", icon: "cloud-rain" },
    61: { description: "Light rain", icon: "cloud-rain" },
    63: { description: "Rain", icon: "cloud-rain" },
    65: { description: "Heavy rain", icon: "cloud-rain" },
    66: { description: "Freezing rain", icon: "cloud-rain" },
    67: { description: "Heavy freezing rain", icon: "cloud-rain" },
    71: { description: "Light snow", icon: "snow" },
    73: { description: "Snow", icon: "snow" },
    75: { description: "Heavy snow", icon: "snow" },
    77: { description: "Snow grains", icon: "snow" },
    80: { description: "Light showers", icon: "cloud-rain" },
    81: { description: "Showers", icon: "cloud-rain" },
    82: { description: "Heavy showers", icon: "cloud-rain" },
    85: { description: "Light snow showers", icon: "snow" },
    86: { description: "Heavy snow showers", icon: "snow" },
    95: { description: "Thunderstorm", icon: "storm" },
    96: { description: "Thunderstorm w/ hail", icon: "storm" },
    99: { description: "Thunderstorm w/ heavy hail", icon: "storm" },
  };
  return map[code] || { description: "Unknown", icon: "cloud" };
}

export function getWeatherEmoji(icon: string): string {
  switch (icon) {
    case "sun": return "\u2600\uFE0F";
    case "cloud-sun": return "\u26C5";
    case "cloud": return "\u2601\uFE0F";
    case "cloud-rain": return "\uD83C\uDF27\uFE0F";
    case "snow": return "\u2744\uFE0F";
    case "storm": return "\u26C8\uFE0F";
    default: return "\uD83C\uDF24\uFE0F";
  }
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWeather() {
      // Check cache
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            setWeather(data);
            setLoading(false);
            return;
          }
        }
      } catch {
        // ignore cache errors
      }

      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${BURTONSVILLE_LAT}&longitude=${BURTONSVILLE_LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York&forecast_days=1`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Weather API error");
        const json = await res.json();

        const current = json.current;
        const daily = json.daily;
        const info = weatherCodeToInfo(current.weather_code);

        const data: WeatherData = {
          temperature: Math.round(current.temperature_2m),
          feelsLike: Math.round(current.apparent_temperature),
          humidity: current.relative_humidity_2m,
          windSpeed: Math.round(current.wind_speed_10m),
          weatherCode: current.weather_code,
          high: Math.round(daily.temperature_2m_max[0]),
          low: Math.round(daily.temperature_2m_min[0]),
          description: info.description,
          icon: info.icon,
        };

        setWeather(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch weather");
      } finally {
        setLoading(false);
      }
    }

    fetchWeather();
    const interval = setInterval(fetchWeather, CACHE_TTL);
    return () => clearInterval(interval);
  }, []);

  return { weather, loading, error };
}
