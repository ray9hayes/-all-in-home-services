const SHEET_URL = 'https://docs.google.com/spreadsheets/d/166qbrGDarzr5KMbz0bqxbO_cGwWKaUN4i4uJOYKaeZw/export?format=csv';
let contactEmail = 'Ray@allinhomeservices.org';
const menu = document.querySelector('#menu-toggle');
const navigation = document.querySelector('#navigation');
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  navigation.classList.toggle('open', open);
});
navigation.addEventListener('click', event => {
  if (event.target.closest('a')) { menu.setAttribute('aria-expanded', 'false'); navigation.classList.remove('open'); }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    menu.setAttribute('aria-expanded', 'false'); navigation.classList.remove('open'); menu.focus();
  }
});
document.querySelector('#year').textContent = new Date().getFullYear();
document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
  document.querySelector('#service-select').value = link.dataset.service;
}));
document.querySelector('#quote-form').addEventListener('submit', event => {
  event.preventDefault();
  const fields = new FormData(event.currentTarget);
  const subject = 'Project inquiry: ' + fields.get('service');
  const body = `Name: ${fields.get('name')}\nPhone: ${fields.get('phone')}\nService: ${fields.get('service')}\n\nProject details:\n${fields.get('message')}`;
  window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  document.querySelector('#form-status').textContent = 'Your request has not been sent yet. Send the draft in your email app, or call us if the app did not open.';
});
function parseCSV(text) {
  const matrix = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); if (row.some(Boolean)) matrix.push(row); row = []; cell = '';
    } else cell += char;
  }
  row.push(cell); if (row.some(Boolean)) matrix.push(row);
  const headers = matrix.shift() || [];
  if (!headers.includes('section') || !headers.includes('title')) throw new Error('Unexpected content format');
  return matrix.map(values => Object.fromEntries(headers.filter(Boolean).map(key => [key, values[headers.indexOf(key)] || ''])));
}
function renderProjectGallery(rows) {
  const container = document.querySelector('#project-gallery');
  const status = document.querySelector('#gallery-status');
  const dataTag = document.querySelector('#project-gallery-data');
  if (!container || !status || !dataTag) return;
  let projects = [];
  try { projects = JSON.parse(dataTag.textContent); } catch (_) {}
  container.replaceChildren();
  projects.forEach(project => {
    const card = document.createElement('article');
    card.className = 'project-card';
    const info = document.createElement('div');
    info.className = 'project-copy';
    const category = document.createElement('span');
    category.className = 'project-category';
    category.textContent = project.category || 'Our Work';
    const title = document.createElement('h3');
    title.textContent = project.title;
    const description = document.createElement('p');
    description.textContent = project.description;
    info.append(category, title, description);
    const imageGrid = document.createElement('div');
    imageGrid.className = 'project-photo-grid';
    project.images.forEach((src, index) => {
      const link = document.createElement('a');
      link.href = src;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', 'View ' + project.title + ' photo ' + (index + 1));
      const picture = document.createElement('img');
      picture.src = src;
      picture.alt = project.title + ' — photo ' + (index + 1);
      picture.loading = 'lazy';
      picture.decoding = 'async';
      picture.onerror = () => link.remove();
      link.append(picture);
      imageGrid.append(link);
    });
    card.append(imageGrid, info);
    container.append(card);
  });
  status.hidden = projects.length > 0;
}

function applyContent(rows) {
  renderProjectGallery(rows);
  const text = id => rows.find(row => row.id === id && row.title)?.title;
  const phone = text('phone');
  if (phone && phone.replace(/\D/g, '').length >= 10) {
    document.querySelectorAll('[data-phone]').forEach(link => { link.textContent = phone; link.href = 'tel:' + phone.replace(/\D/g, ''); });
  }
  const email = text('email');
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    contactEmail = email;
    document.querySelectorAll('[data-email]').forEach(link => { link.textContent = email; link.href = 'mailto:' + email; });
  }
  if (text('service_area')) document.querySelector('#service-area').textContent = text('service_area');
  if (text('site_title')) document.title = text('site_title');
  if (text('site_description')) document.querySelector('meta[name="description"]').content = text('site_description');
  const reviews = rows.filter(row => row.section === 'reviews' && row.title && row.description);
  const container = document.querySelector('#review-list');
  container.replaceChildren();
  reviews.forEach(review => {
    const card = document.createElement('article'); card.className = 'review-card';
    const quote = document.createElement('blockquote');
    if (/^[★☆\s]+$/.test(review.description)) {
      quote.className = 'stars'; quote.textContent = review.description; quote.setAttribute('aria-label', `${(review.description.match(/★/g) || []).length} stars`);
    } else quote.textContent = review.description;
    const name = document.createElement('div'); name.className = 'review-name'; name.textContent = review.title;
    card.append(quote, name); container.append(card);
  });
  if (!reviews.length) container.textContent = 'Visit our Google profile to share your experience.';
}
applyContent(JSON.parse(document.querySelector('#content-snapshot').textContent));
fetch(SHEET_URL, { signal: AbortSignal.timeout(8000) }).then(response => {
  if (!response.ok) throw new Error('Content unavailable');
  return response.text();
}).then(parseCSV).then(applyContent).catch(() => { /* Keep the included content snapshot when Google is unavailable. */ });
