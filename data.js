export const APP_STORAGE_KEY = 'weather_app_v1';

export const LIMIT_LOCATIONS = 3; 

export const GEO_LABEL = 'Текущее местоположение';

export const WEATHER_CODE_MAP = [
  
  { codes: [0], icon: './assets/clear.png', text: 'ясно' },
  { codes: [1, 2, 3], icon: './assets/cloud.png', text: 'облачно' },
  { codes: [45, 48], icon: './assets/mist.png', text: 'туман' },
  { codes: [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82], icon: './assets/rain.png', text: 'дождь' },
  { codes: [71, 73, 75, 77, 85, 86], icon: './assets/snow.png', text: 'снег' },
  { codes: [95, 96, 99], icon: './assets/rain.png', text: 'гроза' },
];
