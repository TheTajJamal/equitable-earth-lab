// Life Lottery v1 (dice): UI + pixel scenes
(function () {
  const $ = id => document.getElementById(id);
  const cv = $('cv'), g = cv.getContext('2d');
  const W = 160, H = 96;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const D = window.DICE, DATA = window.US_DATA;
  let L = null, frame = 0, busy = false;

  // ---------- helpers ----------
  const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)] || 'th');
  function dollars(d) {
    const p = d * 10 - 5, T = DATA.dollars;
    for (let i = 1; i < T.length; i++) if (p <= T[i][0]) { const [a, va] = T[i - 1], [b, vb] = T[i]; return va + (vb - va) * (p - a) / (b - a); }
    return T[T.length - 1][1];
  }
  const money = v => '$' + (v >= 1000 ? Math.round(v / 1000) + 'K' : Math.round(v));
  const FIFTHS = ['bottom fifth', 'second fifth', 'middle fifth', 'fourth fifth', 'top fifth'];
  const fifth = d => Math.ceil(d / 2) - 1;
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
    if (a <= 20) return L.lp >= 5 ? 'campus' : 'work';
    return 'work';
  }
  function palette(sc) {
    const s = SKIN[L.race][L.tone % 2], h = HAIR[L.race][L.tone % 3], hi = L.lp >= 6;
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
    const sc = sceneFor(), q = Math.min(4, Math.floor((D.dec(L.lp) - 1) / 2));
    sky(sc === 'end' ? '#e98a5b' : '#6fa8dc', sc === 'end' ? '#f2c078' : '#9cc6e8');
    cloud((frame * .3 + 20) % 190 - 20, 12); cloud((frame * .2 + 110) % 190 - 20, 22);
    ground('#4f8a4b', '#3f7a3c');
    if (sc === 'home' || sc === 'end') home(q);
    if (sc === 'school') { px(20, 30, 70, 40, '#b5523b'); windowGrid(26, 36, 10, 4, 2); px(48, 56, 12, 14, '#5a3325'); px(95, 20, 1, 50, '#ccc'); px(96, 20, 10, 6, '#d9544d'); px(96, 23, 10, 1, '#fff'); }
    if (sc === 'campus') { px(12, 34, 84, 36, '#d9d1bd'); px(8, 30, 92, 5, '#c2b89f'); px(30, 18, 48, 12, '#d9d1bd'); for (let i = 0; i < 7; i++) px(18 + i * 11, 38, 4, 32, '#efe8d6'); px(118, 40, 20, 18, '#3e8a4e'); px(126, 58, 4, 12, '#6b4a2b'); }
    if (sc === 'work') {
      if (L.lp >= 6) { px(14, 8, 44, 62, '#4a5a7a'); windowGrid(17, 12, 7, 8, 3); px(62, 26, 34, 44, '#5b6b8c'); windowGrid(65, 30, 5, 5, 2); }
      else { px(8, 36, 96, 34, '#8a8f9c'); for (let i = 0; i < 4; i++) px(14 + i * 22, 48, 16, 22, '#5d6270'); px(8, 32, 96, 4, '#6b707c'); px(20, 26, 40, 6, '#d94f3a'); }
    }
    const pal = palette(sc), step = !reduced && (frame >> 3) % 2 === 1;
    if (L.age < 3) drawSprite('baby', 72, 58, pal, false);
    else if (L.age < 14) drawSprite('kid', 124, 50, pal, step);
    else drawSprite(L.gender === 'f' ? 'adult_f' : 'adult_m', sc === 'home' || sc === 'end' ? 124 : 112, 42, pal, sc === 'end' ? false : step);
  }
  function loop() { frame++; if (frame % 2 === 0) { g.clearRect(0, 0, W, H); scene(); } if (!reduced) requestAnimationFrame(loop); }

  // ---------- UI pieces ----------
  function barHTML(v) {
    let h = '';
    for (let i = 1; i <= 10; i++) h += `<span class="seg ${i <= v ? 'on' : ''}"></span>`;
    return `<span class="bar10" role="img" aria-label="Income decile ${v} of 10">${h}</span>`;
  }
  function ticker(delta) {
    const t = $('ticker');
    if (!L) { t.hidden = true; return; }
    t.hidden = false;
    const d = D.dec(L.lp);
    t.innerHTML = `<span class="tk-idx">INCOME DECILE</span>${barHTML(d)}
      <span class="tk-pts"><b>${d}</b>/10 ${delta ? `<em class="${delta > 0 ? 'up' : 'down'}">${delta > 0 ? '&#9650;' : '&#9660;'}${Math.abs(delta)}</em>` : ''}</span>
      ${L.need ? `<span class="tk-odds">ROLL ${L.need}+ TO WIN &middot; ${(11 - L.need) * 10}%</span>` : ''}`;
  }
  function hud() {
    $('hud').hidden = !L;
    if (!L) return;
    $('hAge').textContent = L.over ? '55+' : L.age;
    $('hPct').textContent = (L.age < 18 ? 'FAMILY ' : '') + '~' + money(dollars(D.dec(L.lp))) + '/YR';
    $('tag').textContent = L.over ? 'EPILOGUE' : L.age ? 'AGE ' + L.age : 'BIRTH';
  }
  function card(c, title) {
    return `<div class="card"><h3>${title || 'WHAT THE DATA SAYS'}</h3><p>${c.text}</p>${c.src && c.src.length ? `<p class="src">${srcLinks(c.src)}</p>` : ''}</div>`;
  }
  function say(html, cards) {
    const why = cards && cards.length ? `<button class="why" id="whyBtn" aria-expanded="false">WHY?</button><div class="cards" id="cards" hidden>${cards.join('')}</div>` : '';
    $('dialog').innerHTML = html + why;
    const wb = $('whyBtn');
    if (wb) wb.onclick = () => { const c = $('cards'); c.hidden = !c.hidden; wb.setAttribute('aria-expanded', String(!c.hidden)); wb.textContent = c.hidden ? 'WHY?' : 'HIDE'; };
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
      start = q * 2 + 1 + (r() < .5 ? 0 : 1);
    }
    return { race, gender, start };
  }
  function start(fixed) {
    const o = drawStart(fixed || {});
    const seed = 'life-' + Date.now() + '-' + Math.random();
    L = { ...o, seed, dice: D.rollDice(seed), tone: Math.floor(Math.random() * 6), lp: o.start, age: 0, need: null, i: 0, over: false, child: !!(fixed && fixed.child) };
    L.life = D.simulate(o, L.dice);
    $('extra').innerHTML = '';
    hud(); ticker(0); redraw();
    const d = o.start, mob = DATA.groups[o.race + '_' + o.gender].mob[fifth(d)];
    const intro = L.child ? `<p>Your child is born. They start where you ended up.</p>` : '';
    say(`${intro}<p>You're a ${D.RACES[o.race]} ${o.gender === 'f' ? 'girl' : 'boy'}.</p>
      <p>Your family is in the <b>${ord(d)} income decile</b>, about ${money(dollars(d))} a year.</p>
      <p class="q">From age 5 to 55 you'll roll a die. Your income sets your odds.</p>`,
      [card({ text: `Of ${who(o.race, o.gender)} born to parents in the ${FIFTHS[fifth(d)]}, ${Math.round(mob[4] * 100)}% ended up in the top fifth as adults, and ${Math.round(mob[0] * 100)}% in the bottom fifth.`, src: ['race'] })]);
    choices([['START LIFE', null, () => nextAge(), true]]);
    window.scrollTo({ top: 0 });
  }

  // ---------- play ----------
  const steps = () => L.life.steps;
  function nextAge() {
    const s = steps()[L.i];
    if (!s) { finish(); return; }
    L.age = s.age; hud(); redraw();
    const here = steps().filter((x, j) => j >= L.i && x.age === s.age);
    const rolls = here.filter(x => x.kind === 'roll').length;
    let html = `<p class="stage">AGE ${s.age} &middot; ${D.STAGE[s.age].toUpperCase()}</p>`, cards = [];
    if (s.kind === 'odds') {
      L.need = s.need; L.i++;
      html += `<p>Your odds match your income right now: decile ${s.dec}.</p><p class="q">Roll ${s.need} or higher to win (${s.chance}% chance).</p>`;
      cards.push(card({ text: `Your chance to win is your income decile minus one, times 10%, but never below ${D.MIN_CH}% or above ${D.MAX_CH}%. It resets at 5, 15, 25, 35, 45 and 55. A win is +${D.WIN}, a loss is ${D.LOSE}, so you need about one win in three just to hold your place. Money works like that: savings, family help and good schools turn bad luck into a setback instead of a fall.` }, 'HOW THE ODDS WORK'));
    } else if (rolls) {
      html += `<p class="q">Roll ${L.need} or higher to win (${(11 - L.need) * 10}% chance).</p>`;
    }
    ticker(0);
    if (rolls) {
      html += `<p class="note">${rolls === 2 ? 'Big year: two rolls.' : 'One roll.'} Win: +${D.WIN}. Lose: ${D.LOSE}.</p>`;
      say(html, cards);
      choices([[rolls === 2 ? 'ROLL 1 OF 2' : 'ROLL', null, doRoll, true]]);
    } else { say(html, cards); nextStep(); }
  }
  function nextStep() {
    const s = steps()[L.i];
    if (!s) { finish(); return; }
    if (s.age !== L.age) { nextAge(); return; }
    if (s.kind === 'pen') showPenalty(s);
  }
  function doRoll() {
    const s = steps()[L.i];
    busy = true;
    const show = n => `<div class="rollrow"><div class="die" aria-hidden="true">${n}</div><div><p class="stage">AGE ${s.age}${s.of === 2 ? ` &middot; ROLL ${s.idx + 1} OF 2` : ''}</p><p class="note">Need ${s.need}+</p></div></div>`;
    const finishRoll = () => {
      busy = false; L.i++; L.lp = s.lp; hud(); ticker(s.delta); redraw();
      say(`<div class="rollrow"><div class="die ${s.win ? 'win' : 'lose'}" role="img" aria-label="You rolled ${s.die}">${s.die}</div>
        <div><p class="stage">AGE ${s.age}${s.of === 2 ? ` &middot; ROLL ${s.idx + 1} OF 2` : ''}</p><p class="delta ${s.win ? 'good' : 'bad'}">${s.win ? 'WIN' : 'MISS'} ${s.delta > 0 ? '+' : ''}${s.delta || (s.win ? '+0' : '0')}</p></div></div>
        <p class="${s.win ? 'good' : 'bad'}">${s.text}</p>${s.delta === 0 ? `<p class="note">${s.win ? 'You were already at the top.' : 'You were already at the bottom. It can\'t get lower on paper.'}</p>` : ''}`);
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
    say(`<p class="stage">AGE ${s.age} &middot; ${s.name} ${s.delta ? s.delta : '-0'}</p><p class="bad">${s.text}</p>
      ${s.delta === 0 ? '<p class="note">You were already at the bottom.</p>' : ''}
      <p class="note">${s.type === 'cost' ? 'Everyone takes this hit.' : s.type === 'girl' ? 'Only girls take this hit.' : 'Only Black, Hispanic and Native players take this hit.'}</p>`, [card(s.card)]);
    const nx = steps()[L.i];
    if (nx && nx.age === s.age) choices([['NEXT', null, nextStep, true]]);
    else choices([[nx ? 'KEEP GOING' : 'SEE HOW IT ENDS', null, nextAge, true]]);
  }

  // ---------- ending ----------
  function sparkline(lines) {
    const w = 300, h = 110, pad = 18;
    const x = a => pad + (a / 55) * (w - pad * 2), y = v => h - pad - ((v - 1) / 9) * (h - pad * 2);
    const path = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.age).toFixed(1)},${y(p.lp).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" class="spark" role="img" aria-label="Your income decile from birth to 55">
      ${[1, 5, 10].map(v => `<line x1="${pad}" x2="${w - pad}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${pad - 4}" y="${y(v) + 4}" class="lbl" text-anchor="end">${v}</text>`).join('')}
      ${lines.map(([pts, cls]) => `<path d="${path(pts)}" class="${cls}"/>`).join('')}
      ${[0, 18, 35, 55].map(a => `<text x="${x(a)}" y="${h - 3}" class="lbl" text-anchor="middle">${a}</text>`).join('')}
    </svg>`;
  }
  function finish() {
    L.over = true; L.need = null; hud(); ticker(0); redraw();
    const fin = L.life.final, [, title, blurb] = D.ending(fin);
    say(`<p class="stage">AGE 55 &middot; ${title}</p><p>${blurb}</p><p>You finished in the <b>${ord(fin)} decile</b>, about ${money(dollars(fin))} a year. You started in the ${ord(L.start)}.</p>`);
    choices([
      ['PLAY AS YOUR CHILD', `They start where you ended: the ${ord(fin)} decile.`, () => start({ race: L.race, start: fin, child: true }), true],
      ['DRAW ANOTHER LIFE', null, () => start({})],
      ['CHOOSE YOUR START', 'Pick race, gender and family income.', chooser],
    ]);
    // Same dice, different start / different player
    const o = { race: L.race, gender: L.gender, start: L.start };
    const altStart = L.start <= 5 ? 10 : 1;
    const privileged = (L.race === 'white' || L.race === 'asian') && L.gender === 'm';
    const altWho = privileged ? { race: 'black', gender: 'f' } : { race: 'white', gender: 'm' };
    const A = D.simulate({ ...o, start: altStart }, L.dice), B = D.simulate({ ...o, ...altWho }, L.dice);
    const row = (label, life, cls) => `<tr class="${cls || ''}"><td>${label}</td><td>${ord(life.start)}</td><td>${ord(life.final)}</td><td>${D.ending(life.final)[1]}</td></tr>`;
    // Game vs real for your group and starting fifth
    const game = D.gameOdds(o, 20000), real = DATA.groups[L.race + '_' + L.gender].mob[fifth(L.start)];
    const bars = FIFTHS.map((f, i) => `<div class="fifth ${i === fifth(fin) ? 'you' : ''}"><span class="fl">${f.replace(' fifth', '').toUpperCase()}</span>
      <span class="fb"><i class="g" style="width:${Math.round(game[i] * 100)}%"></i></span><span class="fv">${Math.round(game[i] * 100)}%</span>
      <span class="fb"><i class="r" style="width:${Math.round(real[i] * 100)}%"></i></span><span class="fv">${Math.round(real[i] * 100)}%</span></div>`).join('');
    $('extra').innerHTML = `
      <div class="panel">
        <h2>YOUR LIFE</h2>
        ${sparkline([[A.hist, 'line alt'], [B.hist, 'line alt2'], [L.life.hist, 'line']])}
        <p class="note"><span class="key k1"></span>You <span class="key k2"></span>Born in the ${ord(altStart)} decile <span class="key k3"></span>Born a ${who(altWho.race, altWho.gender).replace(/s$/, '')}</p>
      </div>
      <div class="panel">
        <h2>SAME ROLLS. DIFFERENT START.</h2>
        <p>We replayed your life with the exact same dice. Only the start changed.</p>
        <div class="scroll"><table class="odds"><thead><tr><th></th><th>START</th><th>AGE 55</th><th>ENDING</th></tr></thead><tbody>
          ${row('You', L.life, 'you')}
          ${row(`Born in the ${ord(altStart)} decile`, A)}
          ${row(`Born a ${who(altWho.race, altWho.gender).replace(/s$/, '')}`, B)}
        </tbody></table></div>
      </div>
      <div class="panel">
        <h2>THE GAME VS REAL LIFE</h2>
        <p>Where ${who(L.race, L.gender)} from the ${FIFTHS[fifth(L.start)]} end up as adults.</p>
        <div class="fifths"><div class="fifth head"><span class="fl"></span><span class="fh">IN THE GAME</span><span></span><span class="fh">REAL DATA</span><span></span></div>${bars}</div>
        <p class="note">Game: 20,000 simulated lives with your start. Real: children born 1978&ndash;83, incomes measured in their 30s. The game is simpler than life, so the numbers won't match exactly. Your ending fifth is highlighted.</p>
        <p class="src">${srcLinks(['race', 'oidata'])}</p>
      </div>
      ${sources()}`;
    window.scrollTo({ top: 0 });
  }
  function sources() {
    return `<div class="panel" id="sources">
      <h2>WHERE THE NUMBERS COME FROM</h2>
      <ul class="sources">${Object.values(D.SRC).map(([label, url]) => `<li><a href="${url}" target="_blank" rel="noopener">${label}</a></li>`).join('')}</ul>
      <p class="sources">How the game works: you start at your parents' income decile. At each stop you roll a 1&ndash;10 die. Your chance to win is your decile minus one, times 10%, between ${D.MIN_CH}% and ${D.MAX_CH}%, reset at 5, 15, 25, 35, 45 and 55. Win +${D.WIN}, lose ${D.LOSE}. Everyone pays a Cost of Living hit at 18, 33 and 48. Girls take a hit at 25, 35 and 45; Black, Hispanic and Native players at 30, 40 and 50. We tuned these rules so that, across many lives, the game lands close to the real mobility data. Gaps by race reflect neighborhoods, schools, discrimination and family wealth, not race itself.</p>
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
        <label class="f" for="cPar">PARENTS' INCOME DECILE<select id="cPar">${Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}" ${i === 4 ? 'selected' : ''}>${i + 1}${i === 0 ? ' (bottom 10%)' : i === 9 ? ' (top 10%)' : ''} &middot; ~${money(dollars(i + 1))}</option>`).join('')}</select></label>
      </div>`;
    const b = document.createElement('button');
    b.className = 'btn primary'; b.innerHTML = '<span class="cur">&#9654;</span><span>START THIS LIFE</span>';
    b.onclick = () => start({ race: $('cRace').value, gender: $('cGender').value, start: +$('cPar').value });
    $('choices').appendChild(b);
  }
  function titleScreen() {
    L = null; hud(); ticker(0);
    say(`<p>You don't choose where you're born. Draw a random American life and roll your way from age 5 to 55.</p>
      <p class="q">Your family's income sets your odds. Win a roll: +2. Lose: &minus;1. Tap WHY? to see the real data.</p>`);
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
