let selectedCards = [];
let history = [];
let targetSlotIndex = null;

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const RANK_VAL = {'A':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13};

// Definimos tus 6 imágenes estáticas de la empresa
const COMPANY_IMAGES = [
  "assets/img/1.jpg",
  "assets/img/2.jpg",
  "assets/img/3.jpg",
  "assets/img/4.jpg",
  "assets/img/5.jpg",
  "assets/img/6.jpg"
];

document.addEventListener('DOMContentLoaded', () => {
  // Iniciar el juego automáticamente al cargar la página
  startGame();
  
  const resetBtn = document.getElementById('resetBtn');
  if(resetBtn) resetBtn.onclick = () => resetGame();
  
  const undoBtn = document.getElementById('undoBtn');
  if(undoBtn) undoBtn.onclick = undoMove;
});

function openMarketing() {
  window.open('https://demo-autos.pideya.contact/', '_blank');
}
function startGame() {
  const sndFondo = document.getElementById('sndFondo');
  if(sndFondo) sndFondo.play().catch(()=>{});
  resetGame();
}

function resetGame() {
  restoreFoundationLabels();
  clearPiles();
  hideStockHint();
  history = [];
  selectedCards = [];
  let deck = [];
  SUITS.forEach(s => RANKS.forEach(r => deck.push({
    suit: s, rank: r, color: (s==='hearts'||s==='diamonds') ? 'red' : 'black'
  })));
  deck.sort(() => Math.random() - 0.5);
  for(let i=0; i<7; i++) {
    const t = document.getElementById(`t-${i}`);
    for(let j=0; j<=i; j++) createCard(deck.pop(), t, (j===i));
  }
  const stock = document.getElementById('stock');
  deck.forEach(d => createCard(d, stock, false));
}

function restoreFoundationLabels() {
  const labels = { 'f-hearts':'♥', 'f-diamonds':'♦', 'f-clubs':'♣', 'f-spades':'♠' };
  Object.entries(labels).forEach(([id, icon]) => {
    const el = document.getElementById(id);
    if(el) el.textContent = icon;
  });
}

function clearPiles() {
  ['waste', 't-0','t-1','t-2','t-3','t-4','t-5','t-6'].forEach(id => {
    const el = document.getElementById(id);
    if(el) while(el.lastElementChild) el.removeChild(el.lastElementChild);
  });
  const stock = document.getElementById('stock');
  if(stock) Array.from(stock.children).forEach(ch => { if(ch.id !== 'stock-hint') ch.remove(); });
}

function createCard(data, container, isFaceUp) {
  const card = document.createElement('div');
  card.className = isFaceUp ? 'card' : 'card back';
  card.dataset.suit = data.suit;
  card.dataset.rank = data.rank;
  card.dataset.color = data.color;
  
  // Selecciona una imagen aleatoria de las 6 disponibles en assets/img/
  const chosen = COMPANY_IMAGES[Math.floor(Math.random() * COMPANY_IMAGES.length)];
  
  card.innerHTML = `
    <img src="assets/img/logo.png" class="logo-back" alt="Logo">
    <div class="card-content">
      <div class="rank-txt" style="color:${data.color}">${data.rank}${getSym(data.suit)}</div>
      <img src="${chosen}" class="guest-img" alt="Foto">
    </div>`;

  if(container.id !== 'stock') {
    card.onclick = (e) => { e.stopPropagation(); handleCardClick(card); };
  }
  container.appendChild(card);
}

function handleStockClick() {
  const stock = document.getElementById('stock');
  const waste = document.getElementById('waste');
  const stockCards = Array.from(stock.children).filter(ch => ch.classList.contains('card'));
  if(stockCards.length > 0) {
    saveHistory();
    const card = stockCards[stockCards.length - 1];
    card.classList.remove('back');
    waste.appendChild(card);
    card.onclick = (e) => { e.stopPropagation(); handleCardClick(card); };
    playSound('sndClick');
    if(Array.from(stock.children).filter(ch => ch.classList.contains('card')).length === 0) showStockHint();
  } else if (waste.children.length > 0) {
    saveHistory();
    while(waste.lastElementChild) {
      const c = waste.lastElementChild;
      c.classList.add('back');
      c.onclick = null;
      stock.appendChild(c);
    }
    hideStockHint();
    playSound('sndClick');
  }
}

