"use client";

import { useState } from "react";
import type { ForecastDay, HourlyForecast, WeatherData } from "@/lib/hooks/useWeather";
import { getWeatherEmoji } from "@/lib/hooks/useWeather";

type ModalTab = "hourly" | "10day";

interface WeatherForecastModalProps {
  isOpen: boolean;
  onClose: () => void;
  weather: WeatherData | null;
  forecast: ForecastDay[];
  hourly: HourlyForecast[];
}

function formatDayName(dateStr: string, index: number): string {
  if (index === 0) return "Today";
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(isoStr: string): string {
  if (!isoStr) return "--";
  const date = new Date(isoStr);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatHour(isoStr: string): string {
  const date = new Date(isoStr);
  const now = new Date();
  if (date.getHours() === now.getHours() && date.getDate() === now.getDate()) {
    return "Now";
  }
  return date.toLocaleTimeString("en-US", { hour: "numeric" });
}

export default function WeatherForecastModal({
  isOpen,
  onClose,
  weather,
  forecast,
  hourly,
}: WeatherForecastModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>("hourly");

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-gray-950 border border-gray-800/50 rounded-xl z-50 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-950 border-b border-gray-800/50 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-100">
              Weather Forecast
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Burtonsville, MD
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Current Conditions */}
        {weather && (
          <div className="px-5 py-4 border-b border-gray-800/50">
            <div className="flex items-center gap-4">
              <div className="text-5xl">
                {getWeatherEmoji(weather.icon)}
              </div>
              <div className="flex-1">
                <div className="text-4xl font-bold text-gray-100">
                  {weather.temperature}&deg;F
                </div>
                <div className="text-sm text-gray-400 mt-0.5">
                  {weather.description}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mt-4">
              <div className="bg-gray-900/50 rounded-lg p-2.5 text-center">
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                  Feels Like
                </div>
                <div className="text-sm font-semibold text-gray-200 mt-0.5">
                  {weather.feelsLike}&deg;
                </div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-2.5 text-center">
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                  High / Low
                </div>
                <div className="text-sm font-semibold text-gray-200 mt-0.5">
                  {weather.high}&deg; / {weather.low}&deg;
                </div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-2.5 text-center">
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                  Humidity
                </div>
                <div className="text-sm font-semibold text-gray-200 mt-0.5">
                  {weather.humidity}%
                </div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-2.5 text-center">
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                  Wind
                </div>
                <div className="text-sm font-semibold text-gray-200 mt-0.5">
                  {weather.windSpeed} mph
                </div>
              </div>
            </div>

            {/* Sunrise / Sunset from today's forecast */}
            {forecast.length > 0 && (forecast[0].sunrise || forecast[0].sunset) && (
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                {forecast[0].sunrise && (
                  <span>
                    Sunrise {formatTime(forecast[0].sunrise)}
                  </span>
                )}
                {forecast[0].sunset && (
                  <span>
                    Sunset {formatTime(forecast[0].sunset)}
                  </span>
                )}
                {forecast[0].uvIndexMax > 0 && (
                  <span>UV Index {forecast[0].uvIndexMax}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab Switcher */}
        <div className="px-5 pt-4 pb-2 flex gap-2">
          <button
            onClick={() => setActiveTab("hourly")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === "hourly"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
            }`}
          >
            Hourly
          </button>
          <button
            onClick={() => setActiveTab("10day")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === "10day"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
            }`}
          >
            10-Day
          </button>
        </div>

        {/* Hourly Forecast */}
        {activeTab === "hourly" && (
          <div className="px-5 py-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Next 24 Hours
            </h3>

            {/* Scrollable horizontal strip */}
            <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-gray-700">
              {hourly.map((h) => (
                <div
                  key={h.time}
                  className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg bg-gray-900/50 shrink-0 min-w-[60px]"
                >
                  <span className="text-[10px] text-gray-500 font-medium">
                    {formatHour(h.time)}
                  </span>
                  <span className="text-base">{getWeatherEmoji(h.icon)}</span>
                  <span className="text-sm font-semibold text-gray-200">
                    {h.temperature}&deg;
                  </span>
                  {h.precipitationProbability > 0 && (
                    <span className="text-[10px] text-blue-400">
                      {h.precipitationProbability}%
                    </span>
                  )}
                  <span className="text-[10px] text-gray-600">
                    {h.windSpeed} mph
                  </span>
                </div>
              ))}
            </div>

            {/* Detailed hourly list */}
            <div className="mt-4 space-y-0.5">
              {hourly.map((h) => (
                <div
                  key={h.time + "-row"}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-900/50 transition-colors"
                >
                  <div className="w-12 text-xs font-medium text-gray-400 shrink-0">
                    {formatHour(h.time)}
                  </div>
                  <div className="w-6 text-center text-sm shrink-0">
                    {getWeatherEmoji(h.icon)}
                  </div>
                  <div className="w-10 text-sm font-semibold text-gray-200 shrink-0">
                    {h.temperature}&deg;
                  </div>
                  <div className="flex-1 text-xs text-gray-500 truncate">
                    {h.description}
                  </div>
                  <div className="w-10 text-xs text-blue-400 text-right shrink-0">
                    {h.precipitationProbability > 0
                      ? `${h.precipitationProbability}%`
                      : ""}
                  </div>
                  <div className="w-12 text-[10px] text-gray-600 text-right shrink-0">
                    {h.windSpeed} mph
                  </div>
                  <div className="w-12 text-[10px] text-gray-600 text-right shrink-0">
                    {h.humidity}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 10-Day Forecast */}
        {activeTab === "10day" && (
          <div className="px-5 py-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              10-Day Forecast
            </h3>

            <div className="space-y-1">
              {forecast.map((day, i) => (
                <div
                  key={day.date}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-900/50 transition-colors"
                >
                  <div className="w-10 text-sm font-medium text-gray-300 shrink-0">
                    {formatDayName(day.date, i)}
                  </div>
                  <div className="w-12 text-xs text-gray-500 shrink-0">
                    {formatDateShort(day.date)}
                  </div>
                  <div className="w-8 text-center text-lg shrink-0">
                    {getWeatherEmoji(day.icon)}
                  </div>
                  <div className="w-10 text-xs text-blue-400 shrink-0 text-right">
                    {day.precipitationProbability > 0
                      ? `${day.precipitationProbability}%`
                      : ""}
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-8 text-right">
                      {day.low}&deg;
                    </span>
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden relative">
                      <TempBar
                        low={day.low}
                        high={day.high}
                        minTemp={Math.min(...forecast.map((d) => d.low))}
                        maxTemp={Math.max(...forecast.map((d) => d.high))}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-200 w-8">
                      {day.high}&deg;
                    </span>
                  </div>
                  <div className="w-14 text-right text-[10px] text-gray-600 shrink-0">
                    {day.windSpeedMax} mph
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-800/50 text-[10px] text-gray-600 text-center">
          Data from Open-Meteo
        </div>
      </div>
    </>
  );
}

function TempBar({
  low,
  high,
  minTemp,
  maxTemp,
}: {
  low: number;
  high: number;
  minTemp: number;
  maxTemp: number;
}) {
  const range = maxTemp - minTemp || 1;
  const leftPct = ((low - minTemp) / range) * 100;
  const widthPct = ((high - low) / range) * 100;

  // Color gradient based on temperature
  const avgTemp = (low + high) / 2;
  let barColor = "bg-blue-500";
  if (avgTemp > 85) barColor = "bg-red-500";
  else if (avgTemp > 70) barColor = "bg-orange-400";
  else if (avgTemp > 55) barColor = "bg-yellow-400";
  else if (avgTemp > 40) barColor = "bg-green-400";
  else if (avgTemp > 25) barColor = "bg-cyan-400";

  return (
    <div
      className={`absolute top-0 h-full rounded-full ${barColor}`}
      style={{
        left: `${leftPct}%`,
        width: `${Math.max(widthPct, 4)}%`,
      }}
    />
  );
}
