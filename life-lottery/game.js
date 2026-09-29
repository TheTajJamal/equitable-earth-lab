// Life Lottery UI + pixel scenes (v3)
(function () {
  const $ = id => document.getElementById(id);
  const cv = $('cv'), g = cv.getContext('2d');
  const W = 160, H = 96;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let L = null, frame = 0, choiceLog = [], pathAnswer = null;

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
  function palette() {
    const s = SKIN[L.race][L.tones.skin % 2], h = HAIR[L.race][L.tones.hair % 3];
    let c = '#4d7fd6', p = '#2f3558';
    if (L.scene === 'school') c = '#d9544d';
    if (L.scene === 'campus') c = '#6b4fa8';
    if (L.scene === 'work') { c = L.pct >= 55 ? '#e8e2d4' : '#f28c28'; p = L.pct >= 55 ? '#2d2f45' : '#3a4a6b'; }
    if (L.scene === 'jail') { c = '#f07c1e'; p = '#f07c1e'; }
    if (L.scene === 'end') c = '#9aa7b8';
    return { h, s, e: '#1a1418', c, p, b: '#1a1418', w: '#f4f0e6' };
  }
  function sky(top, bottom) { for (let y = 0; y < 70; y++) px(0, y, W, 1, y > 45 ? bottom : y < 35 ? top : (y % 2 ? top : bottom)); }
  function ground(c1, c2) { px(0, 70, W, 26, c1); for (let x = 0; x < W; x += 4) px(x + (frame % 4), 72, 2, 1, c2); }
  function windowGrid(x, y, cols, rows, lit) { for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) px(x + i * 6, y + j * 7, 3, 4, ((i * 7 + j * 3) % 5 < lit) ? '#ffd27a' : '#3a3556'); }
  function cloud(x, y) { px(x, y, 12, 3, '#e8e2f2'); px(x + 3, y - 2, 6, 2, '#e8e2f2'); }
  function scene() {
    if (!L) { titleScene(); return; }
    const sc = L.scene, lived = L.results.live65;
    sky(sc === 'end' ? '#e98a5b' : sc === 'jail' ? '#4a4a5c' : '#6fa8dc', sc === 'end' ? '#f2c078' : sc === 'jail' ? '#5c5c70' : '#9cc6e8');
    if (sc !== 'jail') { cloud((frame * .3 + 20) % 190 - 20, 12); cloud((frame * .2 + 110) % 190 - 20, 22); }
    ground(sc === 'jail' ? '#55525f' : '#4f8a4b', sc === 'jail' ? '#46434f' : '#3f7a3c');
    if (sc === 'home') home(L.age >= 36 ? Math.min(4, Math.floor(L.pct / 20)) : L.pq);
    if (sc === 'school') { px(20, 30, 70, 40, '#b5523b'); windowGrid(26, 36, 10, 4, 2); px(48, 56, 12, 14, '#5a3325'); px(95, 20, 1, 50, '#ccc'); px(96, 20, 10, 6, '#d9544d'); px(96, 23, 10, 1, '#fff'); }
    if (sc === 'campus') { px(12, 34, 84, 36, '#d9d1bd'); px(8, 30, 92, 5, '#c2b89f'); px(30, 18, 48, 12, '#d9d1bd'); for (let i = 0; i < 7; i++) px(18 + i * 11, 38, 4, 32, '#efe8d6'); px(118, 40, 20, 18, '#3e8a4e'); px(126, 58, 4, 12, '#6b4a2b'); }
    if (sc === 'work') {
      if (L.pct >= 55) { px(14, 8, 44, 62, '#4a5a7a'); windowGrid(17, 12, 7, 8, 3); px(62, 26, 34, 44, '#5b6b8c'); windowGrid(65, 30, 5, 5, 2); }
      else { px(8, 36, 96, 34, '#8a8f9c'); for (let i = 0; i < 4; i++) px(14 + i * 22, 48, 16, 22, '#5d6270'); px(8, 32, 96, 4, '#6b707c'); px(20, 26, 40, 6, '#d94f3a'); }
    }
    if (sc === 'jail') { px(0, 20, W, 50, '#77737f'); for (let i = 0; i < W; i += 8) px(i, 20, 4, 50, '#8a8693'); px(30, 34, 40, 26, '#2a2833'); for (let i = 0; i < 8; i++) px(32 + i * 5, 34, 2, 26, '#b6b3bd'); }
    if (sc === 'end') {
      if (lived) { px(96, 60, 30, 3, '#7a4f2e'); px(98, 63, 2, 7, '#5a3a22'); px(122, 63, 2, 7, '#5a3a22'); px(96, 54, 30, 2, '#7a4f2e'); }
      else { px(112, 50, 14, 20, '#9a98a6'); px(114, 48, 10, 2, '#9a98a6'); px(118, 54, 2, 8, '#6d6b78'); px(115, 56, 8, 2, '#6d6b78'); }
    }
    const pal = palette(), step = !reduced && (frame >> 3) % 2 === 1;
    if (L.age < 3) drawSprite('baby', 72, 58, pal, false);
    else if (L.age < 14) drawSprite('kid', 72, 50, pal, step);
    else if (!(sc === 'end' && !lived)) drawSprite(L.gender === 'f' ? 'adult_f' : 'adult_m', sc === 'end' ? 103 : 72, sc === 'end' ? 38 : 42, pal, sc === 'end' ? false : step);
    // family stands with you
    if (L.age >= 20 && sc !== 'jail' && sc !== 'end') {
      if (L.partner) {
        const pg = LL.hash(L.seed + '|pg') < .5 ? 'adult_f' : 'adult_m';
        const races = Object.keys(SKIN), other = races[Math.floor(LL.hash(L.seed + '|pr') * races.length)];
        const pr = LL.hash(L.seed + '|same') < .8 ? L.race : other;
        drawSprite(pg, 96, 42, { ...pal, s: SKIN[pr][1], h: HAIR[pr][0], c: '#5cc8a6', p: '#2f3558' }, !step);
      }
      L.kids.forEach((k, i) => {
        const ka = L.age - k.born, x = i ? 124 : 52, kp = { ...pal, c: i ? '#ec6a5e' : '#f2a541', p: '#3a4a6b' };
        if (ka < 3) drawSprite('baby', x, 58, kp, false); else drawSprite('kid', x, 50, kp, i ? !step : step);
      });
    }
  }
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
  function loop() { frame++; if (frame % 2 === 0) { g.clearRect(0, 0, W, H); scene(); } if (!reduced) requestAnimationFrame(loop); }

  // ---------- UI ----------
  function srcLinks(keys) { return keys.map(k => `<a href="${LL.SRC[k][1]}" target="_blank" rel="noopener">${LL.SRC[k][0]}</a>`).join(' &middot; '); }

  function barHTML(v, big) {
    let h = '';
    for (let i = 1; i <= 10; i++) h += `<span class="seg ${i <= v ? 'on' : ''} ${i === LL.LINE ? 'line' : ''}"></span>`;
    return `<span class="bar10${big ? ' big' : ''}" role="img" aria-label="Bar ${v} of 10">${h}</span>`;
  }
  function ticker(prevBar) {
    const t = $('ticker');
    if (!L) { t.hidden = true; return; }
    t.hidden = false;
    const r = L.lastResolved;
    const flash = r ? `<span class="tk-flash ${r.hit ? 'hit' : 'miss'}">GOAL ${r.idx} ${r.hit ? 'HIT' : 'MISSED'} AT ${r.bar}/10: ${r.title}</span>` : '';
    if (!L.goal) { t.innerHTML = flash || '<span class="tk-goal">ALL GOALS PLAYED</span>'; return; }
    const G = L.goal, d = prevBar == null ? 0 : L.bar - prevBar;
    t.innerHTML = `${flash}<span class="tk-idx">GOAL ${G.idx}/5</span><span class="tk-goal">${G.title}</span>
      ${barHTML(L.bar)}<span class="tk-pts"><b>${L.bar}</b>/10 ${d ? `<em class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '&#9650;' : '&#9660;'}${Math.abs(d)}</em>` : ''} &middot; NEED ${LL.LINE}</span>
      <span class="tk-base">KIDS LIKE YOU: ${G.base}%</span>`;
  }
  function hud() {
    $('hud').hidden = !L;
    if (!L) return;
    $('hAge').textContent = L.age > 90 ? '-' : L.age;
    $('hPct').textContent = L.age < 18 ? 'PARENTS ' + LL.ord(L.parentPct) : L.edu === 'college' && L.age < 24 ? 'STUDENT' : L.scene === 'jail' ? 'NONE' : LL.ord(L.pct);
    $('tag').textContent = L.scene === 'end' ? 'EPILOGUE' : 'AGE ' + L.age;
  }
  function say(lines, cards) {
    const why = cards && cards.length ? `<button class="why" id="whyBtn" aria-expanded="false">WHY?</button><div class="cards" id="cards" hidden>${cards.map(c => `<div class="card"><h3>WHAT THE DATA SAYS</h3><p>${c.text}</p><p class="src">${srcLinks(c.src)}</p></div>`).join('')}</div>` : '';
    $('dialog').innerHTML = lines.map(l => `<p class="${l.tone || ''}">${l.text}</p>`).join('') + why;
    const wb = $('whyBtn');
    if (wb) wb.onclick = () => { const c = $('cards'); c.hidden = !c.hidden; wb.setAttribute('aria-expanded', String(!c.hidden)); wb.textContent = c.hidden ? 'WHY?' : 'HIDE'; };
  }
  function choices(list) {
    const box = $('choices'); box.innerHTML = '';
    list.forEach(([label, sub, fn, primary]) => {
      const b = document.createElement('button');
      b.className = 'btn' + (primary ? ' primary' : '');
      b.innerHTML = `<span class="cur">&#9654;</span><span>${label}${sub ? `<small>${sub}</small>` : ''}</span>`;
      b.addEventListener('click', fn); box.appendChild(b);
    });
  }

  function start(fixed) {
    L = LL.newLife('life-' + Date.now() + '-' + Math.random(), fixed);
    choiceLog = []; pathAnswer = null; $('extra').innerHTML = '';
    hud(); ticker(null);
    say([{ text: LL.describeBirth(L) }], [LL.birthCard(L)]);
    choices([['GROW UP', null, () => step(null), true]]);
    window.scrollTo({ top: 0 });
  }

  function step(focus, answer) {
    choiceLog.push(focus ?? null);
    const prev = L.bar;
    L.pending = null;
    const lines = LL.advance(L, focus, answer);
    hud();
    ticker(prev);
    if (L.done) { say(lines, L.cards); finish(); return; }
    const out = lines.length ? lines : [{ text: 'Life goes on.' }];
    if (L.pending) {
      const P = L.pending;
      if (P.q) out.push({ text: P.q, tone: 'q' });
      say(out, L.cards);
      if (P.key === 'path') choices(P.options.map(([k, label, sub], i) => [label, sub, () => { pathAnswer = k; step('steady', k); }, i === 0]));
      else choices(P.options.map(([k, label, sub]) => [label, sub, () => step('steady', 'go'), true]));
      return;
    }
    if (L.age < 17) { say(out, L.cards); choices([['KEEP GOING', null, () => step(null), true]]); return; }
    const next = LL.TURNS[L.turn + 1];
    out.push({ text: `How do you spend the next ${next.age - L.age} years?`, tone: 'q' });
    say(out, L.cards);
    const q = LL.dreamFor(L);
    const goFor = q ? [[q.tries ? 'TRY AGAIN' : 'GO FOR IT', `${q.dream} +1 if it works: about ${Math.round(q.odds * 100)}% chance${q.tries ? ', better than last time' : ''}.`, () => step('dream'), true]] : [];
    if (L.scene === 'jail') { choices([...goFor, ['SERVE YOUR TIME', null, () => step('steady'), !q]]); return; }
    const lowKids = L.kids.length && L.pct < 40;
    choices([
      ...goFor,
      [L.edu === 'college' ? 'STUDY HARD' : 'TAKE NIGHT CLASSES', 'Half the time: +1.', () => step('study'), !q],
      ['PICK UP EXTRA SHIFTS', lowKids ? '+1, but your family pays for it: -1.' : '+1, with a chance of burnout: -1.', () => step('hustle')],
      ['REST AND SEE FAMILY', 'Setbacks are half as likely this round.', () => step('rest')],
    ]);
  }

  // ---------- ending ----------
  function sparkline() {
    const pts = L.history, w = 300, h = 96, pad = 16, maxAge = 64;
    const x = a => pad + (Math.min(a, maxAge) / maxAge) * (w - pad * 2), y = v => h - pad - (v / 10) * (h - pad * 2);
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.age).toFixed(1)},${y(p.bar).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" class="spark" role="img" aria-label="Your bar over your life">
      <line x1="${pad}" x2="${w - pad}" y1="${y(LL.LINE)}" y2="${y(LL.LINE)}" class="grid"/>
      <text x="${w - pad}" y="${y(LL.LINE) - 3}" class="lbl" text-anchor="end">NEED ${LL.LINE}</text>
      <path d="${path}" class="line"/>
      ${pts.map(p => `<rect x="${(x(p.age) - 2).toFixed(1)}" y="${(y(p.bar) - 2).toFixed(1)}" width="4" height="4" class="dot"/>`).join('')}
      ${[0, 18, 24, 35, 64].map(a => `<text x="${x(a)}" y="${h - 3}" class="lbl" text-anchor="middle">${a === 64 ? '60+' : a}</text>`).join('')}
    </svg>`;
  }
  function oddsTable(pp) {
    const T = LL.table(pp), pctf = v => v == null ? '&ndash;' : Math.round(v[0] * 100) + '%' + (v[1] ? '<sup>*</sup>' : '');
    const races = [['black', 'BLACK'], ['asian', 'ASIAN'], ['white', 'WHITE'], ['hisp', 'HISPANIC']];
    return `<div class="scroll"><table class="odds wide">
      <thead><tr><th rowspan="2">GOAL</th>${races.map(([, n]) => `<th colspan="2" class="grp">${n}</th>`).join('')}</tr>
      <tr>${races.map(() => '<th>GIRLS</th><th>BOYS</th>').join('')}</tr></thead>
      <tbody>${T.rows.map(([label, vals]) => `<tr><td>${label}</td>${vals.map((v, i) => `<td class="${T.groups[i][0] === L.race && T.groups[i][1] === L.gender ? 'you' : ''}">${v[0] == null ? '&ndash;' : pctf(v)}</td>`).join('')}</tr>`).join('')}
      <tr><td>Finish a degree, once started</td><td colspan="8" class="all">${Math.round(T.finish * 100)}% for all groups (not published by race)</td></tr>
      <tr><td>Out-earn your parents</td><td colspan="8" class="all">${Math.round(T.outearn * 100)}% for all groups (not published by race)</td></tr>
      </tbody></table></div>
      <p class="note"><sup>*</sup> Estimated. High school and college rates are published only for Black and white children, so Asian and Hispanic cells use the Black and white average (high school) or the Pell Institute income gradient (college). &ndash; means not published.</p>`;
  }
  function finish() {
    const n = Object.values(L.results).filter(Boolean).length;
    const parentAt = Math.round(L.pct);
    choices([
      ...(L.kids.length ? [['PLAY AS YOUR CHILD', `Their life starts where yours got to: the ${LL.ord(parentAt)} percentile.`, () => start({ race: L.race, parentPct: parentAt }), true]] : []),
      ['DRAW ANOTHER LIFE', null, () => start({}), !L.kids.length],
      ['CHOOSE YOUR START', 'Pick race, gender and family income.', chooser],
    ]);
    const altPct = L.parentPct <= 60 ? 95 : 5;
    const alt = LL.simulate(L.seed, { race: L.race, gender: L.gender, parentPct: altPct }, { list: choiceLog, path: pathAnswer || 'school' });
    const altN = Object.values(alt.results).filter(Boolean).length;
    const names = { hs: 'High school', path: L.path === 'school' ? 'Degree' : 'Steady job', middle: 'Out of bottom 40%', outearn: 'Out-earn parents', live65: 'Live to 65' };
    $('extra').innerHTML = `
      <div class="panel">
        <h2>WHAT YOU BUILT</h2>
        ${L.wins.length ? `<ul class="wins">${[...L.wins].sort((a, b) => a.age - b.age).map(w => `<li><span>${w.age}</span>${w.text}</li>`).join('')}</ul>` : '<p>A hard life. You kept going.</p>'}
      </div>
      <div class="panel">
        <h2>YOUR GOALS: ${n} OF 5</h2>
        <ul class="res">${Object.keys(names).map(k => `<li class="${L.results[k] ? 'hit' : 'miss'}"><i>${L.results[k] ? '&#10003;' : 'x'}</i>${names[k]}</li>`).join('')}</ul>
        ${sparkline()}
        <p class="note">Your bar over your life. Ending a goal at ${LL.LINE} or above hits it; the bar carries into the next goal.</p>
      </div>
      <div class="panel">
        <h2>SAME YOU. SAME CHOICES. SAME LUCK.</h2>
        <p>We replayed your life with one change: your parents' income.</p>
        <div class="compare">
          <div><h3>BORN AT THE ${LL.ord(L.parentPct).toUpperCase()}</h3><p>${n} of 5 goals</p><p>Income at 35: ${LL.ord(L.pct)}</p><p>Lived to ${L.deathAge}</p></div>
          <div><h3>BORN AT THE ${LL.ord(altPct).toUpperCase()}</h3><p>${altN} of 5 goals</p><p>Income at 35: ${LL.ord(alt.pct)}</p><p>Lived to ${alt.deathAge}</p></div>
        </div>
      </div>
      <div class="panel">
        <h2>THE ODDS, BY GROUP</h2>
        <p>Published rates for kids whose parents were in the selected income group. Your group is highlighted.</p>
        <div class="seg-pick" role="group" aria-label="Parents' income">${['Bottom 20%', '2nd 20%', 'Middle 20%', '4th 20%', 'Top 20%'].map((n, i) => `<button class="pick ${i === L.pq ? 'on' : ''}" data-pp="${i * 20 + 10}">${n}</button>`).join('')}</div>
        <div id="oddsTable">${oddsTable(L.pq * 20 + 10)}</div>
      </div>
      ${sources()}`;
    document.querySelectorAll('.seg-pick .pick').forEach(b => b.onclick = () => {
      document.querySelectorAll('.seg-pick .pick').forEach(x => x.classList.toggle('on', x === b));
      $('oddsTable').innerHTML = oddsTable(+b.dataset.pp);
    });
  }
  function sources() {
    return `<div class="panel" id="sources">
      <h2>WHERE THE NUMBERS COME FROM</h2>
      <ul class="sources">${Object.values(LL.SRC).map(([label, url]) => `<li><a href="${url}" target="_blank" rel="noopener">${label}</a></li>`).join('')}</ul>
      <p class="sources">How the bar works: every event moves it by 1. Once a round, a roll uses the published odds for kids born where you were, pulling the bar toward where they usually end up, so across many lives the game lands near the real rates. Event chances by income are our modelling choice. Gaps by race reflect neighborhoods, schools, discrimination and family wealth, not race itself.</p>
    </div>`;
  }
  function chooser() {
    $('extra').innerHTML = '';
    say([{ text: 'Pick a starting point. Everything after birth still comes down to the odds.' }]);
    $('choices').innerHTML = `
      <div class="panel">
        <label class="f" for="cRace">RACE / ETHNICITY<select id="cRace"><option value="white">White</option><option value="black">Black</option><option value="hisp">Hispanic</option><option value="asian">Asian</option><option value="aian">American Indian</option></select></label>
        <label class="f" for="cGender">GENDER<select id="cGender"><option value="f">Female</option><option value="m">Male</option></select></label>
        <label class="f" for="cPar">PARENTS' INCOME<select id="cPar"><option value="10">Bottom 20%</option><option value="30">2nd 20%</option><option value="50" selected>Middle 20%</option><option value="70">4th 20%</option><option value="90">Top 20%</option></select></label>
      </div>`;
    const b = document.createElement('button');
    b.className = 'btn primary'; b.innerHTML = '<span class="cur">&#9654;</span><span>START THIS LIFE</span>';
    b.onclick = () => start({ race: $('cRace').value, gender: $('cGender').value, parentPct: +$('cPar').value + Math.floor(Math.random() * 19) - 9 });
    $('choices').appendChild(b);
  }
  function titleScreen() {
    L = null; hud(); ticker();
    say([
      { text: 'You don\'t choose where you\'re born. Draw a random American life and chase five goals, one at a time.' },
      { text: 'Your bar runs from 0 to 10. End each goal at 6 or more to hit it. Every round, the real odds for kids like you push it up or down. Tap WHY? to see the numbers.', tone: 'q' },
    ]);
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
