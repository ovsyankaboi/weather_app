import { WEATHER_CODE_MAP } from '../data.js';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_GEO = 'https://geocoding-api.open-meteo.com/v1/search';

export function mapWeatherCode(code){
  for (const item of WEATHER_CODE_MAP){
    if (item.codes.includes(code)) return { icon: item.icon, text: item.text };
  }
  return { icon: './assets/cloud.png', text: 'погода' };
}

export async function fetchForecastByCoords({ latitude, longitude }){
  const url = new URL(OPEN_METEO_BASE);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('timezone', 'auto');

  
  url.searchParams.set('current_weather', 'true');
  url.searchParams.set('daily', 'weathercode,temperature_2m_max,temperature_2m_min,wind_speed_10m_max');
  url.searchParams.set('hourly', 'relativehumidity_2m');

  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) throw new Error('HTTP_ERROR');
  const data = await res.json();
  return normalizeForecast(data);
}

export async function searchCities(query){
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL(OPEN_METEO_GEO);
  url.searchParams.set('name', q);
  url.searchParams.set('count', '7');
  url.searchParams.set('language', 'ru');
  url.searchParams.set('format', 'json');

  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) throw new Error('HTTP_ERROR');

  const data = await res.json();
  if (!data || !Array.isArray(data.results)) return [];

  return data.results.map(r => ({
    id: String(r.id ?? `${r.latitude},${r.longitude}`),
    name: r.name,
    country: r.country,
    admin1: r.admin1 ?? '',
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

function normalizeForecast(api){
  const cw = api.current_weather;
  const daily = api.daily;

  const today3 = buildThreeDays(daily);
  const humidity = guessHumidity(api);

  const current = cw ? {
    time: cw.time,
    temperature: cw.temperature,
    windSpeed: cw.windspeed,
    weathercode: cw.weathercode,
    humidity,
  } : null;

  return { current, days: today3 };
}

function buildThreeDays(daily){
  if (!daily || !Array.isArray(daily.time)) return [];
  const out = [];
  for (let i = 0; i < Math.min(3, daily.time.length); i += 1){
    out.push({
      dateISO: daily.time[i],
      weathercode: daily.weathercode?.[i],
      tempMax: daily.temperature_2m_max?.[i],
      tempMin: daily.temperature_2m_min?.[i],
      windMax: daily.wind_speed_10m_max?.[i],
    });
  }
  return out;
}

function guessHumidity(api){
  const hourly = api.hourly;
  const cw = api.current_weather;
  if (!hourly || !Array.isArray(hourly.relativehumidity_2m)) return null;
  if (!cw || typeof cw.time !== 'string') return null;

  
  
  if (Array.isArray(hourly.time)){
    const idx = hourly.time.indexOf(cw.time);
    if (idx >= 0) return hourly.relativehumidity_2m[idx];
  }

  
  return hourly.relativehumidity_2m[0] ?? null;
}
