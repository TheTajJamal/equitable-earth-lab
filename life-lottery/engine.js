// Life Lottery engine: seeded and replayable. The data sets the odds; choices nudge them a little.
(function (root) {
  const D = () => root.US_DATA;

  // ---------- math helpers ----------
  function hash(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); h ^= h >>> 16;
    let t = (h + 0x6D2B79F5) >>> 0;
    t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  function erf(x) { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + .3275911 * x); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x)); }
  const Phi = z => .5 * (1 + erf(z / Math.SQRT2));
  function PhiInv(p) {
    p = Math.min(Math.max(p, 1e-9), 1 - 1e-9);
    const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924], b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857], c = [-.00778489400243029, -.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878], d = [.00778469570904146, .32246712907004, 2.445134137143, 3.75440866190742];
    let q, r;
    if (p < .02425) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - .02425) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - .5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function interp(xs, ys, x) {
    if (x <= xs[0]) return ys[0];
    for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
    return ys[ys.length - 1];
  }
  const pick = (r, arr) => arr[Math.floor(r * arr.length) % arr.length];

  // ---------- data lookups ----------
  const RACES = { white: 'White', black: 'Black', hisp: 'Hispanic', asian: 'Asian', aian: 'American Indian' };
  const bw = race => race === 'white' || race === 'black';
  const gword = g => g === 'm' ? 'male' : 'female';

  function dollars(p) { const t = D().dollars; return interp(t.map(x => x[0]), t.map(x => x[1]), clamp(p, 1, 99)); }
  function pCollege(race, g, pp) {
    if (bw(race)) return interp(D().pcts, D().college[race + '_' + gword(g)], pp) / 100;
    const P = D().pell; return interp(P.q, P.enroll, pp);
  }
  function pFinishGivenStart(pp) { const P = D().pell; return clamp(interp(P.q, P.ba24, pp) / interp(P.q, P.enroll, pp), 0, .95); }
  function pJail(race, g, pp) { return bw(race) ? interp(D().pcts, D().jail[race + '_' + gword(g)], pp) / 100 : null; }
  function pOutEarn(cohort, pp) { const A = D().abs[cohort]; return interp(D().absPcts, A.byPct, pp); }
  function mobRow(race, g, pq) { return D().groups[race + '_' + g].mob[pq]; }
  function le40(g, pct) { const arr = D().le[g.toUpperCase()]; return arr[clamp(Math.round(pct), 1, 100) - 1]; }

  // Gompertz survival from 40, calibrated so expected age at death = le40. Hazard h(a)=A*exp(B*(a-40)).
  const B = 0.085;
  function gompA(target) {
    let lo = 1e-5, hi = 0.05;
    for (let i = 0; i < 40; i++) { const A = (lo + hi) / 2; (meanDeath(A) > target) ? lo = A : hi = A; }
    return (lo + hi) / 2;
  }
  function survive(A, age) { return Math.exp(-(A / B) * (Math.exp(B * (age - 40)) - 1)); }
  function meanDeath(A) { let s = 40; for (let a = 40; a < 120; a += .5) s += .5 * survive(A, a + .25); return s; }
  function deathAge(A, u) { // inverse survival
    return 40 + Math.log(1 - (B / A) * Math.log(u)) / B;
  }

  // ---------- birth ----------
  function drawBirth(seed, fixed) {
    const R = k => hash(seed + '|birth|' + k);
    const G = D().groups;
    let race = fixed.race, gender = fixed.gender;
    if (!race) {
      const tot = Object.values(G).reduce((s, x) => s + x.count, 0);
      let u = R('race') * tot;
      for (const k in G) { u -= G[k].count; if (u <= 0) { race = k.split('_')[0]; gender = gender || k.split('_')[1]; break; } }
    }
    if (!gender) gender = R('gender') < .5 ? 'f' : 'm';
    let pp = fixed.parentPct;
    if (!pp) {
      const pq = G[race + '_' + gender].parQ; let u = R('pq'), q = 0;
      for (; q < 4; q++) { u -= pq[q]; if (u <= 0) break; }
      pp = Math.min(100, q * 20 + 1 + Math.floor(R('pp') * 20));
    }
    const cohort = fixed.cohort || '1980';
    return { race, gender, parentPct: pp, cohort };
  }

  const RHO = { college: .5, finish: .5, jail: .5, outearn: .8 };

  function newLife(seed, fixed) {
    fixed = fixed || {};
    const b = drawBirth(seed, fixed);
    const R = k => hash(seed + '|' + k);
    const L = {
      seed, ...b, pq: Math.min(4, Math.floor((b.parentPct - 1) / 20)),
      z: PhiInv(R('fortune')), effort: 0, hearts: b.parentPct <= 20 ? 3 : b.parentPct <= 60 ? 4 : 5,
      turn: 0, age: 0, pct: b.parentPct, edu: 'school', jailed: false, jailAge: null,
      goals: { college: null, degree: null, middle: null, outearn: null, live65: null },
      log: [], done: false, pending: null, tone: 'neutral', scene: 'home',
      tones: { skin: Math.floor(R('skin') * 3), hair: Math.floor(R('hair') * 3) },
    };
    L.within = R('within');
    return L;
  }

  // Latent draw correlated with fortune (z + effort)
  function corr(L, key, rho, sign = 1) {
    const e = PhiInv(hash(L.seed + '|' + key));
    return Phi(rho * sign * (L.z + L.effort) + Math.sqrt(1 - rho * rho) * e);
  }
  function destinyPct(L) {
    const row = mobRow(L.race, L.gender, L.pq);
    const u = Phi(L.z + L.effort); let cum = 0, q = 4;
    for (let i = 0; i < 5; i++) { cum += row[i]; if (u < cum) { q = i; break; } }
    return q * 20 + 1 + L.within * 19;
  }

  // Turn schedule: ages the player visits
  const AGES = [0, 5, 11, 17, 18, 20, 22, 24, 26, 28, 30, 32, 35];

  const HOME = [
    'a two-room apartment above a laundromat',
    'a rented duplex near the highway',
    'a three-bedroom house with a small yard',
    'a house in a suburb with good schools',
    'a big house with a two-car garage',
  ];

  function describeBirth(L) {
    const d = Math.round(dollars(L.parentPct) / 1000);
    return `You are born ${L.gender === 'f' ? 'a girl' : 'a boy'} in ${L.cohort === '1980' ? 'the early 1980s' : 'the ' + L.cohort + 's'}. Your family is ${RACES[L.race]}. Your parents earn about $${d}k a year in today's dollars, which puts them at the ${ord(L.parentPct)} percentile. You live in ${HOME[L.pq]}.`;
  }
  function ord(n) { n = Math.round(n); const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

  // Apply a focus choice for the period just lived
  function applyFocus(L, focus) {
    if (!focus) return;
    if (focus === 'study') { L.effort += L.hearts > 1 ? .05 : .02; L.hearts -= (L.parentPct <= 40 && L.edu !== 'college') ? 1 : 0; }
    if (focus === 'hustle') { L.effort += .035; L.hearts -= 1; }
    if (focus === 'rest') { L.hearts += 1; }
    L.hearts = clamp(L.hearts, 0, 5);
  }

  // Advance one turn; returns array of {text, tone}
  function advance(L, focus, answer) {
    const out = [];
    const say = (text, tone = 'neutral') => out.push({ text, tone });
    const R = k => hash(L.seed + '|' + L.turn + '|' + k);
    const prevAge = L.age;
    applyFocus(L, focus);
    L.turn++;
    L.age = AGES[L.turn] ?? 36;
    const a = L.age;
    const pp = L.parentPct, low = pp <= 40, mid = pp > 40 && pp <= 80;

    // shared, illustrative hardships (flavor; odds rise at lower incomes)
    function hardship() {
      const p = L.pct <= 20 ? .45 : L.pct <= 40 ? .3 : L.pct <= 60 ? .18 : .08;
      if (R('hard') < p * (focus === 'rest' ? .6 : 1)) {
        L.hearts = Math.max(0, L.hearts - 1);
        say(pick(R('hardw'), [
          'The car breaks down. The repair costs more than you have saved.',
          'A hospital bill arrives that you cannot pay. It goes to collections.',
          'Your hours get cut with a week of notice.',
          'The rent goes up $250 a month. You take a second job.',
          'Someone in the family gets sick. You cover shifts and pay for medicine.',
        ]), 'bad');
      } else if (R('good') < (L.pct > 60 ? .35 : .15)) {
        L.hearts = Math.min(5, L.hearts + 1);
        say(pick(R('goodw'), [
          'A good year. You pay off a credit card.',
          'Your manager puts in a word and you get a raise.',
          'Your family helps with a deposit on a better apartment.',
          'You take a real vacation for the first time in years.',
        ]), 'good');
      }
    }

    if (a === 5) {
      L.scene = 'home';
      say(low ? 'Both parents work shifts. You spend most days with a neighbor. No preschool.' : mid ? 'You go to a public pre-K half days.' : 'You go to a private preschool. Your parents read to you every night.');
      if (R('evict') < (pp <= 20 ? .2 : pp <= 40 ? .1 : .02)) { L.hearts--; say('Your family is evicted. You move in with your aunt for a while.', 'bad'); }
    } else if (a === 11) {
      L.scene = 'school';
      say(low ? 'Your school has three teachers leave mid-year. There are no after-school programs.' : mid ? 'School is fine. Summers are TV and a week of day camp.' : 'Tutors, travel soccer, and summer camps fill your calendar.');
      if (R('parentjob') < (low ? .25 : mid ? .12 : .05)) { L.hearts--; say('A parent loses their job. Things get tight at home.', 'bad'); }
    } else if (a === 17) {
      L.scene = 'school';
      say(low ? 'You work 20 hours a week after school to help with rent.' : mid ? 'You have a part-time job and take the SAT once.' : 'You take an SAT prep course and tour colleges with your parents.');
      L.pending = { key: 'college', q: 'Senior year. What do you do next?', options: [['apply', 'Apply to college'], ['work', 'Start working']] };
    } else if (a === 18) {
      if (answer === 'apply') {
        const p = pCollege(L.race, L.gender, pp);
        if (corr(L, 'college', RHO.college) > 1 - p) {
          L.edu = 'college'; L.goals.college = 18; L.scene = 'campus';
          say(low ? 'You get in. Grants cover part of it; loans cover the rest. You are the first in your family to go.' : mid ? 'You enroll at the state university. You borrow for most of it.' : 'You start at a selective university. Your parents cover tuition.', 'good');
        } else {
          L.edu = 'work'; L.scene = 'work'; L.hearts--;
          say(pick(R('noc'), [
            'You get in, but the aid leaves a $9,000 gap. You start working full-time instead.',
            'Your family needs your paycheck. You try community college part-time and stop after a semester.',
            'Nobody at home or at school knew the deadlines. Your application is late.',
            'You are admitted, but the campus is three hours away and you cannot afford to move.',
          ]), 'bad');
        }
      } else { L.edu = 'work'; L.scene = 'work'; L.effort -= .1; say(low ? 'You take a full-time job at a warehouse.' : 'You skip college and start working full-time.'); }
    } else if (a <= 35) {
      // college completion at 22-24
      if (L.edu === 'college' && a === 22) {
        const p = pFinishGivenStart(pp);
        if (corr(L, 'finish', RHO.finish) > 1 - p) { L.edu = 'degree'; L.goals.degree = 22; say("You graduate with a bachelor's degree.", 'good'); }
        else {
          L.edu = 'work'; L.hearts--;
          say(pick(R('drop'), [
            'Your hours at work go up and your grades slip. You leave school with debt and no degree.',
            'A family emergency pulls you home. You do not go back.',
            'Your financial aid is cut after a paperwork error. You cannot cover the gap.',
          ]), 'bad');
        }
        L.scene = 'work';
      } else if (L.edu === 'college') { say('Classes, a campus job, and too little sleep.'); }
      // incarceration (data: share incarcerated at ages ~27-32, Black and white children only)
      const pj = pJail(L.race, L.gender, pp);
      if (pj !== null && !L.jailed && a >= 22 && a <= 28 && corr(L, 'jail', RHO.jail, -1) > 1 - pj && a === 22 + 2 * Math.floor(hash(L.seed + '|jailage') * 4)) {
        L.jailed = true; L.jailAge = a; L.hearts = Math.max(0, L.hearts - 2); L.effort -= .15; L.scene = 'jail';
        say('You are arrested and sentenced. You spend the next years in prison. Even after release, most employers will not call you back.', 'bad');
      } else if (L.jailed && L.scene === 'jail' && a >= L.jailAge + 4) { L.scene = 'work'; say('You are released. You take the only job that will hire you.'); }
      else if (L.scene !== 'jail' && a > 18 && !(L.edu === 'college')) {
        L.scene = 'work';
        hardship();
      }
      // income path
      const dest = destinyPct(L);
      const w = clamp((a - 18) / 14, 0, 1);
      L.pct = clamp(pp * (1 - w) * .5 + dest * (1 - (1 - w) * .5) + (hash(L.seed + '|n|' + a) - .5) * 8, 1, 99);
      if (L.edu === 'college') L.pct = Math.min(L.pct, 25);
      if (L.hearts <= 0 && L.scene !== 'jail') { L.effort -= .05; L.hearts = 1; say('Burnout. You miss weeks of work and your health takes a hit.', 'bad'); }
      if (a === 35) {
        L.pct = dest;
        L.goals.middle = dest > 40 ? 35 : null;
        say(`At 35 your household income is about $${Math.round(dollars(dest) / 1000)}k, the ${ord(dest)} percentile.`, dest > 40 ? 'good' : 'bad');
        if (corr(L, 'outearn', RHO.outearn) > 1 - pOutEarn(L.cohort, pp)) { L.goals.outearn = 35; say('You earn more than your parents did at your age.', 'good'); }
        else say('You earn less than your parents did at your age.', 'bad');
        L.pending = { key: 'epilogue', q: 'The rest of your life plays out.', options: [['go', 'Fast-forward']] };
      }
    } else {
      // epilogue: life expectancy by own income (Chetty et al. 2016)
      const le = le40(L.gender, L.pct);
      const A = gompA(le);
      const d = Math.floor(deathAge(A, hash(L.seed + '|death')));
      L.deathAge = Math.max(36, d);
      if (d >= 65) { L.goals.live65 = 65; say(`You retire${L.pct > 60 ? ' comfortably' : L.pct > 30 ? '' : ' late, with little saved'}. You live to ${L.deathAge}.`, 'good'); }
      else say(`Your health fails in your ${Math.floor(L.deathAge / 10) * 10}s. You die at ${L.deathAge}, before you could retire.`, 'bad');
      L.lifeExp = le;
      L.done = true; L.scene = 'end';
    }
    L.log.push(...out.map(o => ({ age: a, ...o })));
    return out;
  }

  // Auto-play (for odds and replays). policy(L) returns focus; answers default to apply.
  function simulate(seed, fixed, focuses) {
    const L = newLife(seed, fixed);
    let i = 0;
    advance(L, null);
    while (!L.done) {
      const ans = L.pending && L.pending.key === 'college' ? (focuses && focuses.college) || 'apply' : 'go';
      const f = focuses && focuses.list ? focuses.list[i] : 'steady';
      L.pending = null; advance(L, f, ans); i++;
    }
    return L;
  }

  function odds(fixed, n = 1500) {
    const c = { college: 0, degree: 0, middle: 0, outearn: 0, live65: 0 };
    for (let i = 0; i < n; i++) { const L = simulate('odds' + i + JSON.stringify(fixed), fixed); for (const k in c) if (L.goals[k]) c[k]++; }
    for (const k in c) c[k] /= n;
    return c;
  }

  root.LL = { newLife, advance, simulate, odds, describeBirth, dollars, ord, RACES, pCollege, pJail, pOutEarn, le40, AGES, destinyPct, hash };
})(typeof window !== 'undefined' ? window : globalThis);
