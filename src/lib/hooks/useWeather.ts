"use client";

import { useState, useEffect } from "react";

export interface WeatherData {
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

export interface ForecastDay {
  date: string;
  high: number;
  low: number;
  weatherCode: number;
  description: string;
  icon: string;
  precipitationProbability: number;
  windSpeedMax: number;
  uvIndexMax: number;
  sunrise: string;
  sunset: string;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  precipitationProbability: number;
  weatherCode: number;
  description: string;
  icon: string;
  windSpeed: number;
}

const BURTONSVILLE_LAT = 39.11;
const BURTONSVILLE_LON = -76.93;
const CACHE_KEY = "weather_cache";
const FORECAST_CACHE_KEY = "weather_forecast_cache";
const HOURLY_CACHE_KEY = "weather_hourly_cache";
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
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [hourly, setHourly] = useState<HourlyForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWeather() {
      // Check cache
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        const cachedForecast = localStorage.getItem(FORECAST_CACHE_KEY);
        const cachedHourly = localStorage.getItem(HOURLY_CACHE_KEY);
        if (cached && cachedForecast && cachedHourly) {
          const { data, timestamp } = JSON.parse(cached);
          const { data: forecastData, timestamp: fTimestamp } = JSON.parse(cachedForecast);
          const { data: hourlyData, timestamp: hTimestamp } = JSON.parse(cachedHourly);
          if (Date.now() - timestamp < CACHE_TTL && Date.now() - fTimestamp < CACHE_TTL && Date.now() - hTimestamp < CACHE_TTL) {
            setWeather(data);
            setForecast(forecastData);
            setHourly(hourlyData);
            setLoading(false);
            return;
          }
        }
      } catch {
        // ignore cache errors
      }

      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${BURTONSVILLE_LAT}&longitude=${BURTONSVILLE_LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York&forecast_days=10`;
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

        const forecastData: ForecastDay[] = daily.time.map((date: string, i: number) => {
          const dayInfo = weatherCodeToInfo(daily.weather_code[i]);
          return {
            date,
            high: Math.round(daily.temperature_2m_max[i]),
            low: Math.round(daily.temperature_2m_min[i]),
            weatherCode: daily.weather_code[i],
            description: dayInfo.description,
            icon: dayInfo.icon,
            precipitationProbability: daily.precipitation_probability_max?.[i] ?? 0,
            windSpeedMax: Math.round(daily.wind_speed_10m_max?.[i] ?? 0),
            uvIndexMax: Math.round(daily.uv_index_max?.[i] ?? 0),
            sunrise: daily.sunrise?.[i] ?? "",
            sunset: daily.sunset?.[i] ?? "",
          };
        });

        const hourlyRaw = json.hourly;
        const now = new Date();
        const hourlyData: HourlyForecast[] = hourlyRaw.time
          .map((time: string, i: number) => {
            const hourInfo = weatherCodeToInfo(hourlyRaw.weather_code[i]);
            return {
              time,
              temperature: Math.round(hourlyRaw.temperature_2m[i]),
              feelsLike: Math.round(hourlyRaw.apparent_temperature[i]),
              humidity: hourlyRaw.relative_humidity_2m[i],
              precipitationProbability: hourlyRaw.precipitation_probability?.[i] ?? 0,
              weatherCode: hourlyRaw.weather_code[i],
              description: hourInfo.description,
              icon: hourInfo.icon,
              windSpeed: Math.round(hourlyRaw.wind_speed_10m[i]),
            };
          })
          .filter((h: HourlyForecast) => new Date(h.time) >= now)
          .slice(0, 24);

        setWeather(data);
        setForecast(forecastData);
        setHourly(hourlyData);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
        localStorage.setItem(FORECAST_CACHE_KEY, JSON.stringify({ data: forecastData, timestamp: Date.now() }));
        localStorage.setItem(HOURLY_CACHE_KEY, JSON.stringify({ data: hourlyData, timestamp: Date.now() }));
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

  return { weather, forecast, hourly, loading, error };
}
