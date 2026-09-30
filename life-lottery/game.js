// Life Lottery (dice, 1-100 life points): UI + pixel scenes
(function () {
  const $ = id => document.getElementById(id);
  const cv = $('cv'), g = cv.getContext('2d');
  const W = 160, H = 96;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const D = window.DICE, DATA = window.US_DATA;
  let L = null, frame = 0, busy = false;

  // ---------- helpers ----------
  const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)] || 'th');
  // Family (household) income at a percentile, for childhood. Adult earnings use D.earnings.
  function dollars(p) {
    const T = DATA.dollars;
    for (let i = 1; i < T.length; i++) if (p <= T[i][0]) { const [a, va] = T[i - 1], [b, vb] = T[i]; return va + (vb - va) * (p - a) / (b - a); }
    return T[T.length - 1][1];
  }
  const money = v => '$' + (v >= 1000 ? Math.round(v / 1000) + 'K' : Math.round(v));
  const FIFTHS = ['bottom fifth', 'second fifth', 'middle fifth', 'fourth fifth', 'top fifth'];
  const fifth = D.fifth;
  const kidWord = gd => gd === 'f' ? 'girls' : 'boys';
  const who = (race, gd) => `${D.RACES[race]} ${kidWord(gd)}`;
  const srcLinks = keys => (keys || []).map(k => `<a href="${D.SRC[k][1]}" target="_blank" rel="noopener">${D.SRC[k][0]}</a>`).join(' &middot; ');

  // ---------- pixel art ----------
  const SKIN = { white: ['#f3cfb1', '#e8b894'], asian: ['#efc9a0', '#d9a878'], hisp: ['#d9a36f', '#b98050'], aian: ['#c98e5c', '#a8704a'], black: ['#8d5a3b', '#5e3b26'] };
  const HAIR = { white: ['#5a3a22', '#d9b25f', '#2a1d16'], asian: ['#1a1418', '#2a1d16', '#1a1418'], hisp: ['#1a1418', '#3b2718', '#2a1d16'], aian: ['#1a1418', '#1a1418', '#2a1d16'], black: ['#1a1418', '#2a1d16', '#1a1418'] };
  function px(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x | 0, y | 0, w, h); }
  const SPR = {
    adult_m: ['..hhhh..', '.hhhhhh.', '.hssssh.', '..seses.', '..ssss..', '...ss...', '.cccccc.', 'cccccccc', 's.cccc.s', 's.cccc.s', '..pppp..', '..p..p..', '..p..p..', '.bb..bb.'],
    adult_f: ['..hhhh..', '.hhhhhh.', 'hhssssh.', 'h.seses.', 'h.ssss..', 'h..ss...', '.cccccc.', 'cccccccc', 's.cccc.s', 's.cccc.s', '..cccc..', '.cccccc.', '..s..s..', '.bb..bb.'],
    kid: ['.hhhh.', 'hhhhhh', 'hsssss', '.seses', '.ssss.', 'cccccc', 's.cc.s', '.pppp.', '.p..p.', 'bb..bb'],
    baby: ['..hh..', '.ssss.', '.seses', '.wwww.', 'wwwwww', '.wwww.'],
  };
  function drawSprite(name, x, y, pal, step) {
    const rows = SPR[name];
    rows.forEach((row, j) => {
      let r = row;
      if (step && j === rows.length - 1 && name !== 'baby') r = r.replace('.bb..bb.', 'bb....bb').replace('bb..bb', '.bbbb.');
      for (let i = 0; i < r.length; i++) { const ch = r[i]; if (ch !== '.') px(x + i * 2, y + j * 2, 2, 2, pal[ch] || '#f0f'); }
    });
  }
  function sceneFor() {
    const a = L.age;
    if (L.over) return 'end';
    if (a < 15 || a === 33 || a === 48) return 'home';
    if (a === 15) return 'school';
    if (a <= 20) return L.lp > 40 ? 'campus' : 'work';
    return 'work';
  }
  function palette(sc) {
    const s = SKIN[L.race][L.tone % 2], h = HAIR[L.race][L.tone % 3], hi = L.lp > 50;
    let c = '#4d7fd6', p = '#2f3558';
    if (sc === 'school') c = '#d9544d';
    if (sc === 'campus') c = '#6b4fa8';
    if (sc === 'work') { c = hi ? '#e8e2d4' : '#f28c28'; p = hi ? '#2d2f45' : '#3a4a6b'; }
    if (sc === 'end') c = '#9aa7b8';
    return { h, s, e: '#1a1418', c, p, b: '#1a1418', w: '#f4f0e6' };
  }
  function sky(top, bottom) { for (let y = 0; y < 70; y++) px(0, y, W, 1, y > 45 ? bottom : y < 35 ? top : (y % 2 ? top : bottom)); }
  function ground(c1, c2) { px(0, 70, W, 26, c1); for (let x = 0; x < W; x += 4) px(x + (frame % 4), 72, 2, 1, c2); }
  function windowGrid(x, y, cols, rows, lit) { for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) px(x + i * 6, y + j * 7, 3, 4, ((i * 7 + j * 3) % 5 < lit) ? '#ffd27a' : '#3a3556'); }
  function cloud(x, y) { px(x, y, 12, 3, '#e8e2f2'); px(x + 3, y - 2, 6, 2, '#e8e2f2'); }
  function home(q) {
    if (q === 0) { px(16, 14, 64, 56, '#8c6e5a'); windowGrid(21, 18, 9, 5, 2); px(16, 52, 64, 18, '#6a8fb0'); px(22, 55, 40, 6, '#e8e2d4'); px(24, 57, 36, 2, '#4a6a8a'); px(66, 56, 10, 14, '#3a3556'); }
    if (q === 1) { px(14, 36, 80, 34, '#c9b48f'); px(10, 28, 88, 8, '#7a4a3a'); windowGrid(20, 42, 3, 2, 1); windowGrid(62, 42, 3, 2, 1); px(46, 50, 10, 20, '#5a3a2e'); px(52, 30, 4, 10, '#8a8a8a'); }
    if (q === 2) { px(20, 38, 64, 32, '#e6d8b8'); px(14, 30, 76, 8, '#8b3a2e'); px(24, 24, 56, 6, '#8b3a2e'); windowGrid(28, 44, 2, 2, 2); windowGrid(62, 44, 2, 2, 2); px(48, 52, 10, 18, '#3e6b4e'); px(100, 44, 18, 16, '#4a8a4a'); px(107, 60, 4, 10, '#6b4a2b'); }
    if (q === 3) { px(14, 30, 88, 40, '#f0ead8'); px(8, 22, 100, 8, '#3d4a6b'); windowGrid(22, 36, 5, 3, 4); px(52, 50, 12, 20, '#3d4a6b'); px(112, 30, 24, 26, '#3f8a4a'); px(122, 56, 4, 14, '#6b4a2b'); px(104, 64, 36, 6, '#d8d2c0'); }
    if (q === 4) { px(6, 20, 110, 50, '#f4f0e4'); px(2, 12, 118, 8, '#2f3a54'); for (let i = 0; i < 5; i++) px(14 + i * 20, 26, 4, 44, '#ffffff'); windowGrid(10, 26, 16, 4, 5); px(52, 50, 16, 20, '#2f3a54'); px(124, 58, 28, 8, '#b32d2d'); px(128, 54, 18, 5, '#b32d2d'); px(128, 66, 5, 4, '#1a1418'); px(144, 66, 5, 4, '#1a1418'); }
  }
  function titleScene() {
    sky('#2b2451', '#4a3f73');
    for (let i = 0; i < 30; i++) { const x = (i * 53) % W, y = (i * 29) % 40; px(x, y, 1, 1, (frame >> 4) % 2 && i % 3 === 0 ? '#4a3f73' : '#f1e7d0'); }
    ground('#2f3f3a', '#263530');
    for (let y = 8; y < 70; y += 6) px(116, y, 22, 2, '#f2a541');
    px(116, 6, 2, 64, '#f2a541'); px(136, 6, 2, 64, '#f2a541');
    px(10, 40, 18, 30, '#3a3464'); px(30, 30, 14, 40, '#3a3464'); px(46, 46, 22, 24, '#3a3464'); px(70, 36, 12, 34, '#3a3464'); px(84, 50, 18, 20, '#3a3464');
    windowGrid(12, 44, 3, 3, 2); windowGrid(32, 34, 2, 5, 2); windowGrid(72, 40, 2, 4, 1);
    px(58, 58, 10, 10, '#f1e7d0'); px(60, 60, 2, 2, '#1b1830'); px(64, 64, 2, 2, '#1b1830'); px(62, 62, 2, 2, '#1b1830');
  }
  function scene() {
    if (!L) { titleScene(); return; }
    const sc = sceneFor(), q = fifth(L.lp);
    sky(sc === 'end' ? '#e98a5b' : '#6fa8dc', sc === 'end' ? '#f2c078' : '#9cc6e8');
    cloud((frame * .3 + 20) % 190 - 20, 12); cloud((frame * .2 + 110) % 190 - 20, 22);
    ground('#4f8a4b', '#3f7a3c');
    if (sc === 'home' || sc === 'end') home(q);
    if (sc === 'school') { px(20, 30, 70, 40, '#b5523b'); windowGrid(26, 36, 10, 4, 2); px(48, 56, 12, 14, '#5a3325'); px(95, 20, 1, 50, '#ccc'); px(96, 20, 10, 6, '#d9544d'); px(96, 23, 10, 1, '#fff'); }
    if (sc === 'campus') { px(12, 34, 84, 36, '#d9d1bd'); px(8, 30, 92, 5, '#c2b89f'); px(30, 18, 48, 12, '#d9d1bd'); for (let i = 0; i < 7; i++) px(18 + i * 11, 38, 4, 32, '#efe8d6'); px(118, 40, 20, 18, '#3e8a4e'); px(126, 58, 4, 12, '#6b4a2b'); }
    if (sc === 'work') {
      if (L.lp > 50) { px(14, 8, 44, 62, '#4a5a7a'); windowGrid(17, 12, 7, 8, 3); px(62, 26, 34, 44, '#5b6b8c'); windowGrid(65, 30, 5, 5, 2); }
      else { px(8, 36, 96, 34, '#8a8f9c'); for (let i = 0; i < 4; i++) px(14 + i * 22, 48, 16, 22, '#5d6270'); px(8, 32, 96, 4, '#6b707c'); px(20, 26, 40, 6, '#d94f3a'); }
    }
    const pal = palette(sc), step = !reduced && (frame >> 3) % 2 === 1;
    if (L.age < 3) drawSprite('baby', 72, 58, pal, false);
    else if (L.age < 14) drawSprite('kid', 124, 50, pal, step);
    else drawSprite(L.gender === 'f' ? 'adult_f' : 'adult_m', sc === 'home' || sc === 'end' ? 124 : 112, 42, pal, sc === 'end' ? false : step);
  }
  function loop() { frame++; if (frame % 2 === 0) { g.clearRect(0, 0, W, H); scene(); } if (!reduced) requestAnimationFrame(loop); }

  // ---------- UI pieces ----------
  const incomeAt = (v, kid) => kid ? dollars(v) : D.earnings(v);
  function barHTML(v) {
    return `<span class="lpbar" role="img" aria-label="${v} of 100 life points"><i style="width:${v}%"></i></span>`;
  }
  function ticker(delta) {
    const t = $('ticker');
    if (!L) { t.hidden = true; return; }
    t.hidden = false;
    const v = L.lp, kid = L.age < 18 && !L.over;
    t.innerHTML = `<span class="tk-idx">LIFE POINTS</span>${barHTML(v)}
      <span class="tk-pts"><b>${v}</b>/100<em class="dl ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}" aria-live="polite">${delta ? (delta > 0 ? '+' : '&minus;') + Math.abs(delta) : ''}</em></span>
      <span class="tk-sub">${kid ? 'FAMILY INCOME' : 'YOUR EARNINGS'} <b>~${money(incomeAt(v, kid))}</b>/YR &middot; AGE <b>${L.over ? 55 : L.age}</b></span>`;
  }
  function hud() {
    $('tag').textContent = !L ? 'USA' : L.over ? 'EPILOGUE' : L.age ? 'AGE ' + L.age : 'BIRTH';
  }
  function card(c, title) {
    return `<div class="card"><h3>${title || 'WHAT THE DATA SAYS'}</h3><p>${c.text}</p>${c.src && c.src.length ? `<p class="src">${srcLinks(c.src)}</p>` : ''}</div>`;
  }
  const whyHTML = (cards, id) => cards && cards.length ? `<button class="why" id="${id}Btn" aria-expanded="false" aria-controls="${id}Cards">WHY?</button><div class="cards" id="${id}Cards" hidden>${cards.join('')}</div>` : '';
  function wireWhy(id) {
    const wb = $(id + 'Btn');
    if (wb) wb.onclick = () => { const c = $(id + 'Cards'); c.hidden = !c.hidden; wb.setAttribute('aria-expanded', String(!c.hidden)); wb.textContent = c.hidden ? 'WHY?' : 'HIDE'; };
  }
  function say(html, cards) {
    $('dialog').innerHTML = html + whyHTML(cards, 'why');
    wireWhy('why');
  }
  // Life events have no roll, so they arrive as a popup over the game.
  function popup(html, cards, label, fn) {
    const m = $('modal');
    m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="mTitle">${html}${whyHTML(cards, 'mwhy')}
      <button class="btn primary" id="mGo"><span class="cur">&#9654;</span><span>${label}</span></button></div>`;
    wireWhy('mwhy');
    m.hidden = false; document.body.classList.add('locked');
    $('mGo').onclick = () => { m.hidden = true; m.innerHTML = ''; document.body.classList.remove('locked'); fn(); };
    $('mGo').focus({ preventScroll: true });
  }
  // A fair 1-10 die, rolled when you press the button.
  function freshDie() {
    const a = new Uint8Array(1);
    if (!(window.crypto && crypto.getRandomValues)) return 1 + Math.floor(Math.random() * 10);
    do crypto.getRandomValues(a); while (a[0] >= 250);
    return 1 + (a[0] % 10);
  }
  // The die, drawn as ten cells: red lose, grey stay, green win. The rolled number is outlined.
  function zonesHTML(hit) {
    let h = '';
    for (let n = 1; n <= 10; n++) h += `<span class="zc ${D.zone(n)}${n === hit ? ' hit' : ''}">${n}</span>`;
    return `<div class="zones" role="img" aria-label="Roll 1 to ${D.LOSE_MAX}: minus ${-D.LOSE}. ${D.LOSE_MAX + 1} to ${D.WIN_MIN - 1}: no change. ${D.WIN_MIN} to 10: plus ${D.WIN}.">${h}</div>
      <p class="zkey"><span class="lose">1&ndash;${D.LOSE_MAX}: &minus;${-D.LOSE}</span> <span class="stay">${D.LOSE_MAX + 1}&ndash;${D.WIN_MIN - 1}: no change</span> <span class="win">${D.WIN_MIN}&ndash;10: +${D.WIN}</span></p>`;
  }
  function choices(list) {
    const box = $('choices'); box.innerHTML = '';
    list.forEach(([label, sub, fn, primary]) => {
      const b = document.createElement('button');
      b.className = 'btn' + (primary ? ' primary' : '');
      b.innerHTML = `<span class="cur">&#9654;</span><span>${label}${sub ? `<small>${sub}</small>` : ''}</span>`;
      b.addEventListener('click', () => { if (!busy) fn(); }); box.appendChild(b);
    });
    const first = box.querySelector('button');
    if (first && L) first.focus({ preventScroll: true });
  }
  function redraw() { if (reduced) { g.clearRect(0, 0, W, H); scene(); } }

  // ---------- start ----------
  function drawStart(fixed) {
    const r = Math.random;
    let race = fixed.race, gender = fixed.gender || (r() < .5 ? 'f' : 'm'), start = fixed.start;
    if (!race) {
      const keys = Object.keys(D.RACES), w = keys.map(k => DATA.groups[k + '_f'].count + DATA.groups[k + '_m'].count), tot = w.reduce((a, b) => a + b);
      let x = r() * tot; race = keys.find((k, i) => (x -= w[i]) < 0) || 'white';
    }
    if (!start) {
      const pq = DATA.groups[race + '_' + gender].parQ; let x = r(), q = 0;
      while (q < 4 && (x -= pq[q]) > 0) q++;
      start = q * 20 + 1 + Math.floor(r() * 20);
    }
    return { race, gender, start };
  }
  function groupCard(race, gender) {
    const k = race + '_' + gender, M = D.KIR[k], W = D.KIR.white_m, hit = D.GROUP[k];
    return card({
      text: `${D.GROUP_WHY[k]} ${hit ? `In this game that is &minus;${hit} life points at 30, 40 and 50.` : ''} From families in the top fifth, ${Math.round(M[4][4] * 100)}% of ${who(race, gender)} grew up to be in the top fifth of earners (white boys: ${Math.round(W[4][4] * 100)}%). From the bottom fifth, ${Math.round(M[0][0] * 100)}% stayed in the bottom fifth (white boys: ${Math.round(W[0][0] * 100)}%).`,
      src: ['race', 'oidata'],
    }, 'WHY YOUR GROUP');
  }
  function start(fixed) {
    const o = drawStart(fixed || {});
    const seed = 'life-' + Date.now() + '-' + Math.random();
    L = { ...o, seed, dice: D.rollDice(seed), tone: Math.floor(Math.random() * 6), lp: o.start, age: 0, i: 0, over: false, child: !!(fixed && fixed.child) };
    L.life = D.simulate(o, L.dice);
    $('extra').innerHTML = '';
    hud(); ticker(0); redraw();
    const v = o.start, k = o.race + '_' + o.gender, hit = D.GROUP[k];
    const intro = L.child ? `<p>Your child is born. They start where you ended up.</p>` : '';
    say(`${intro}<p>You're a ${D.RACES[o.race]} ${o.gender === 'f' ? 'girl' : 'boy'}.</p>
      <p>Your family starts you with <b>${v} life points</b>: they earn more than ${v - 1}% of families, about ${money(dollars(v))} a year.</p>
      <p class="q">From 5 to 55 you'll roll a die. Everyone rolls the same die. ${hit ? `As a ${D.RACES[o.race]} ${o.gender === 'f' ? 'woman' : 'man'}, you'll also take a &minus;${hit} hit at 30, 40 and 50.` : 'Your group takes no extra hits.'}</p>`,
      [card({ text: `Life points start at your parents' household income rank, from 1 to 100. As an adult they track your own earnings rank. Everyone rolls the same die: ${zonesPlain()}. Everyone pays a Cost of Living hit of &minus;${D.COST_HIT} at 18, 33 and 48.` }, 'HOW IT WORKS'), groupCard(o.race, o.gender)]);
    choices([['START LIFE', null, () => nextAge(), true]]);
    window.scrollTo({ top: 0 });
  }
  const zonesPlain = () => `1&ndash;${D.LOSE_MAX} is &minus;${-D.LOSE}, ${D.LOSE_MAX + 1}&ndash;${D.WIN_MIN - 1} is no change, ${D.WIN_MIN}&ndash;10 is +${D.WIN}`;

  // ---------- play ----------
  const steps = () => L.life.steps;
  function nextAge() {
    const s = steps()[L.i];
    if (!s) { finish(); return; }
    L.age = s.age; hud(); redraw(); ticker(0);
    const rolls = steps().filter((x, j) => j >= L.i && x.age === s.age && x.kind === 'roll').length;
    let html = `<p class="stage">AGE ${s.age} &middot; ${D.STAGE[s.age].toUpperCase()}</p>`;
    if (rolls) {
      html += `${zonesHTML()}<p class="note">${rolls === 2 ? 'Big year: two rolls.' : 'One roll.'}</p>`;
      say(html, s.age === 5 ? [card({ text: `Everyone in this game rolls the same die. What differs is where you start and the hits you take along the way. Near the bottom, a few bad rolls in a row are hard to climb out of, especially with Cost of Living on top.` }, 'THE DIE')] : null);
      choices([[rolls === 2 ? 'ROLL 1 OF 2' : 'ROLL', null, doRoll, true]]);
    } else { say(html + '<p class="note">No roll this year.</p>'); nextStep(); }
  }
  function nextStep() {
    const s = steps()[L.i];
    if (!s) { finish(); return; }
    if (s.age !== L.age) { nextAge(); return; }
    if (s.kind === 'pen') showPenalty(s);
  }
  function doRoll() {
    const k = steps().slice(0, L.i).filter(x => x.kind === 'roll').length;
    L.dice[k] = freshDie();
    L.life = D.simulate({ race: L.race, gender: L.gender, start: L.start }, L.dice);
    const s = steps()[L.i];
    busy = true;
    const label = `AGE ${s.age}${s.of === 2 ? ` &middot; ROLL ${s.idx + 1} OF 2` : ''}`;
    const show = n => `<div class="rollrow"><div class="die" aria-hidden="true">${n}</div><div><p class="stage">${label}</p></div></div>${zonesHTML()}`;
    const finishRoll = () => {
      busy = false; L.i++; L.lp = s.lp; hud(); ticker(s.delta); redraw();
      const tone = s.zone === 'win' ? 'good' : s.zone === 'lose' ? 'bad' : 'dim';
      const word = s.zone === 'win' ? 'UP' : s.zone === 'lose' ? 'DOWN' : 'NO CHANGE';
      const amt = s.delta ? (s.delta > 0 ? ' +' : ' &minus;') + Math.abs(s.delta) : '';
      say(`<div class="rollrow"><div class="die ${s.zone}" role="img" aria-label="You rolled ${s.die}">${s.die}</div>
        <div><p class="stage">${label}</p><p class="delta ${tone}">${word}${amt}</p></div></div>
        ${zonesHTML(s.die)}
        <p class="${tone === 'dim' ? '' : tone}">${s.text}</p>${s.zone !== 'stay' && s.delta !== (s.zone === 'win' ? D.WIN : D.LOSE) ? `<p class="note">${s.zone === 'win' ? 'You hit the top: 100 points.' : 'You hit the floor: 1 point.'}</p>` : ''}`);
      const nx = steps()[L.i];
      if (nx && nx.age === s.age && nx.kind === 'roll') choices([['ROLL 2 OF 2', null, doRoll, true]]);
      else if (nx && nx.age === s.age) choices([['NEXT', null, nextStep, true]]);
      else choices([[nx ? 'KEEP GOING' : 'SEE HOW IT ENDS', null, nextAge, true]]);
    };
    $('choices').innerHTML = '';
    if (reduced) { finishRoll(); return; }
    let t = 0;
    const spin = setInterval(() => {
      say(show(1 + Math.floor(Math.random() * 10)));
      if (++t >= 9) { clearInterval(spin); finishRoll(); }
    }, 70);
  }
  function showPenalty(s) {
    L.i++; L.lp = s.lp; hud(); ticker(s.delta); redraw();
    $('choices').innerHTML = '';
    const nx = steps()[L.i], same = nx && nx.age === s.age;
    const whoNote = s.type === 'cost' ? 'Everyone takes this hit.'
      : `${D.RACES[L.race]} ${L.gender === 'f' ? 'women' : 'men'} take &minus;${s.amt} at 30, 40 and 50. Not every group does. Tap WHY? to see why.`;
    popup(`<p class="ev-tag">LIFE EVENT &middot; AGE ${s.age} &middot; NO ROLL</p>
      <h2 class="ev-name" id="mTitle">${s.name}</h2>
      <p class="ev-delta">${s.delta ? '&minus;' + Math.abs(s.delta) : '&minus;0'} <span>LIFE POINTS</span></p>
      <p>${s.text}</p>
      ${s.delta === 0 ? '<p class="note">You were already at the floor.</p>' : ''}
      <p class="note">${whoNote}</p>`,
      s.type === 'cost' ? [card(s.card)] : [card(s.card), groupCard(L.race, L.gender)],
      same ? 'NEXT' : nx ? 'KEEP GOING' : 'SEE HOW IT ENDS', same ? nextStep : nextAge);
  }

  // ---------- ending ----------
  function sparkline(lines) {
    const w = 300, h = 110, pad = 22;
    const x = a => pad + (a / 55) * (w - pad * 2 + 4), y = v => h - pad - ((v - 1) / 99) * (h - pad * 2);
    const path = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.age).toFixed(1)},${y(p.lp).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" class="spark" role="img" aria-label="Your life points from birth to 55">
      ${[1, 50, 100].map(v => `<line x1="${pad}" x2="${w - pad + 4}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${pad - 4}" y="${y(v) + 4}" class="lbl" text-anchor="end">${v}</text>`).join('')}
      ${lines.map(([pts, cls]) => `<path d="${path(pts)}" class="${cls}"/>`).join('')}
      ${[0, 18, 35, 55].map(a => `<text x="${x(a)}" y="${h - 3}" class="lbl" text-anchor="middle">${a}</text>`).join('')}
    </svg>`;
  }
  function finish() {
    L.over = true; hud(); ticker(0); redraw();
    const fin = L.life.final, [, title, blurb] = D.ending(fin);
    say(`<p class="stage">AGE 55 &middot; ${title}</p><p>${blurb}</p><p>You finished with <b>${fin} life points</b>: you earn more than ${fin - 1}% of people, about ${money(D.earnings(fin))} a year. You started with ${L.start}.</p>`);
    choices([
      ['PLAY AS YOUR CHILD', `They start with your ${fin} life points.`, () => start({ race: L.race, start: fin, child: true }), true],
      ['DRAW ANOTHER LIFE', null, () => start({})],
      ['CHOOSE YOUR START', 'Pick race, gender and family income.', chooser],
    ]);
    // Same dice, different start / different player
    const o = { race: L.race, gender: L.gender, start: L.start };
    const altStart = L.start <= 50 ? 95 : 5;
    const noHit = !D.GROUP[L.race + '_' + L.gender];
    const altWho = noHit ? { race: 'black', gender: 'm' } : { race: 'white', gender: 'm' };
    const A = D.simulate({ ...o, start: altStart }, L.dice), B = D.simulate({ ...o, ...altWho }, L.dice);
    const one = (r, gd) => `${D.RACES[r]} ${gd === 'f' ? 'girl' : 'boy'}`;
    const row = (label, life, cls) => `<tr class="${cls || ''}"><td>${label}</td><td>${life.start}</td><td>${life.final}</td><td>${D.ending(life.final)[1]}</td></tr>`;
    // Game vs real for your group and parents' fifth
    const game = D.gameOdds(o, 20000), real = D.KIR[L.race + '_' + L.gender][fifth(L.start)];
    const bars = FIFTHS.map((f, i) => `<div class="fifth ${i === fifth(fin) ? 'you' : ''}"><span class="fl">${f.replace(' fifth', '').toUpperCase()}</span>
      <span class="fb"><i class="g" style="width:${Math.round(game[i] * 100)}%"></i></span><span class="fv">${Math.round(game[i] * 100)}%</span>
      <span class="fb"><i class="r" style="width:${Math.round(real[i] * 100)}%"></i></span><span class="fv">${Math.round(real[i] * 100)}%</span></div>`).join('');
    $('extra').innerHTML = `
      <div class="panel">
        <h2>YOUR LIFE</h2>
        ${sparkline([[A.hist, 'line alt'], [B.hist, 'line alt2'], [L.life.hist, 'line']])}
        <p class="note"><span class="key k1"></span>You <span class="key k2"></span>Born with ${altStart} points <span class="key k3"></span>Born a ${one(altWho.race, altWho.gender)}</p>
      </div>
      <div class="panel">
        <h2>SAME ROLLS. DIFFERENT START.</h2>
        <p>We replayed your life with the exact dice you rolled. Only the start changed. Numbers are life points.</p>
        <div class="scroll"><table class="odds"><thead><tr><th></th><th>START</th><th>AT 55</th><th>ENDING</th></tr></thead><tbody>
          ${row('You', L.life, 'you')}
          ${row(`Born with ${altStart} points`, A)}
          ${row(`Born a ${one(altWho.race, altWho.gender)}`, B)}
        </tbody></table></div>
      </div>
      <div class="panel">
        <h2>THE GAME VS REAL LIFE</h2>
        <p>Where ${who(L.race, L.gender)} from the ${FIFTHS[fifth(L.start)]} of family incomes end up in their own earnings as adults.</p>
        <div class="fifths"><div class="fifth head"><span class="fl"></span><span class="fh">IN THE GAME</span><span></span><span class="fh">REAL DATA</span><span></span></div>${bars}</div>
        <p class="note">Game: 20,000 simulated lives from your parents' fifth. Real: children born 1978&ndash;83, individual earnings at ages 31&ndash;37. The game is simpler than life, so the numbers won't match exactly. Your ending fifth is highlighted.</p>
        <p class="src">${srcLinks(['race', 'oidata'])}</p>
      </div>
      ${sources()}`;
    window.scrollTo({ top: 0 });
  }
  function sources() {
    const hits = Object.entries(D.GROUP).filter(([, v]) => v).map(([k, v]) => `${D.RACES[k.split('_')[0]]} ${k.endsWith('_f') ? 'women' : 'men'} &minus;${v}`).join(', ');
    return `<div class="panel" id="sources">
      <h2>WHERE THE NUMBERS COME FROM</h2>
      <ul class="sources">${Object.values(D.SRC).map(([label, url]) => `<li><a href="${url}" target="_blank" rel="noopener">${label}</a></li>`).join('')}</ul>
      <p class="sources">How the game works: you start with life points equal to your parents' household income rank (1&ndash;100). At each stop you roll a fair 1&ndash;10 die: ${zonesPlain()}. Everyone rolls the same die. Everyone pays a Cost of Living hit of &minus;${D.COST_HIT} at 18, 33 and 48. At 30, 40 and 50 some groups take an extra hit: ${hits}. White men, Asian American men and Asian American women take none. We set these hits so that, across many lives, the game lands close to real data on adults' own earnings by race, gender and parents' income. Gaps by race reflect neighborhoods, schools, discrimination and family wealth, not race itself.</p>
    </div>`;
  }
  function chooser() {
    L = null; hud(); ticker(0); redraw();
    $('extra').innerHTML = '';
    say('<p>Pick a starting point. After that, it\'s up to the dice.</p>');
    $('choices').innerHTML = `
      <div class="panel">
        <label class="f" for="cRace">RACE / ETHNICITY<select id="cRace">${Object.entries(D.RACES).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
        <label class="f" for="cGender">GENDER<select id="cGender"><option value="f">Girl</option><option value="m">Boy</option></select></label>
        <label class="f" for="cPar">PARENTS' INCOME = STARTING LIFE POINTS<select id="cPar">${[5, 15, 25, 35, 45, 55, 65, 75, 85, 95].map(v => `<option value="${v}" ${v === 45 ? 'selected' : ''}>${v} points${v === 5 ? ' (bottom 10%)' : v === 95 ? ' (top 10%)' : ''} &middot; ~${money(dollars(v))}</option>`).join('')}</select></label>
      </div>`;
    const b = document.createElement('button');
    b.className = 'btn primary'; b.innerHTML = '<span class="cur">&#9654;</span><span>START THIS LIFE</span>';
    b.onclick = () => start({ race: $('cRace').value, gender: $('cGender').value, start: +$('cPar').value });
    $('choices').appendChild(b);
  }
  function titleScreen() {
    L = null; hud(); ticker(0);
    say(`<p>You don't choose where you're born. Draw a random American life and roll your way from age 5 to 55.</p>
      <p class="q">You start with life points from 1 to 100, set by your family's income. Everyone rolls the same die, but not everyone takes the same hits. Tap WHY? to see the real data.</p>`);
    choices([
      ['DRAW A LIFE', 'Random start, weighted like real US births.', () => start({}), true],
      ['CHOOSE YOUR START', 'Pick race, gender and family income.', chooser],
    ]);
    $('extra').innerHTML = '';
  }
  $('srcLink').addEventListener('click', e => { if (!$('sources')) { e.preventDefault(); $('extra').insertAdjacentHTML('beforeend', sources()); $('sources').scrollIntoView(); } });
  titleScreen();
  if (reduced) { scene(); setInterval(() => { g.clearRect(0, 0, W, H); scene(); }, 500); } else loop();
})();
