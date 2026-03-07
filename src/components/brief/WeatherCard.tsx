"use client";

import { useWeather, getWeatherEmoji } from "@/lib/hooks/useWeather";

export default function WeatherCard() {
  const { weather, loading, error } = useWeather();

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="text-gray-500 text-sm animate-pulse">Loading weather...</div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors">
        <div className="text-3xl mb-2">{"\uD83C\uDF24\uFE0F"}</div>
        <div className="text-gray-400 text-sm mb-1">Burtonsville, MD</div>
        <div className="text-gray-500 text-sm">Weather unavailable</div>
      </div>
    );
  }

  const emoji = getWeatherEmoji(weather.icon);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-3xl mb-2">{emoji}</div>
          <div className="text-gray-400 text-sm mb-1">Burtonsville, MD</div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-gray-100">{weather.temperature}&deg;F</div>
          </div>
          <div className="text-gray-400 text-sm mt-1">{weather.description}</div>
        </div>
        <div className="text-right text-xs text-gray-500 space-y-1">
          <div>Feels like {weather.feelsLike}&deg;</div>
          <div>H: {weather.high}&deg; / L: {weather.low}&deg;</div>
          <div>Humidity {weather.humidity}%</div>
          <div>Wind {weather.windSpeed} mph</div>
        </div>
      </div>
    </div>
  );
}
