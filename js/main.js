import { GEO_LABEL, LIMIT_LOCATIONS } from '../data.js';
import { fetchForecastByCoords } from './api.js';
import { loadState, saveState } from './storage.js';
import { attachCityAutocomplete } from './autocomplete.js';
import { qs, setVisible, setStatus, renderLocations, renderForecast, showNotFound } from './ui.js';

const refreshBtn = qs('refreshBtn');
const geoBtn = qs('geoBtn');

const setupEl = qs('setup');
const sidebarEl = qs('sidebar');
const contentEl = qs('content');

const primaryForm = qs('primaryCityForm');
const primaryInput = qs('primaryCityInput');
const primaryList = qs('primarySuggestions');
const primaryErr = qs('primaryCityError');

const addForm = qs('addCityForm');
const addInput = qs('addCityInput');
const addList = qs('addSuggestions');
const addErr = qs('addCityError');

let state = null;
let cache = new Map(); 

const primaryAC = attachCityAutocomplete({ inputEl: primaryInput, listEl: primaryList, errorEl: primaryErr });
const addAC = attachCityAutocomplete({ inputEl: addInput, listEl: addList, errorEl: addErr });

init();

function init(){
  state = loadState();

  if (!state){
    
    showSetup();
    requestGeolocation({ silentFail: true });
    return;
  }

  showApp();
  wireHandlers();
  renderLocations(state, selectLocation, deleteLocation);
  refreshAll();
}

function wireHandlers(){
  refreshBtn.addEventListener('click', () => refreshAll());

  geoBtn.addEventListener('click', () => requestGeolocation({ silentFail: false }));

  primaryForm.addEventListener('submit', onSubmitPrimaryCity);
  addForm.addEventListener('submit', onSubmitAddCity);
}

function showSetup(){
  wireHandlers();
  setVisible(setupEl, true);
  setVisible(sidebarEl, false);
  setVisible(contentEl, false);
  refreshBtn.disabled = true;
}

function showApp(){
  setVisible(setupEl, false);
  setVisible(sidebarEl, true);
  setVisible(contentEl, true);
  refreshBtn.disabled = false;
}

async function requestGeolocation({ silentFail }){
  if (!navigator.geolocation){
    if (!silentFail) primaryAC.setError('Геолокация не поддерживается в браузере.');
    return;
  }

  geoBtn.disabled = true;
  setStatus('Запрашиваем геопозицию…');

  navigator.geolocation.getCurrentPosition(
  (pos) => {
    geoBtn.disabled = false;

    const loc = {
      id: makeId('geo'),
      label: GEO_LABEL,
      kind: 'geo',
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };

    state = buildInitialState(loc);
    saveState(state);

    showApp();
    renderLocations(state, selectLocation, deleteLocation);
    refreshAll();
    setStatus('');
  },
  (err) => {
    geoBtn.disabled = false;
    setStatus('');
    if (silentFail) return;
    if (err?.code === 1) {
      primaryAC.setError('Геопозиция запрещена в настройках сайта/браузера.');
    } else if (err?.code === 2) {
      primaryAC.setError('Не удалось определить координаты. Проверьте, включена ли геолокация на устройстве.');
    } else if (err?.code === 3) {
      primaryAC.setError('Таймаут получения геопозиции. Попробуйте ещё раз.');
    } else {
      primaryAC.setError('Ошибка геопозиции. Проверьте консоль разработчика.');
    }
  },
  { enableHighAccuracy: false, timeout: 25_000, maximumAge: 60_000 }
);
}

function buildInitialState(primaryLoc){
  return {
    selectedId: primaryLoc.id,
    locations: [primaryLoc],
  };
}