function handleCardClick(card) {
  const parent = card.parentElement;
  if(!parent) return;

  if(card.classList.contains('back')) {
    if(!card.nextElementSibling) {
      saveHistory();
      card.classList.remove('back');
      playSound('sndClick');
      card.onclick = (e) => { e.stopPropagation(); handleCardClick(card); };
    } else {
      playSound('sndError');
    }
    return;
  }

  if(parent.id === 'waste' && card !== parent.lastElementChild) {
    playSound('sndError');
    return;
  }

  if(selectedCards.length === 0) {
    const kids = Array.from(parent.children);
    selectedCards = kids.slice(kids.indexOf(card));
    selectedCards.forEach(c => c.classList.add('selected'));
  } else {
    const targetStack = parent;
    if(targetStack.classList.contains('foundation')) {
        moveToFoundation(targetStack.dataset.suit);
        return;
    }
    if(isValidMove(selectedCards[0], card)) {
      saveHistory();
      const origin = selectedCards[0].parentElement;
      selectedCards.forEach(c => targetStack.appendChild(c));
      revealTopIfNeededFromOrigin(origin);
      playSound('sndAcierto');
    } else {
      playSound('sndError');
    }
    clearSelection();
  }
}

function isValidMove(active, target) {
  const vA = RANK_VAL[active.dataset.rank];
  const vT = RANK_VAL[target.dataset.rank];
  return (vA === vT - 1 && active.dataset.color !== target.dataset.color);
}

function moveToTableau(idx) {
  const t = document.getElementById(`t-${idx}`);
  if(selectedCards.length > 0 && t && t.children.length === 0) {
    if(selectedCards[0].dataset.rank === 'K') {
      saveHistory();
      const origin = selectedCards[0].parentElement;
      selectedCards.forEach(c => t.appendChild(c));
      revealTopIfNeededFromOrigin(origin);
      playSound('sndAcierto');
    } else {
      playSound('sndError');
    }
  }
  clearSelection();
}

function moveToFoundation(suit) {
  if (selectedCards.length === 0) { clearSelection(); return; }
  
  const card = selectedCards[selectedCards.length - 1];
  const origin = card.parentElement;
  const f = document.getElementById(`f-${suit}`);
  
  if (!f || card.nextElementSibling) { playSound('sndError'); clearSelection(); return; }
  
  const fCards = Array.from(f.children).filter(el => el.classList.contains('card'));
  let canPlace = false;
  
  if (fCards.length === 0) {
    if (RANK_VAL[card.dataset.rank] === 1 && card.dataset.suit === suit) {
      canPlace = true;
    }
  } else {
    const topCard = fCards[fCards.length - 1];
    if (card.dataset.suit === suit && RANK_VAL[card.dataset.rank] === RANK_VAL[topCard.dataset.rank] + 1) {
      canPlace = true;
    }
  }

  if (canPlace) {
    saveHistory();
    f.appendChild(card);
    Object.assign(card.style, { position:"absolute", top:"0", left:"0", marginTop:"0", zIndex:"10" });
    card.classList.remove('selected');
    revealTopIfNeededFromOrigin(origin);
    playSound('sndAcierto');
    checkWin();
  } else {
    playSound('sndError');
  }
  clearSelection();
}

function checkWin() {
  let totalCards = 0;
  document.querySelectorAll('.foundation').forEach(f => {
    totalCards += f.querySelectorAll('.card').length;
  });
  if (totalCards === 52) celebrate();
}

function celebrate() {
  const sndV = document.getElementById('sndVictoria');
  if(sndV) { sndV.currentTime = 0; sndV.play().catch(()=>{}); }
  const items = ['🥳', '🎊', '✨', '🏨'];
  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      const p = document.createElement('div');
      p.innerText = items[Math.floor(Math.random() * items.length)];
      p.className = 'celebration-item';
      p.style.left = Math.random() * 100 + "vw";
      p.style.animationDuration = (Math.random() * 2 + 2) + "s";
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 4000);
    }, i * 60);
  }
  setTimeout(() => alert("ES: ¡GANASTE! / EN: YOU WIN!"), 1000);
}

