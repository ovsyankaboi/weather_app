import { APP_STORAGE_KEY } from '../data.js';

export function loadState(){
  try{
    const raw = localStorage.getItem(APP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.locations)) return null;
    return parsed;
  }catch{
    return null;
  }
}

export function saveState(state){
  try{
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
  }catch{
    
  }
}
