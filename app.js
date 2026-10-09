const state = {
  entries: [],
  mode: 'english',
  source: 'all',
  includePlurals: false,
  current: null,
  revealed: false,
  baseCards: [],
  pluralCards: [],
  activeCards: [],
  cardIndex: 0,
  phase: 'words',
  round: 0,
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
  sourceFilter: document.querySelector('#source-filter'),
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
  return rows.slice(1).map(([welsh, english, partOfSpeech, plural, source], index) => ({ id: index, welsh, english, partOfSpeech, plural, source: source || 'M' })).filter((entry) => entry.welsh && entry.english);
}

function shuffleCards(cards, previousEntryId = null) {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  if (shuffled.length > 1 && shuffled[0].entry.id === previousEntryId) {
    const replacementIndex = shuffled.findIndex((card, index) => index > 0 && card.entry.id !== previousEntryId);
    if (replacementIndex > 0) [shuffled[0], shuffled[replacementIndex]] = [shuffled[replacementIndex], shuffled[0]];
  }
  return shuffled;
}

function getScopedEntries() {
  return state.source === 'all' ? state.entries : state.entries.filter((entry) => entry.source === state.source);
}

function updateDeckCount() {
  elements.deckCount.textContent = `${getScopedEntries().length} words in this deck`;
}

function populateSourceFilter() {
  const sources = [...new Set(state.entries.map((entry) => entry.source))].sort((left, right) => {
    if (left === 'M') return -1;
    if (right === 'M') return 1;
    if (/^\d+$/.test(left) && /^\d+$/.test(right)) return Number(left) - Number(right);
    return left.localeCompare(right, undefined, { numeric: true });
  });

  sources.forEach((source) => {
    const option = document.createElement('option');
    option.value = source;
    option.textContent = source === 'M' ? 'Mynediad' : (/^\d+$/.test(source) ? `Unit ${source}` : source);
    elements.sourceFilter.append(option);
  });
}

function createRound(previousEntryId = null) {
  const entries = getScopedEntries();
  state.baseCards = entries.map((entry) => {
    const direction = state.mode === 'random' ? (Math.random() > .5 ? 'english' : 'welsh') : state.mode;
    return { entry, direction, prompt: direction === 'english' ? entry.english : entry.welsh };
  });

  state.pluralCards = state.mode === 'welsh' && state.includePlurals
    ? entries.filter((entry) => entry.plural).map((entry) => ({ entry, direction: 'welsh', prompt: entry.plural, isPlural: true }))
    : [];
  state.activeCards = shuffleCards(state.baseCards, previousEntryId);
  state.cardIndex = 0;
  state.phase = 'words';
  state.round += 1;
}

function resetSession() {
  state.current = null;
  state.revealed = false;
  state.round = 0;
  createRound();
  showNextCard();
}

function sessionProgress() {
  if (state.phase === 'plurals') {
    return `Plural ${state.cardIndex} of ${state.activeCards.length}`;
  }
  return `Round ${state.round} · Word ${state.cardIndex} of ${state.baseCards.length}`;
}

function showNextCard() {
  if (!state.activeCards.length) return;
  if (state.cardIndex >= state.activeCards.length) {
    if (state.phase === 'words' && state.pluralCards.length) {
      const previousEntryId = state.current?.entry.id;
      state.activeCards = shuffleCards(state.pluralCards, previousEntryId);
      state.cardIndex = 0;
      state.phase = 'plurals';
    } else {
      createRound(state.current?.entry.id);
    }
  }

  state.current = state.activeCards[state.cardIndex];
  state.cardIndex += 1;
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
  elements.progress.textContent = sessionProgress();
}

function handleCardClick() {
  if (!state.current) return;
  if (state.revealed) showNextCard();
  else { state.revealed = true; renderCard(); }
}

elements.sourceFilter.addEventListener('change', () => {
  state.source = elements.sourceFilter.value;
  updateDeckCount();
  resetSession();
});

document.querySelectorAll('.mode-button').forEach((button) => {
  button.addEventListener('click', () => {
    if (state.mode === button.dataset.mode) return;
    state.mode = button.dataset.mode;
    document.querySelectorAll('.mode-button').forEach((item) => item.classList.toggle('is-active', item === button));
    elements.pluralToggle.disabled = state.mode !== 'welsh';
    state.includePlurals = elements.pluralToggle.checked && state.mode === 'welsh';
    resetSession();
  });
});

elements.pluralToggle.addEventListener('change', () => {
  state.includePlurals = elements.pluralToggle.checked;
  resetSession();
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
    populateSourceFilter();
    updateDeckCount();
    elements.card.disabled = false;
    resetSession();
  })
  .catch(() => {
    elements.kicker.textContent = 'Deck unavailable';
    elements.word.textContent = 'Try again soon';
    elements.hint.textContent = 'The vocabulary file could not be loaded';
    elements.progress.textContent = 'Unable to load deck';
    elements.deckCount.textContent = 'Check that the CSV is deployed with this page';
  });