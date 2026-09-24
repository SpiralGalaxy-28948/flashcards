const state = {
  entries: [],
  mode: 'english',
  includePlurals: false,
  current: null,
  revealed: false,
};

const elements = {
  card: document.querySelector('#flashcard'),
  face: document.querySelector('#card-face'),
  kicker: document.querySelector('#card-kicker'),
  word: document.querySelector('#card-word'),
  hint: document.querySelector('#card-hint'),
  instruction: document.querySelector('#card-instruction'),
  progress: document.querySelector('#progress-label'),
  deckCount: document.querySelector('#deck-count'),
  pluralToggle: document.querySelector('#plural-toggle'),
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') { cell += '"'; index += 1; continue; }
    if (character === '"') { quoted = !quoted; continue; }
    if (character === ',' && !quoted) { row.push(cell.trim()); cell = ''; continue; }
    if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = ''; continue;
    }
    cell += character;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows.slice(1).map(([welsh, english, partOfSpeech, plural]) => ({ welsh, english, partOfSpeech, plural })).filter((entry) => entry.welsh && entry.english);
}

function randomItem(items) { return items[Math.floor(Math.random() * items.length)]; }

function getCards() {
  const cards = [];
  state.entries.forEach((entry) => {
    const direction = state.mode === 'random' ? (Math.random() > .5 ? 'english' : 'welsh') : state.mode;
    cards.push({ entry, direction, prompt: direction === 'english' ? entry.english : entry.welsh });
    if (state.mode === 'welsh' && state.includePlurals && entry.plural) {
      cards.push({ entry, direction: 'welsh', prompt: entry.plural, isPlural: true });
    }
  });
  return cards;
}

function nextCard() {
  const cards = getCards();
  if (!cards.length) return;
  state.current = randomItem(cards);
  state.revealed = false;
  renderCard();
}

function renderCard() {
  const card = state.current;
  if (!card) return;
  const answer = card.direction === 'english' ? card.entry.welsh : card.entry.english;
  elements.face.classList.remove('card-face');
  void elements.face.offsetWidth;
  elements.face.classList.add('card-face');
  elements.card.classList.toggle('is-revealed', state.revealed);
  elements.kicker.textContent = state.revealed ? 'Translation' : (card.direction === 'english' ? 'English' : 'Cymraeg');
  elements.word.textContent = state.revealed ? answer : card.prompt;
  elements.hint.textContent = state.revealed ? (card.isPlural ? 'Plural form' : 'Click for the next card') : 'Click to reveal';
  elements.card.setAttribute('aria-label', state.revealed ? `Translation: ${answer}. Click for the next card.` : 'Reveal answer');
  elements.instruction.textContent = state.revealed ? 'Click again for a new challenge' : 'Click the card to reveal the translation';
  elements.progress.textContent = state.revealed ? 'Answer revealed' : 'Challenge in progress';
}

function handleCardClick() {
  if (!state.current) return;
  if (state.revealed) nextCard();
  else { state.revealed = true; renderCard(); }
}

document.querySelectorAll('.mode-button').forEach((button) => {
  button.addEventListener('click', () => {
    state.mode = button.dataset.mode;
    document.querySelectorAll('.mode-button').forEach((item) => item.classList.toggle('is-active', item === button));
    elements.pluralToggle.disabled = state.mode !== 'welsh';
    state.includePlurals = elements.pluralToggle.checked && state.mode === 'welsh';
    nextCard();
  });
});

elements.pluralToggle.addEventListener('change', () => {
  state.includePlurals = elements.pluralToggle.checked;
  nextCard();
});
elements.card.addEventListener('click', handleCardClick);

document.addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && document.activeElement === elements.card) {
    event.preventDefault();
    handleCardClick();
  }
});

fetch('welsh_vocab_337_349.csv')
  .then((response) => { if (!response.ok) throw new Error('Vocabulary could not be loaded'); return response.text(); })
  .then((text) => {
    state.entries = parseCsv(text);
    elements.deckCount.textContent = `${state.entries.length} words in this deck`;
    elements.card.disabled = false;
    nextCard();
  })
  .catch(() => {
    elements.kicker.textContent = 'Deck unavailable';
    elements.word.textContent = 'Try again soon';
    elements.hint.textContent = 'The vocabulary file could not be loaded';
    elements.progress.textContent = 'Unable to load deck';
    elements.deckCount.textContent = 'Check that the CSV is deployed with this page';
  });