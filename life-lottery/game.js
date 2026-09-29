// Life Lottery UI + pixel scenes
(function () {
  const $ = id => document.getElementById(id);
  const cv = $('cv'), g = cv.getContext('2d');
  const W = 160, H = 96;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let L = null, focusLog = [], collegeAnswer = null, frame = 0, lastTurnText = [];

  const GOALS = [
    ['college', 'START COLLEGE BY 18'],
    ['degree', "FINISH A BACHELOR'S BY 22"],
    ['middle', 'GET OUT OF THE BOTTOM 40% BY 35'],
    ['outearn', 'OUT-EARN YOUR PARENTS'],
    ['live65', 'LIVE TO RETIREMENT AGE (65)'],
  ];
  const GOAL_DEADLINE = { college: 18, degree: 22, middle: 35, outearn: 35, live65: 36 };

  // ---------- pixel art ----------
  const SKIN = { white: ['#f3cfb1', '#e8b894'], asian: ['#efc9a0', '#d9a878'], hisp: ['#d9a36f', '#b98050'], aian: ['#c98e5c', '#a8704a'], black: ['#8d5a3b', '#5e3b26'] };
  const HAIR = { white: ['#5a3a22', '#d9b25f', '#2a1d16'], asian: ['#1a1418', '#2a1d16', '#1a1418'], hisp: ['#1a1418', '#3b2718', '#2a1d16'], aian: ['#1a1418', '#1a1418', '#2a1d16'], black: ['#1a1418', '#2a1d16', '#1a1418'] };

  function px(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x | 0, y | 0, w, h); }

  const SPR = {
    adult_m: [
      '..hhhh..', '.hhhhhh.', '.hssssh.', '..seses.', '..ssss..', '...ss...', '.cccccc.', 'cccccccc', 's.cccc.s', 's.cccc.s', '..pppp..', '..p..p..', '..p..p..', '.bb..bb.'],
    adult_f: [
      '..hhhh..', '.hhhhhh.', 'hhssssh.', 'h.seses.', 'h.ssss..', 'h..ss...', '.cccccc.', 'cccccccc', 's.cccc.s', 's.cccc.s', '..cccc..', '.cccccc.', '..s..s..', '.bb..bb.'],
    kid: ['.hhhh.', 'hhhhhh', 'hsssss', '.seses', '.ssss.', 'cccccc', 's.cc.s', '.pppp.', '.p..p.', 'bb..bb'],
    baby: ['..hh..', '.ssss.', '.seses', '.wwww.', 'wwwwww', '.wwww.'],
  };
  function drawSprite(name, x, y, pal, step) {
    const rows = SPR[name];
    rows.forEach((row, j) => {
      let r = row;
      if (step && j >= rows.length - 2 && name !== 'baby') r = j === rows.length - 1 ? r.replace('.bb..bb.', 'bb....bb').replace('bb..bb', '.bbbb.') : r;
      for (let i = 0; i < r.length; i++) {
        const ch = r[i]; if (ch === '.') continue;
        px(x + i * 2, y + j * 2, 2, 2, pal[ch] || '#f0f');
      }
    });
  }
  function palette() {
    const s = SKIN[L.race][L.tones.skin % 2], h = HAIR[L.race][L.tones.hair % 3];
    let c = '#4d7fd6', p = '#2f3558', b = '#1a1418';
    if (L.scene === 'school') c = '#d9544d';
    if (L.scene === 'campus') c = '#6b4fa8';
    if (L.scene === 'work') { c = L.pct >= 55 ? '#e8e2d4' : '#f28c28'; p = L.pct >= 55 ? '#2d2f45' : '#3a4a6b'; }
    if (L.scene === 'jail') { c = '#f07c1e'; p = '#f07c1e'; }
    if (L.scene === 'end') { c = '#9aa7b8'; }
    return { h, s, e: '#1a1418', c, p, b, w: '#f4f0e6' };
  }

  function sky(top, bottom) {
    for (let y = 0; y < 70; y++) { px(0, y, W, 1, y < 35 ? top : ((y % 2 === 0) ? bottom : top)); if (y > 45) px(0, y, W, 1, bottom); }
  }
  function ground(c1, c2) { px(0, 70, W, 26, c1); for (let x = 0; x < W; x += 4) px(x + (frame % 4), 72, 2, 1, c2); }
  function windowGrid(x, y, cols, rows, lit) {
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) px(x + i * 6, y + j * 7, 3, 4, ((i * 7 + j * 3) % 5 < lit) ? '#ffd27a' : '#3a3556');
  }
  function cloud(x, y) { px(x, y, 12, 3, '#e8e2f2'); px(x + 3, y - 2, 6, 2, '#e8e2f2'); }

  function scene() {
    if (!L) { titleScene(); return; }
    const sc = L.scene, pq = L.pq;
    const dusk = sc === 'end';
    sky(dusk ? '#e98a5b' : sc === 'jail' ? '#4a4a5c' : '#6fa8dc', dusk ? '#f2c078' : sc === 'jail' ? '#5c5c70' : '#9cc6e8');
    if (sc !== 'jail') { cloud((frame * .3 + 20) % 190 - 20, 12); cloud((frame * .2 + 110) % 190 - 20, 22); }
    ground(sc === 'jail' ? '#55525f' : '#4f8a4b', sc === 'jail' ? '#46434f' : '#3f7a3c');
    if (sc === 'home') home(pq);
    if (sc === 'school') { px(20, 30, 70, 40, '#b5523b'); windowGrid(26, 36, 10, 4, 2); px(48, 56, 12, 14, '#5a3325'); px(95, 20, 1, 50, '#ccc'); px(96, 20, 10, 6, '#d9544d'); px(96, 23, 10, 1, '#fff'); }
    if (sc === 'campus') { px(12, 34, 84, 36, '#d9d1bd'); px(8, 30, 92, 5, '#c2b89f'); px(30, 18, 48, 12, '#d9d1bd'); for (let i = 0; i < 7; i++) px(18 + i * 11, 38, 4, 32, '#efe8d6'); px(118, 40, 20, 18, '#3e8a4e'); px(126, 58, 4, 12, '#6b4a2b'); }
    if (sc === 'work') {
      if (L.pct >= 55) { px(14, 8, 44, 62, '#4a5a7a'); windowGrid(17, 12, 7, 8, 3); px(62, 26, 34, 44, '#5b6b8c'); windowGrid(65, 30, 5, 5, 2); }
      else { px(8, 36, 96, 34, '#8a8f9c'); for (let i = 0; i < 4; i++) px(14 + i * 22, 48, 16, 22, '#5d6270'); px(8, 32, 96, 4, '#6b707c'); px(20, 26, 40, 6, '#d94f3a'); }
    }
    if (sc === 'jail') { px(0, 20, W, 50, '#77737f'); for (let i = 0; i < W; i += 8) px(i, 20, 4, 50, '#8a8693'); px(30, 34, 40, 26, '#2a2833'); for (let i = 0; i < 8; i++) px(32 + i * 5, 34, 2, 26, '#b6b3bd'); }
    if (sc === 'end') {
      if (L.goals.live65) { px(96, 60, 30, 3, '#7a4f2e'); px(98, 63, 2, 7, '#5a3a22'); px(122, 63, 2, 7, '#5a3a22'); px(96, 54, 30, 2, '#7a4f2e'); }
      else { px(112, 50, 14, 20, '#9a98a6'); px(114, 48, 10, 2, '#9a98a6'); px(118, 54, 2, 8, '#6d6b78'); px(115, 56, 8, 2, '#6d6b78'); }
    }
    // character
    const pal = palette();
    const step = !reduced && (frame >> 3) % 2 === 1;
    const bob = 0;
    if (L.age < 3) drawSprite('baby', 72, 58 + bob, pal, false);
    else if (L.age < 14) drawSprite('kid', 72, 50 + bob, pal, step);
    else if (sc === 'end' && !L.goals.live65) { /* early death: an empty bench-less field, headstone only */ }
    else drawSprite(L.gender === 'f' ? 'adult_f' : 'adult_m', sc === 'end' ? 103 : 72, sc === 'end' ? 38 : 42, pal, sc === 'end' ? false : step);
    // family: partner and kids stand with you
    if (L.age >= 20 && sc !== 'jail' && sc !== 'end') {
      if (L.partner) {
        const pg = LL.hash(L.seed + '|pg') < .5 ? 'adult_f' : 'adult_m';
        const races = Object.keys(SKIN), pr = races[Math.floor(LL.hash(L.seed + '|pr') * races.length * 1.6) % races.length];
        const pr2 = LL.hash(L.seed + '|same') < .8 ? L.race : pr;
        drawSprite(pg, 96, 42, { ...pal, s: SKIN[pr2][1], h: HAIR[pr2][0], c: '#5cc8a6', p: '#2f3558' }, !step);
      }
      if (L.kids >= 1) drawSprite('kid', 54, 50, { ...pal, c: '#f2a541', p: '#3a4a6b' }, step);
      if (L.kids >= 2) drawSprite('kid', 118, 50, { ...pal, c: '#ec6a5e', p: '#3a4a6b' }, !step);
    }
  }

  function home(pq) {
    if (pq === 0) { px(16, 14, 64, 56, '#8c6e5a'); windowGrid(21, 18, 9, 5, 2); px(16, 52, 64, 18, '#6a8fb0'); px(22, 55, 40, 6, '#e8e2d4'); px(24, 57, 36, 2, '#4a6a8a'); px(66, 56, 10, 14, '#3a3556'); }
    if (pq === 1) { px(14, 36, 80, 34, '#c9b48f'); px(10, 28, 88, 8, '#7a4a3a'); windowGrid(20, 42, 3, 2, 1); windowGrid(62, 42, 3, 2, 1); px(46, 50, 10, 20, '#5a3a2e'); px(52, 30, 4, 10, '#8a8a8a'); }
    if (pq === 2) { px(20, 38, 64, 32, '#e6d8b8'); px(14, 30, 76, 8, '#8b3a2e'); px(24, 24, 56, 6, '#8b3a2e'); windowGrid(28, 44, 2, 2, 2); windowGrid(62, 44, 2, 2, 2); px(48, 52, 10, 18, '#3e6b4e'); px(100, 44, 18, 16, '#4a8a4a'); px(107, 60, 4, 10, '#6b4a2b'); }
    if (pq === 3) { px(14, 30, 88, 40, '#f0ead8'); px(8, 22, 100, 8, '#3d4a6b'); windowGrid(22, 36, 5, 3, 4); px(52, 50, 12, 20, '#3d4a6b'); px(112, 30, 24, 26, '#3f8a4a'); px(122, 56, 4, 14, '#6b4a2b'); px(104, 64, 36, 6, '#d8d2c0'); }
    if (pq === 4) { px(6, 20, 110, 50, '#f4f0e4'); px(2, 12, 118, 8, '#2f3a54'); for (let i = 0; i < 5; i++) px(14 + i * 20, 26, 4, 44, '#ffffff'); windowGrid(10, 26, 16, 4, 5); px(52, 50, 16, 20, '#2f3a54'); px(124, 58, 28, 8, '#b32d2d'); px(128, 54, 18, 5, '#b32d2d'); px(128, 66, 5, 4, '#1a1418'); px(144, 66, 5, 4, '#1a1418'); }
  }

  function titleScene() {
    sky('#2b2451', '#4a3f73');
    for (let i = 0; i < 30; i++) { const x = (i * 53) % W, y = (i * 29) % 40; px(x, y, 1, 1, (frame >> 4) % 2 && i % 3 === 0 ? '#4a3f73' : '#f1e7d0'); }
    ground('#2f3f3a', '#263530');
    // ladder
    for (let y = 8; y < 70; y += 6) px(116, y, 22, 2, '#f2a541');
    px(116, 6, 2, 64, '#f2a541'); px(136, 6, 2, 64, '#f2a541');
    // skyline
    px(10, 40, 18, 30, '#3a3464'); px(30, 30, 14, 40, '#3a3464'); px(46, 46, 22, 24, '#3a3464'); px(70, 36, 12, 34, '#3a3464'); px(84, 50, 18, 20, '#3a3464');
    windowGrid(12, 44, 3, 3, 2); windowGrid(32, 34, 2, 5, 2); windowGrid(72, 40, 2, 4, 1);
    // dice
    px(58, 58, 10, 10, '#f1e7d0'); px(60, 60, 2, 2, '#1b1830'); px(64, 64, 2, 2, '#1b1830'); px(62, 62, 2, 2, '#1b1830');
  }

  function loop() {
    frame++;
    if (frame % 2 === 0) { g.clearRect(0, 0, W, H); scene(); }
    if (!reduced) requestAnimationFrame(loop);
  }

  // ---------- UI ----------
  function hud() {
    $('hud').hidden = !L;
    if (!L) return;
    $('hAge').textContent = L.age;
    $('hPct').textContent = L.age < 18 ? 'PARENTS ' + LL.ord(L.parentPct) : L.edu === 'college' ? 'STUDENT' : L.scene === 'jail' ? 'NONE' : LL.ord(L.pct);
    $('hWins').textContent = L.wins.length;
    $('hHearts').innerHTML = [0, 1, 2, 3, 4].map(i => `<span class="heart ${i < L.hearts ? '' : 'off'}"></span>`).join('');
    $('tag').textContent = L.scene === 'end' ? 'EPILOGUE' : 'AGE ' + L.age;
    const gl = $('goals'); gl.hidden = false;
    gl.innerHTML = GOALS.map(([k, t]) => {
      const won = L.goals[k] != null; const lost = !won && (L.age >= GOAL_DEADLINE[k] || (k === 'degree' && L.age >= 18 && L.edu !== 'college' && L.edu !== 'degree'));
      return `<div class="goal ${won ? 'won' : lost ? 'lost' : ''}"><i>${won ? '&#10003;' : lost ? 'x' : ''}</i>${t}</div>`;
    }).join('');
  }

  function say(lines) {
    $('dialog').innerHTML = lines.map(l => `<p class="${l.tone || ''}">${l.text}</p>`).join('');
  }
  function choices(list) {
    $('choices').innerHTML = '';
    list.forEach(([label, sub, fn, primary]) => {
      const b = document.createElement('button');
      b.className = 'btn' + (primary ? ' primary' : '');
      b.innerHTML = `<span class="cur">&#9654;</span><span>${label}${sub ? `<small>${sub}</small>` : ''}</span>`;
      b.addEventListener('click', fn);
      $('choices').appendChild(b);
    });
    const first = $('choices').querySelector('button'); if (first && document.activeElement && document.activeElement.tagName === 'BUTTON') first.focus({ preventScroll: true });
  }

  function start(fixed) {
    L = LL.newLife('life-' + Date.now() + '-' + Math.random(), fixed);
    focusLog = []; collegeAnswer = null; $('extra').innerHTML = '';
    hud();
    say([{ text: LL.describeBirth(L) }, { text: birthOdds(), tone: 'q' }]);
    choices([['GROW UP', null, () => step(null), true]]);
  }

  function birthOdds() {
    const row = US_DATA.groups[L.race + '_' + L.gender].mob[L.pq];
    const top = Math.round(row[4] * 100), bottom = Math.round(row[0] * 100);
    return `Of kids born where you were, ${bottom}% end up in the bottom fifth as adults and ${top}% reach the top fifth.`;
  }

  function step(focus, answer) {
    focusLog.push(focus ?? null);
    L.pending = null;
    const lines = LL.advance(L, focus, answer);
    hud();
    lastTurnText = lines;
    if (L.done) { say(lines); finish(); return; }
    if (L.pending) {
      say([...lines, { text: L.pending.q, tone: 'q' }]);
      if (L.pending.key === 'college') choices([
        ['APPLY TO COLLEGE', 'Your odds depend on where you started.', () => { collegeAnswer = 'apply'; step('steady', 'apply'); }, true],
        ['START WORKING', 'Earn now. Skip the debt.', () => { collegeAnswer = 'work'; step('steady', 'work'); }],
      ]);
      else choices([['FAST-FORWARD', 'See how the rest of your life goes.', () => step('steady', 'go'), true]]);
      return;
    }
    say(lines.length ? lines : [{ text: 'Life goes on.' }]);
    if (L.age < 17) { choices([['KEEP GOING', null, () => step(null), true]]); return; }
    const next = LL.AGES[L.turn + 1];
    say([...(lines.length ? lines : [{ text: 'Life goes on.' }]), { text: `How do you spend the next ${next - L.age} years?`, tone: 'q' }]);
    const inJail = L.scene === 'jail';
    const q = LL.questFor(L);
    const goFor = q ? [[q.tries ? 'TRY AGAIN' : 'GO FOR IT', `${q.dream} About ${Math.round(q.odds * 100)}% chance${q.tries ? ', better than last time' : ''}.`, () => step('quest'), true]] : [];
    choices(inJail ? [...goFor, ['SERVE YOUR TIME', null, () => step('steady'), !q]] : [
      ...goFor,
      [L.edu === 'college' ? 'STUDY HARD' : 'TAKE NIGHT CLASSES', 'Small boost to your prospects.', () => step('study'), !q],
      ['PICK UP EXTRA SHIFTS', 'Bigger push, but costs a heart.', () => step('hustle')],
      ['REST AND SEE FAMILY', 'Recover a heart. Fewer setbacks.', () => step('rest')],
    ]);
  }

  // ---------- ending ----------
  function finish() {
    const n = Object.values(L.goals).filter(v => v != null).length;
    const parentAt = Math.round(L.pct);
    choices([
      ...(L.kids ? [['PLAY AS YOUR CHILD', `Their life starts where yours got to: the ${LL.ord(parentAt)} percentile.`, () => start({ race: L.race, parentPct: parentAt, cohort: L.cohort }), true]] : []),
      ['DRAW ANOTHER LIFE', null, () => start({}), !L.kids],
      ['CHOOSE YOUR START', 'Pick race, gender, family income and generation.', chooser],
    ]);
    const fixed = { race: L.race, gender: L.gender, cohort: L.cohort };
    const quint = [10, 30, 50, 70, 90];
    const rows = quint.map(pp => ({ pp, o: LL.odds({ ...fixed, parentPct: pp }, 800) }));
    const youQ = L.pq;
    // same-you replay at the other extreme
    const altPct = L.parentPct <= 60 ? 95 : 5;
    const alt = LL.simulate(L.seed, { race: L.race, gender: L.gender, cohort: L.cohort, parentPct: altPct }, { list: focusLog.slice(1), college: collegeAnswer || 'apply' });
    const altN = Object.values(alt.goals).filter(v => v != null).length;
    const gname = `${LL.RACES[L.race]} ${L.gender === 'f' ? 'girls' : 'boys'}`;
    const pctf = x => Math.round(x * 100) + '%';
    $('extra').innerHTML = `
      <div class="panel">
        <h2>WHAT YOU BUILT: &#9733; ${L.wins.length}</h2>
        ${L.wins.length ? `<ul class="wins">${[...L.wins].sort((x, y) => x.age - y.age).map(w => `<li><span>${w.age}</span>${w.text}</li>`).join('')}</ul>` : '<p>A hard life. You kept going.</p>'}
      </div>
      <div class="panel">
        <h2>YOU MET ${n} OF 5 BIG GOALS</h2>
        <p>Your household income at 35 was the ${LL.ord(L.pct)} percentile. Your parents were at the ${LL.ord(L.parentPct)}.</p>
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
        <h2>THE ODDS FOR ${gname.toUpperCase()}</h2>
        <p>Share who reach each goal, by parents' income. Your row is highlighted.</p>
        <div class="scroll"><table class="odds">
          <thead><tr><th>PARENTS</th><th>COLLEGE</th><th>DEGREE</th><th>MIDDLE</th><th>OUT-EARN</th><th>AGE 65</th></tr></thead>
          <tbody>${rows.map((r, i) => `<tr class="${i === youQ ? 'you' : ''}"><td>${['Bottom 20%', '2nd 20%', 'Middle 20%', '4th 20%', 'Top 20%'][i]}</td><td>${pctf(r.o.college)}</td><td>${pctf(r.o.degree)}</td><td>${pctf(r.o.middle)}</td><td>${pctf(r.o.outearn)}</td><td>${pctf(r.o.live65)}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>
      ${sources()}`;
  }

  function sources() {
    return `<div class="panel" id="sources">
      <h2>WHERE THE ODDS COME FROM</h2>
      <ul class="sources">
        <li>Where you are born and where you end up, by race and gender: Chetty, Hendren, Jones &amp; Porter (2020), <a href="https://opportunityinsights.org/paper/race/" target="_blank" rel="noopener">Race and Economic Opportunity in the United States</a>. Children born 1978&ndash;83.</li>
        <li>College attendance and incarceration (Black and white children): same paper. For other groups, college odds use the <a href="https://www.pellinstitute.org/indicators-2024-data-and-charts/" target="_blank" rel="noopener">Pell Institute</a> income gradient.</li>
        <li>Finishing a degree: Pell Institute, Indicators of Higher Education Equity 2024 (bachelor's by 24, by family income).</li>
        <li>Out-earning your parents: Chetty et al. (2017), <a href="https://opportunityinsights.org/paper/the-fading-american-dream/" target="_blank" rel="noopener">The Fading American Dream</a>.</li>
        <li>Lifespan: Chetty et al. (2016), <a href="https://opportunityinsights.org/paper/the-association-between-income-and-life-expectancy-in-the-united-states-2001-2014/" target="_blank" rel="noopener">Income and Life Expectancy</a>, life expectancy at 40 by income.</li>
        <li>Dollar amounts: approximate 2025 household income by percentile, US Census Bureau.</li>
      </ul>
      <p class="sources">How the game works: the data sets the odds of each outcome for someone born where you were. Your choices shift those odds a little. Everyday setbacks in the story are illustrative. The gaps by race reflect neighborhoods, schools, discrimination and family wealth, not race itself.</p>
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
        <label class="f" for="cGen">BORN IN<select id="cGen"><option value="1940">1940s</option><option value="1950">1950s</option><option value="1960">1960s</option><option value="1970">1970s</option><option value="1980" selected>1980s</option></select></label>
        <p class="sources">Birth year changes the odds of out-earning your parents. The other odds come from children born 1978&ndash;83.</p>
      </div>`;
    const b = document.createElement('button');
    b.className = 'btn primary'; b.innerHTML = '<span class="cur">&#9654;</span><span>START THIS LIFE</span>';
    b.onclick = () => {
      const pp = +$('cPar').value + Math.floor(Math.random() * 19) - 9;
      start({ race: $('cRace').value, gender: $('cGender').value, parentPct: pp, cohort: $('cGen').value });
    };
    $('choices').appendChild(b);
  }

  function titleScreen() {
    L = null; hud();
    say([
      { text: 'You do not choose where you are born. Draw a random American life and try to reach five goals by retirement.' },
      { text: 'Every odd in this game comes from real US data on millions of people.', tone: 'q' },
    ]);
    choices([
      ['DRAW A LIFE', 'Random start, weighted like real US births.', () => start({}), true],
      ['CHOOSE YOUR START', 'Pick race, gender, family income and generation.', chooser],
    ]);
    $('extra').innerHTML = '';
  }

  $('srcLink').addEventListener('click', e => { if (!$('sources')) { e.preventDefault(); $('extra').insertAdjacentHTML('beforeend', sources()); $('sources').scrollIntoView(); } });

  titleScreen();
  if (reduced) { scene(); setInterval(() => { g.clearRect(0, 0, W, H); scene(); }, 500); } else loop();
})();