function revealTopIfNeededFromOrigin(origin) {
  if(!origin) return;
  const top = origin.lastElementChild;
  if(top && top.classList.contains('back')) {
    top.classList.remove('back');
    top.onclick = (e) => { e.stopPropagation(); handleCardClick(top); };
  }
}

function saveHistory() {
  try {
    const state = {
      s: getLightState('stock'),
      w: getLightState('waste'),
      t: Array.from({length:7}, (_,i) => getLightState(`t-${i}`)),
      f: Array.from({length:4}, (_,i) => getLightState(document.querySelectorAll('.foundation')[i].id))
    };
    history.push(state);
    if(history.length > 20) history.shift();
  } catch(e) { console.warn("Memory protection triggered."); }
}

function getLightState(id) {
  const el = document.getElementById(id);
  if(!el) return [];
  return Array.from(el.querySelectorAll('.card')).map(c => ({
    suit: c.dataset.suit,
    rank: c.dataset.rank,
    color: c.dataset.color,
    back: c.classList.contains('back'),
    imgSrc: c.querySelector('.guest-img') ? c.querySelector('.guest-img').src : ''
  }));
}

function undoMove() {
  if(history.length === 0) return;
  const s = history.pop();
  restorePila('stock', s.s);
  restorePila('waste', s.w);
  s.t.forEach((cards, i) => restorePila(`t-${i}`, cards));
  const foundations = document.querySelectorAll('.foundation');
  s.f.forEach((cards, i) => restorePialCustom(foundations[i].id, cards, true));
  
  if(Array.from(document.getElementById('stock').children).filter(c=>c.classList.contains('card')).length === 0 && document.getElementById('waste').children.length > 0) showStockHint(); else hideStockHint();
}

function restorePila(id, cards, isF = false) {
  const el = document.getElementById(id);
  if(!el) return;
  Array.from(el.children).forEach(ch => { if(ch.id !== 'stock-hint') ch.remove(); });
  cards.forEach(c => {
    const card = document.createElement('div');
    card.className = c.back ? 'card back' : 'card';
    card.dataset.suit = c.suit;
    card.dataset.rank = c.rank;
    card.dataset.color = c.color;
    
    card.innerHTML = `<img src="assets/img/logo.png" class="logo-back"><div class="card-content"><div class="rank-txt" style="color:${c.color}">${c.rank}${getSym(c.suit)}</div><img src="${c.imgSrc || COMPANY_IMAGES[0]}" class="guest-img"></div>`;
    if(id !== 'stock') card.onclick = (e) => { e.stopPropagation(); handleCardClick(card); };
    if(isF) Object.assign(card.style, { position:"absolute", top:"0", left:"0", marginTop:"0", zIndex:"10" });
    el.appendChild(card);
  });
}

function restorePialCustom(id, cards, isF = false) {
  restorePila(id, cards, isF);
}

function clearSelection() {
  selectedCards.forEach(c => c.classList.remove('selected'));
  selectedCards = [];
}

function getSym(s) { return {'hearts':'♥','diamonds':'♦','clubs':'♣','spades':'♠'}[s]; }
function playSound(id) { const snd = document.getElementById(id); if(snd) { snd.currentTime = 0; snd.play().catch(()=>{}); } }

function showStockHint() { const el = document.getElementById('stock-hint'); if(el) el.classList.et ? el.classList.remove('hidden') : el.classList.remove('hidden'); }
function hideStockHint() { const el = document.getElementById('stock-hint'); if(el) el.classList.add('hidden'); }

let isGlobalMuted = false;

function toggleAllAudio() {
  isGlobalMuted = !isGlobalMuted;
  const audioTags = document.querySelectorAll('audio');
  audioTags.forEach(audio => {
    audio.muted = isGlobalMuted;
  });
  const muteIcon = document.getElementById('muteIcon');
  if (muteIcon) {
    muteIcon.className = isGlobalMuted ? "fas fa-volume-mute" : "fas fa-volume-up";
  }
}