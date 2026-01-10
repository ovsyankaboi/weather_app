import { GEO_LABEL, LIMIT_LOCATIONS } from '../data.js';
import { mapWeatherCode } from './api.js';

export function qs(id){ return document.getElementById(id); }

export function setVisible(el, isVisible){
  if (!el) return;
  el.hidden = !isVisible;
}

export function setStatus(text){
  const status = qs('status');
  if (!status) return;
  status.textContent = text || '';
}

export function clearNode(node){
  while (node && node.firstChild) node.removeChild(node.firstChild);
}

export function renderLocations(state, onSelect, onDelete){
  const list = qs('locationsList');
  const count = qs('locationsCount');
  if (!list || !count) return;

  clearNode(list);
  count.textContent = `${state.locations.length}/${LIMIT_LOCATIONS}`;

  const primaryId = state.locations[0]?.id;

  for (const loc of state.locations){
    const li = document.createElement('li');

    const row = document.createElement('div');
    row.classList.add('locations__row');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.classList.add('locbtn');
    btn.setAttribute('aria-current', String(loc.id === state.selectedId));

    const left = document.createElement('div');

    const title = document.createElement('div');
    title.textContent = loc.label;

    const sub = document.createElement('div');
    sub.classList.add('locbtn__sub');
    sub.textContent = loc.kind === 'geo' ? GEO_LABEL : 'город';

    left.appendChild(title);
    left.appendChild(sub);

    const right = document.createElement('span');
    right.classList.add('locbtn__sub');
    right.textContent = '→';

    btn.appendChild(left);
    btn.appendChild(right);

    btn.addEventListener('click', () => onSelect(loc.id));
    row.appendChild(btn);

    const canDelete = typeof onDelete === 'function'
      && loc.kind === 'city'
      && loc.id !== primaryId
      && state.locations.length > 1;

    if (canDelete){
      const del = document.createElement('button');
      del.type = 'button';
      del.classList.add('delbtn');
      del.setAttribute('aria-label', `Удалить город ${loc.label}`);
      del.textContent = '×';
      del.addEventListener('click', () => onDelete(loc.id));
      row.appendChild(del);
    }

    li.appendChild(row);
    list.appendChild(li);
  }
}


export function renderForecast(locLabel, forecast){
  const currentEl = qs('current');
  const forecastEl = qs('forecast');
  const grid = qs('forecastGrid');
  const notfound = qs('notfound');

  if (!currentEl || !forecastEl || !grid || !notfound) return;

  setVisible(notfound, false);

  
  clearNode(currentEl);
  if (forecast?.current){
    const { icon, text } = mapWeatherCode(forecast.current.weathercode);

    const img = document.createElement('img');
    img.classList.add('current__icon');
    img.src = icon;
    img.alt = text;

    const main = document.createElement('div');
    main.classList.add('current__main');

    const temp = document.createElement('div');
    temp.classList.add('current__temp');
    temp.textContent = `${Math.round(forecast.current.temperature)}°C`;

    const desc = document.createElement('div');
    desc.classList.add('current__desc');
    desc.textContent = `${locLabel} • ${text}`;

    const meta = document.createElement('div');
    meta.classList.add('current__meta');

    const wind = document.createElement('span');
    wind.textContent = `ветер: ${Math.round(forecast.current.windSpeed)} км/ч`;

    meta.appendChild(wind);

    if (typeof forecast.current.humidity === 'number'){
      const hum = document.createElement('span');
      hum.textContent = `влажность: ${Math.round(forecast.current.humidity)}%`;
      meta.appendChild(hum);
    }

    main.appendChild(temp);
    main.appendChild(desc);
    main.appendChild(meta);

    currentEl.appendChild(img);
    currentEl.appendChild(main);

    setVisible(currentEl, true);
  }else{
    setVisible(currentEl, false);
  }

  
  clearNode(grid);
  if (Array.isArray(forecast?.days) && forecast.days.length > 0){
    for (const day of forecast.days){
      grid.appendChild(buildDayCard(day));
    }
    setVisible(forecastEl, true);
  }else{
    setVisible(forecastEl, false);
  }
}

export function showNotFound(text){
  const currentEl = qs('current');
  const forecastEl = qs('forecast');
  const notfound = qs('notfound');
  const notfoundText = qs('notfoundText');

  setVisible(currentEl, false);
  setVisible(forecastEl, false);
  setVisible(notfound, true);

  if (notfoundText) notfoundText.textContent = text || 'Не удалось получить прогноз.';
}

function buildDayCard(day){
  const card = document.createElement('div');
  card.classList.add('day');

  const title = document.createElement('p');
  title.classList.add('day__title');
  title.textContent = formatDayTitle(day.dateISO);

  const row = document.createElement('div');
  row.classList.add('day__row');

  const left = document.createElement('div');
  const { icon, text } = mapWeatherCode(day.weathercode);

  const img = document.createElement('img');
  img.classList.add('day__icon');
  img.src = icon;
  img.alt = text;

  const temps = document.createElement('div');
  temps.classList.add('day__temps');
  const max = typeof day.tempMax === 'number' ? Math.round(day.tempMax) : '—';
  const min = typeof day.tempMin === 'number' ? Math.round(day.tempMin) : '—';
  temps.textContent = `${min}°C … ${max}°C`;

  left.appendChild(img);

  const right = document.createElement('div');
  right.appendChild(temps);

  row.appendChild(left);
  row.appendChild(right);

  card.appendChild(title);
  card.appendChild(row);

  return card;
}

function formatDayTitle(dateISO){
  
  const d = new Date(`${dateISO}T00:00:00`);
  const today = new Date();
  const strip = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();

  const deltaDays = Math.round((strip(d) - strip(today)) / (1000*60*60*24));
  if (deltaDays === 0) return 'Сегодня';
  if (deltaDays === 1) return 'Завтра';

  return d.toLocaleDateString('ru-RU', { weekday: 'short', day: '2-digit', month: '2-digit' });
}
