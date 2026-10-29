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
  const gallery = document.querySelector('#project-gallery');
  const status = document.querySelector('#gallery-status');
  if (!gallery || !status) return;
  gallery.replaceChildren();
  // Skip the sample stock images present in the old content sheet.
  // Only show photos explicitly added as real project images.
  const photos = rows.filter(row =>
    row.section === 'gallery' &&
    /^https:\/\//i.test(row.imageUrl || '') &&
    !/images\.unsplash\.com/i.test(row.imageUrl)
  );
  photos.forEach(photo => {
    const card = document.createElement('figure');
    card.className = 'gallery-card';
    const picture = document.createElement('img');
    picture.loading = 'lazy';
    picture.decoding = 'async';
    picture.src = photo.imageUrl;
    picture.alt = photo.title || 'All In Home Services completed project';
    picture.onerror = () => {
      card.remove();
      if (!gallery.children.length) status.hidden = false;
    };
    const label = document.createElement('figcaption');
    const heading = document.createElement('strong');
    heading.textContent = photo.title || 'Recent Project';
    label.append(heading);
    if (photo.description) {
      const description = document.createElement('span');
      description.textContent = photo.description;
      label.append(description);
    }
    card.append(picture, label);
    gallery.append(card);
  });
  status.hidden = photos.length > 0;
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
