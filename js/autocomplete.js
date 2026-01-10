import { searchCities } from './api.js';


export function attachCityAutocomplete({ inputEl, listEl, errorEl }){
  let selected = null;
  let lastItems = [];

  function setError(text){
    if (!errorEl) return;
    errorEl.textContent = text || '';
  }

  function openList(items){
    lastItems = items;
    clearList();

    if (!items.length){
      listEl.style.display = 'none';
      return;
    }

    for (const item of items){
      const li = document.createElement('li');
      li.classList.add('suggestions__item');
      li.textContent = formatItem(item);
      li.tabIndex = 0;

      li.addEventListener('click', () => choose(item));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') choose(item);
      });

      listEl.appendChild(li);
    }
    listEl.style.display = 'block';
  }

  function clearList(){
    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
  }

  function closeList(){
    listEl.style.display = 'none';
    clearList();
  }

  function choose(item){
    selected = item;
    inputEl.value = formatValue(item);
    setError('');
    closeList();
  }

  function formatItem(item){
    const parts = [item.name];
    if (item.admin1) parts.push(item.admin1);
    if (item.country) parts.push(item.country);
    return parts.join(', ');
  }

  function formatValue(item){
    
    return item.admin1 ? `${item.name}, ${item.admin1}` : item.name;
  }

  async function onInput(){
    const q = inputEl.value.trim();
    selected = null;

    if (q.length < 2){
      closeList();
      return;
    }

    try{
      const items = await searchCities(q);
      openList(items);
    }catch{
      closeList();
      setError('Не удалось загрузить подсказки. Проверьте интернет.');
    }
  }

  inputEl.addEventListener('input', onInput);
  inputEl.addEventListener('blur', () => {
    
    window.setTimeout(closeList, 150);
  });

  return {
    getSelected: () => selected,
    clearSelected: () => { selected = null; },
    setError,
    setEnabled: (enabled) => { inputEl.disabled = !enabled; },
  };
}