function makeId(prefix){
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function selectLocation(id){
  if (!state) return;
  if (state.selectedId === id) return;
  state.selectedId = id;
  saveState(state);

  renderLocations(state, selectLocation, deleteLocation);

  const forecast = cache.get(id);
  if (forecast){
    renderForecast(getSelectedLabel(), forecast);
    setStatus('');
  }else{
    refreshSelected();
  }
}

function deleteLocation(id){
  if (!state) return;

  const primaryId = state.locations[0]?.id;
  if (id === primaryId) return;

  const idx = state.locations.findIndex(l => l.id === id);
  if (idx < 0) return;

  state.locations.splice(idx, 1);
  cache.delete(id);

  if (state.selectedId === id){
    state.selectedId = state.locations[0]?.id ?? null;
  }

  saveState(state);
  renderLocations(state, selectLocation, deleteLocation);
  refreshSelected();
}


function getSelected(){
  if (!state) return null;
  return state.locations.find(l => l.id === state.selectedId) || null;
}

function getSelectedLabel(){
  const loc = getSelected();
  if (!loc) return '';
  return loc.kind === 'geo' ? GEO_LABEL : loc.label;
}

async function refreshAll(){
  if (!state) return;

  refreshBtn.disabled = true;
  addInput.disabled = true;
  addForm.querySelector('button')?.setAttribute('disabled', 'true');

  setStatus('Загружаем прогноз…');
  cache = new Map();

  
  for (const loc of state.locations){
    try{
      const forecast = await fetchForecastByCoords({ latitude: loc.latitude, longitude: loc.longitude });
      cache.set(loc.id, forecast);
    }catch{
      cache.set(loc.id, null);
    }
  }

  refreshBtn.disabled = false;
  addInput.disabled = false;
  addForm.querySelector('button')?.removeAttribute('disabled');

  
  const loc = getSelected();
  const forecast = loc ? cache.get(loc.id) : null;

  if (!loc){
    setStatus('');
    showNotFound('Нет выбранной локации.');
    return;
  }

  if (!forecast){
    setStatus('');
    showNotFound('Ошибка загрузки прогноза. Нажмите «Обновить».');
    return;
  }

  setStatus('');
  renderForecast(getSelectedLabel(), forecast);
  renderLocations(state, selectLocation, deleteLocation);
}

async function refreshSelected(){
  const loc = getSelected();
  if (!loc) return;

  refreshBtn.disabled = true;
  setStatus('Загружаем прогноз…');

  try{
    const forecast = await fetchForecastByCoords({ latitude: loc.latitude, longitude: loc.longitude });
    cache.set(loc.id, forecast);
    setStatus('');
    renderForecast(getSelectedLabel(), forecast);
  }catch{
    cache.set(loc.id, null);
    setStatus('');
    showNotFound('Ошибка загрузки прогноза. Нажмите «Обновить».');
  }finally{
    refreshBtn.disabled = false;
  }
}

function onSubmitPrimaryCity(e){
  e.preventDefault();
  primaryAC.setError('');

  const selected = primaryAC.getSelected();
  if (!selected){
    primaryAC.setError('Выберите город из списка подсказок.');
    return;
  }

  const loc = {
    id: makeId('city'),
    label: selected.name,
    kind: 'city',
    latitude: selected.latitude,
    longitude: selected.longitude,
  };

  state = buildInitialState(loc);
  saveState(state);

  showApp();
  renderLocations(state, selectLocation, deleteLocation);
  refreshAll();
}

function onSubmitAddCity(e){
  e.preventDefault();
  addAC.setError('');

  if (!state) return;

  if (state.locations.length >= LIMIT_LOCATIONS){
    addAC.setError('Достигнут лимит: можно добавить только 2 дополнительных города.');
    return;
  }

  const selected = addAC.getSelected();
  if (!selected){
    addAC.setError('Выберите город из списка подсказок.');
    return;
  }

  
  const dup = state.locations.some(l =>
    Math.abs(l.latitude - selected.latitude) < 1e-6 &&
    Math.abs(l.longitude - selected.longitude) < 1e-6
  );
  if (dup){
    addAC.setError('Этот город уже добавлен.');
    return;
  }

  const loc = {
    id: makeId('city'),
    label: selected.name,
    kind: 'city',
    latitude: selected.latitude,
    longitude: selected.longitude,
  };

  state.locations.push(loc);
  saveState(state);

  addInput.value = '';
  addAC.clearSelected();

  renderLocations(state, selectLocation, deleteLocation);
  
  refreshAll();
}
