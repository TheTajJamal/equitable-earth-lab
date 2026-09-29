// Life Lottery engine v4. Seeded and replayable.
// Goals run one at a time on a 0-10 bar. End a goal at 6 or more to hit it; the bar carries into the next goal.
// Each round one roll uses the published odds for kids born where you were; every other event moves the bar by 1.
(function (root) {
  const D = () => root.US_DATA;

  // ---------- math ----------
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
  const pc = x => Math.round(x * 100) + '%';
  function ord(n) { n = Math.round(n); const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

  // ---------- sources ----------
  const SRC = {
    race: ['Chetty, Hendren, Jones & Porter (2020)', 'https://opportunityinsights.org/paper/race/'],
    oidata: ['Opportunity Insights data', 'https://opportunityinsights.org/data/'],
    fading: ['Chetty et al. (2017), The Fading American Dream', 'https://opportunityinsights.org/paper/the-fading-american-dream/'],
    life: ['Chetty et al. (2016), Income and Life Expectancy', 'https://opportunityinsights.org/paper/the-association-between-income-and-life-expectancy-in-the-united-states-2001-2014/'],
    pell: ['Pell Institute, Indicators 2024', 'https://www.pellinstitute.org/wp-content/uploads/2024/05/05.01.24ExecutiveSummary-MCNBHHMC-Indicators-2024.pdf'],
    nces: ['NCES, Condition of Education', 'https://nces.ed.gov/programs/coe/indicator/cfa/enrollment-of-young-children'],
    lpi: ['Learning Policy Institute', 'https://learningpolicyinstitute.org/press-release/where-have-all-teachers-gone'],
    kornrich: ['Kornrich (2016), AERA Open', 'https://journals.sagepub.com/doi/10.1177/2332858416644180'],
    kidevict: ['NLIHC on Eviction Lab research', 'https://nlihc.org/resource/children-face-highest-risk-eviction'],
    evict: ['Eviction Lab', 'https://evictionlab.org/national-estimates/'],
    shed: ['Federal Reserve, SHED 2025', 'https://www.federalreserve.gov/publications/2026-economic-well-being-of-us-households-in-2025-savings-investments.htm'],
    kff: ['KFF Health Care Debt Survey', 'https://www.kff.org/health-costs/kff-health-care-debt-survey/'],
    cdc: ['CDC, Preventing Chronic Disease (2026)', 'https://www.cdc.gov/pcd/issues/2026/25_0288.htm'],
    shift: ['The Shift Project', 'https://shift.hks.harvard.edu/files/2019/10/Its-About-Time-How-Work-Schedule-Instability-Matters-for-Workers-Families-and-Racial-Inequality.pdf'],
    care: ['US Department of Labor, childcare prices', 'https://www.dol.gov/newsroom/releases/wb/wb20241119'],
    edpays: ['BLS, Education pays 2025', 'https://www.bls.gov/careeroutlook/2026/data-on-display/education-pays.htm'],
    union: ['BLS, Union Members 2025', 'https://www.bls.gov/news.release/union2.nr0.htm'],
    benefits: ['BLS, Employee Benefits 2026', 'https://www.bls.gov/news.release/ebs2.htm'],
    truck: ['BLS Occupational Outlook', 'https://www.bls.gov/ooh/transportation-and-material-moving/heavy-and-tractor-trailer-truck-drivers.htm'],
    nahb: ['NAHB, Q3 2025', 'https://www.nahb.org/blog/2025/12/homeownership-rate-inches-up'],
    ppi: ['Prison Policy Initiative', 'https://www.prisonpolicy.org/reports/outofwork.html'],
    census: ['US Census Bureau, Income in the US 2025', 'https://www.census.gov/library/publications/2026/demo/p60-289.html'],
    birthage: ['NCFMR, Mean Age of Mother at First Birth, 2023', 'https://www.bgsu.edu/ncfmr/resources/data/family-profiles/FP-25-29.html'],
  };

  // ---------- data lookups ----------
  const RACES = { white: 'White', black: 'Black', hisp: 'Hispanic', asian: 'Asian', aian: 'American Indian' };
  const RACE_KIDS = { white: 'white', black: 'Black', hisp: 'Hispanic', asian: 'Asian American', aian: 'American Indian' };
  const bw = r => r === 'white' || r === 'black';
  const gw = g => g === 'm' ? 'male' : 'female';
  const kidword = (L) => `${RACE_KIDS[L.race]} ${L.gender === 'f' ? 'girls' : 'boys'}`;
  function dollars(p) { const t = D().dollars; return interp(t.map(x => x[0]), t.map(x => x[1]), clamp(p, 1, 99)); }
  function series(name, race, g, pp) {
    const S = D()[name];
    if (bw(race)) return interp(D().pcts, S[race + '_' + gw(g)], pp) / 100;
    return (interp(D().pcts, S['black_' + gw(g)], pp) + interp(D().pcts, S['white_' + gw(g)], pp)) / 200;
  }
  const pHS = (race, g, pp) => 1 - series('nohs', race, g, pp);
  function pCollege(race, g, pp) { if (bw(race)) return series('college', race, g, pp); const P = D().pell; return interp(P.q, P.enroll, pp); }
  function pFinish(pp) { const P = D().pell; return clamp(interp(P.q, P.ba24, pp) / interp(P.q, P.enroll, pp), .05, .95); }
  const pJail = (race, g, pp) => bw(race) ? series('jail', race, g, pp) : null;
  const pOutEarn = pp => interp(D().absPcts, D().abs['1980'].byPct, pp);
  const mobRow = (L) => D().groups[L.race + '_' + L.gender].mob[L.pq];
  const pMiddle = (L) => { const r = mobRow(L); return 1 - r[0] - r[1]; };
  function expPct(L) { // expected adult income rank for kids born here
    const k = D().kfr, key = bw(L.race) ? L.race + '_' + gw(L.gender) : L.race + '_pooled';
    return interp(D().pcts, k[key], L.parentPct);
  }
  const pBenefits = pct => { const B = D().benefits; return interp(B.pct, B.access, pct); };
  const le40 = (g, pct) => D().le[g.toUpperCase()][clamp(Math.round(pct), 1, 100) - 1];
  function pMarried(race, pp) { return bw(race) ? interp(D().pcts, D().married[race], pp) / 100 : .45; }

  // Gompertz survival from 40, calibrated to life expectancy at 40
  const GB = 0.085;
  const surv = (A, age) => Math.exp(-(A / GB) * (Math.exp(GB * (age - 40)) - 1));
  function meanDeath(A) { let s = 40; for (let a = 40; a < 120; a += .5) s += .5 * surv(A, a + .25); return s; }
  function gompA(target) { let lo = 1e-5, hi = .05; for (let i = 0; i < 36; i++) { const A = (lo + hi) / 2; meanDeath(A) > target ? lo = A : hi = A; } return (lo + hi) / 2; }
  const invSurv = (A, S) => 40 + Math.log(1 - (GB / A) * Math.log(S)) / GB;
  const p65 = (g, pct) => surv(gompA(le40(g, pct)), 65);

  // ---------- birth ----------
  function drawBirth(seed, fixed) {
    const R = k => hash(seed + '|birth|' + k), G = D().groups;
    let race = fixed.race, gender = fixed.gender;
    if (!race) {
      let u = R('race') * Object.values(G).reduce((s, x) => s + x.count, 0);
      for (const k in G) { u -= G[k].count; if (u <= 0) { race = k.split('_')[0]; gender = gender || k.split('_')[1]; break; } }
    }
    if (!gender) gender = R('gender') < .5 ? 'f' : 'm';
    let pp = fixed.parentPct;
    if (!pp) { const pq = G[race + '_' + gender].parQ; let u = R('pq'), q = 0; for (; q < 4; q++) { u -= pq[q]; if (u <= 0) break; } pp = q * 20 + 1 + Math.floor(R('pp') * 20); }
    return { race, gender, parentPct: clamp(Math.round(pp), 1, 100) };
  }
  const bandOf = p => p <= 40 ? 0 : p <= 80 ? 1 : 2;

  // ---------- turn schedule ----------
  const TURNS = [
    { age: 0, k: 'birth' }, { age: 5, k: 'child5' }, { age: 11, k: 'child11' }, { age: 17, k: 'teen' }, { age: 18, k: 'launch' },
    { age: 20, k: 'round' }, { age: 22, k: 'round' }, { age: 24, k: 'round' }, { age: 26, k: 'round' }, { age: 28, k: 'round' },
    { age: 30, k: 'round' }, { age: 32, k: 'round' }, { age: 35, k: 'mid35' }, { age: 35, k: 'earn35' },
    { age: 45, k: 'health' }, { age: 60, k: 'later' }, { age: 99, k: 'final' },
  ];

  // ---------- goals ----------
  const GOALS = ['hs', 'path', 'middle', 'outearn', 'live65'];
  function goalTitle(L, key) {
    if (key === 'hs') return 'FINISH HIGH SCHOOL';
    if (key === 'path') return L.path === 'school' ? 'FINISH YOUR DEGREE BY 24' : 'A STEADY JOB WITH BENEFITS BY 24';
    if (key === 'middle') return 'GET OUT OF THE BOTTOM 40% BY 35';
    if (key === 'outearn') return 'OUT-EARN YOUR PARENTS';
    return 'LIVE TO 65';
  }
  function goalBase(L, key) {
    if (key === 'hs') return pHS(L.race, L.gender, L.parentPct);
    if (key === 'path') return L.path === 'school' ? pFinish(L.parentPct) : pBenefits(expPct(L));
    if (key === 'middle') return pMiddle(L);
    if (key === 'outearn') return pOutEarn(L.parentPct);
    return p65(L.gender, L.pct);
  }
  const LINE = 6;
  // Where kids like you usually land on the bar: chosen so that P(bar >= 6) matches the published rate.
  let TGT_MID = 5.4, TGT_SD = 1.2, ROLL_SD = 1.2;
  const target = p => TGT_MID + TGT_SD * PhiInv(clamp(p, .02, .98));
  function startGoal(L, key) {
    const base = goalBase(L, key);
    L.goal = { key, title: goalTitle(L, key), base: Math.round(base * 100), p: base, idx: GOALS.indexOf(key) + 1, startBar: L.bar };
  }
  function resolveGoal(L) {
    const g = L.goal, hit = L.bar >= LINE;
    L.results[g.key] = hit; L.lastResolved = { key: g.key, hit, title: g.title, bar: L.bar, idx: g.idx };
    return hit;
  }
  function nextGoal(L, key, say) {
    startGoal(L, key);
    say(`Next goal: ${L.goal.title.toLowerCase().replace(/^./, c => c.toUpperCase())}. You start at ${L.bar}/10 and need ${LINE} to hit it.`, 'q');
  }
  function move(L, d, why) { if (!d) return; const b = L.bar; L.bar = clamp(L.bar + Math.sign(d), 0, 10); L.moves.push({ d: Math.sign(d), why }); }
  // One roll per round uses the published odds for kids born where you were.
  function dataRoll(L, cards, n) {
    if (!L.goal) return;
    n = n || 1; let ups = 0;
    for (let i = 0; i < n; i++) {
      const pUp = Phi((target(L.goal.p) - L.bar) / ROLL_SD);
      const up = Phi(-.4 * L.z + Math.sqrt(.84) * PhiInv(hash(L.seed + '|roll|' + L.turn + '|' + i))) < pUp;
      move(L, up ? 1 : -1, 'odds'); if (up) ups++;
    }
    L.roll = { ups, n, p: L.goal.p };
    cards.push({ text: `This round's roll used the real odds for ${kidword(L)} born where you were: ${pc(L.goal.p)} reach "${L.goal.title.toLowerCase()}." ${n === 1 ? (ups ? 'It went your way: +1.' : 'It went against you: -1.') : `${ups} of ${n} went your way.`}`, src: [L.goal.key === 'live65' ? 'life' : L.goal.key === 'outearn' ? 'fading' : L.goal.key === 'path' ? (L.path === 'school' ? 'pell' : 'benefits') : 'race'] });
  }

  // ---------- events ----------
  // Setbacks: [id, chance by band (low, mid, high), points, heart]
  const SETBACKS = [
    ['bill', [.35, .20, .08], -2, 0], ['meddebt', [.15, .08, .03], -3, 0], ['hours', [.15, .08, .04], -3, 0],
    ['evict', [.08, .02, .005], -5, -1], ['doctor', [.08, .05, .03], -4, -1], ['parentsick', [.10, .07, .05], -2, -1], ['familymoney', [.20, .08, .02], -1, 0],
  ];
  const GOODS = [['raise', [.10, .15, .20], 2], ['familyhelp', [.02, .10, .25], 2], ['friend', [.30, .30, .30], 0]];
  // Setback and good-news lines, by income band: [low, middle, high]
  const SET_TEXT = {
    bill: [['The car needs a $1,200 repair. You put it on a card at 24%.', 'The fridge dies in July. $900 you do not have.'], ['The transmission goes. $3,000 on the credit card.', 'The water heater bursts. The deductible stings.'], ['The roof needs replacing. It eats the vacation fund.']],
    meddebt: [['A trip to the ER turns into a $3,800 bill. It goes to collections.'], ['An ambulance ride you did not ask for costs $1,900. You set up a payment plan.'], ['Out-of-network surgery leaves you with a $6,000 bill and a month of phone calls.']],
    hours: [['Your hours are cut with a week of notice.', 'The warehouse switches you to on-call shifts. Some weeks there is no call.'], ['You are laid off. It takes three months to find the next job.'], ['Your company restructures and your team is cut. The severance runs out before the next offer comes.']],
    evict: [['You fall behind on rent and are evicted. The filing follows you to every application.'], ['Your landlord sells the building. You have 30 days to find a place you can afford.'], ['Your landlord sells the building and you scramble to find a new place.']],
    doctor: [['The doctor says it is diabetes. The insulin costs more than your car payment.'], ['Your blood pressure is dangerously high. The doctor asks about stress.'], ['A biopsy comes back abnormal. Months of appointments follow.']],
    parentsick: [['Your mom\'s cancer is back. You drive her to chemo on your days off.'], ['Your dad has a stroke. You and your siblings take turns at the hospital.'], ['Your mom needs full-time care. You fly back and forth for a year.']],
    familymoney: [['Your brother cannot make rent. You send $600.', 'Your cousin needs bail money. You help.'], ['Your sister loses her job. You cover her car payment for a few months.'], ['Your brother\'s business fails. You lend him money you won\'t see again.']],
    raise: [['Your manager puts in a word. You get a $1.50 raise.'], ['You switch jobs for 12% more.'], ['You get promoted and a bonus.']],
    familyhelp: [['Your aunt lets you stay with her while you get back on your feet.'], ['Your parents help with a deposit on a better apartment.'], ['Your parents cover a surprise bill before it can hurt.']],
    friend: [['A coworker becomes your closest friend.', 'You find a church, a gym, a crew. People who show up for you.'], ['A coworker becomes your closest friend.', 'Your family gets together for a birthday and nobody fights.'], ['Old college friends start a group chat that actually lasts.', 'Your family gets together for a birthday and nobody fights.']],
  };
  const SET_CARD = {
    bill: ['38% of adults earning under $25k could cover a $400 emergency with cash. Over $100k, 85% could.', 'shed'],
    meddebt: ['57% of adults earning under $40k carry health care debt, compared with 26% of those earning $90k or more.', 'kff'],
    hours: ['Two-thirds of hourly service workers get less than two weeks\' notice of their schedule, and 14% had a shift cancelled in the past month.', 'shift'],
    evict: ['About 1 in 40 renter households is evicted each year. The filing shows up on tenant screening reports for years.', 'evict'],
    doctor: ['From 2021 to 2024, 13.4% of urban adults below the poverty line had diagnosed diabetes, compared with 8.9% above it.', 'cdc'],
    parentsick: ['Illness hits harder at lower incomes: 57% of adults under $40k carry health care debt.', 'kff'],
    familymoney: ['38% of adults earning under $25k could cover a $400 emergency with cash, so family often covers family.', 'shed'],
    raise: null, familyhelp: ['Kids from the richest fifth of families are about five times as likely to reach the top fifth as kids from the poorest fifth.', 'race'], friend: null,
  };

  // "If I can just..." dreams: odds, points if reached, data card
  const DREAMS = {
    ged: { dream: 'If I can just get my GED while I am inside, I will have something to show when I get out.', win: 'Earned a GED', p: .55, pts: 2, card: ['Formerly incarcerated people were unemployed at over 27% in 2008, compared with 5.8% of everyone.', 'ppi'] },
    cert: { dream: 'If I can just finish this certificate program inside, the job search will be shorter.', win: 'Finished a certificate in prison', p: .55, pts: 2, card: ['Formerly incarcerated people were unemployed at over 27% in 2008, compared with 5.8% of everyone.', 'ppi'] },
    orgo: { dream: 'If I can just pass this one class that everyone fails, I can stay in my major.', win: 'Passed the class everyone fails', p: .55, pts: 3, card: ['Only 16% of young people from the poorest quarter of families finish a bachelor\'s by 24, compared with 58% from the richest.', 'pell'] },
    forklift: { dream: 'If I can just get my forklift certification, I can get off the night shift.', win: 'Got forklift certified', p: .6, pts: 2, card: ['Warehouse and retail workers often get less than two weeks\' notice of their schedules.', 'shift'] },
    cdl: { dream: 'If I can just get my CDL, trucking pays $20,000 more a year.', win: 'Got a commercial driver\'s license', p: .45, pts: 4, card: ['Truck drivers\' median pay was $58,640 in May 2025.', 'truck'] },
    permanent: { dream: 'If I can just get hired on permanent instead of temp, I get health insurance.', win: 'Hired on permanent, with benefits', p: .5, pts: 3, card: ['39% of the lowest-paid quarter of private workers can get an employer health plan, compared with 94% of the top quarter.', 'benefits'] },
    cushion: { dream: 'If I can just save $1,000, one bad month will not sink me.', win: 'Saved a $1,000 cushion', p: .45, pts: 1, card: ['38% of adults earning under $25k could cover a $400 emergency with cash, compared with 85% of those over $100k.', 'shed'] },
    apartment: { dream: 'If I can just get a place of my own, I can finally breathe.', win: 'Moved into my own apartment', p: .5, pts: 1, card: ['About 1 in 40 renter households is evicted each year.', 'evict'] },
    apprentice: { dream: 'If I can just get into the union apprenticeship, I will have a trade for life.', win: 'Got into a union apprenticeship', p: .4, pts: 4, card: ['Union members earned a median $1,404 a week in 2025, compared with $1,174 for nonunion workers.', 'union'] },
    associate: { dream: 'If I can just finish my associate degree at night, doors open.', win: 'Finished an associate degree', p: .45, pts: 3, card: ['Median weekly pay is $1,135 with an associate degree, compared with $966 with high school.', 'edpays'] },
    lead: { dream: 'If I can just get the shift lead job, the raise covers daycare.', win: 'Promoted to shift lead', p: .5, pts: 3, card: ['Full-day child care for one child cost $6,552 to $15,600 a year in 2022.', 'care'] },
    debt: { dream: 'If I can just pay off this credit card, I can start saving.', win: 'Paid off the credit card', p: .55, pts: 1, card: ['38% of adults earning under $25k could cover a $400 emergency with cash.', 'shed'] },
    newjob: { dream: 'If I can just land a job that pays more, everything gets easier.', win: 'Landed a better-paying job', p: .45, pts: 4, card: null },
    house: { dream: 'If I can just save a down payment, we can buy a house.', win: 'Bought a first home', p: .5, pts: 2, card: ['37.5% of householders under 35 own their home.', 'nahb'] },
    director: { dream: 'If I can just get the director role, I will be the one making decisions.', win: 'Promoted to director', p: .4, pts: 3, card: null },
  };
  function dreamFor(L) {
    if (!isRound(L)) return null;
    const done = id => L.wins.some(w => w.id === id);
    let list;
    if (L.scene === 'jail') list = [L.edu === 'nohs' ? 'ged' : 'cert'];
    else if (L.edu === 'college') list = ['orgo'];
    else if (L.pct < 35) list = ['forklift', 'cushion', 'permanent', 'apartment', 'cdl', 'newjob'];
    else if (L.pct < 70) list = ['lead', 'debt', 'apprentice', 'associate', 'newjob', 'house'];
    else list = ['house', 'director', 'newjob'];
    const open = list.filter(id => !done(id));
    if (!open.length) return null;
    const id = open.includes(L.lastDream) ? L.lastDream : open[Math.floor(hash(L.seed + '|dream|' + L.turn) * open.length)];
    const tries = L.dreamTries[id] || 0;
    return { id, ...DREAMS[id], tries, odds: Math.min(.85, DREAMS[id].p + .15 * tries) };
  }
  const isRound = L => { const t = TURNS[L.turn]; return t && (t.k === 'round' || t.k === 'launch') && L.age < 34; };

  const KIDM = [
    [1, 1, ['Your {kid} says a first word. It is "no."']],
    [2, 3, ['Your {kid} learns to climb out of the crib. Nobody sleeps.', 'Your {kid} learns to say "I love you" and uses it to get snacks.']],
    [4, 5, ['First day of pre-K. You watch your {kid} through the window.', 'Your {kid} can write {his} name, backwards.']],
    [6, 7, ['Your {kid} reads a whole book to you at bedtime.', 'Your {kid} learns to ride a bike in the parking lot. You run alongside the whole way.']],
    [8, 9, ['Your {kid} brings home a perfect spelling test. It goes on the fridge.']],
    [10, 12, ['You make it to most of your {kid}\'s games this season.', 'Your {kid}\'s teacher calls to say how kind {he} is to the other kids.']],
    [13, 16, ['Your {kid} says {he} wants to be a nurse. You believe {him}.', 'Your {kid} makes the honor roll.']],
  ];

  // ---------- life ----------
  function newLife(seed, fixed) {
    fixed = fixed || {};
    const b = drawBirth(seed, fixed);
    const R = k => hash(seed + '|' + k);
    const L = {
      seed, ...b, pq: Math.min(4, Math.floor((b.parentPct - 1) / 20)), z: PhiInv(R('fortune')),
      turn: 0, age: 0, pct: b.parentPct, bar: 5,
      edu: 'school', path: null, scene: 'home', wins: [], partner: false, strain: 0, kids: [], results: {},
      dreamTries: {}, lastDream: null, cushion: false, debtFree: false, house: false, jailed: false, jailAge: null,
      history: [], moves: [], done: false, pending: null, lastResolved: null, roll: null,
      tones: { skin: Math.floor(R('skin') * 2), hair: Math.floor(R('hair') * 3) }, within: R('within'),
    };
    startGoal(L, 'hs');
    L.bar = clamp(Math.round(target(L.goal.p)), 1, 9);
    L.goal.startBar = L.bar;
    L.history.push({ age: 0, bar: L.bar, idx: 1 });
    return L;
  }

  function describeBirth(L) {
    const HOME = ['a two-room apartment above a laundromat', 'a rented duplex near the highway', 'a three-bedroom house with a small yard', 'a house in a suburb with good schools', 'a big house with a two-car garage'];
    return `You're born ${L.gender === 'f' ? 'a girl' : 'a boy'}. Your parents earn about $${Math.round(dollars(L.parentPct) / 1000)}k a year, the ${ord(L.parentPct)} percentile. You live in ${HOME[L.pq]}.`;
  }
  function birthCard(L) {
    const G = D().groups, pq1 = (G[L.race + '_f'].parQ[0] + G[L.race + '_m'].parQ[0]) / 2, w1 = (G.white_f.parQ[0] + G.white_m.parQ[0]) / 2, r = mobRow(L);
    const who = L.race === 'white' ? `${pc(pq1)} of white children are born into the bottom fifth of family income.` : `${pc(pq1)} of ${RACE_KIDS[L.race]} children are born into the bottom fifth of family income, compared with ${pc(w1)} of white children.`;
    return { text: `Your family is ${RACES[L.race]}. ${who} Of ${kidword(L)} born where you were, ${pc(r[0])} stay in the bottom fifth as adults and ${pc(r[4])} reach the top fifth. Your bar starts at ${L.bar}/10, set by the high school odds for kids like you (${pc(L.goal.p)}).`, src: ['race'] };
  }

  // The choice made for the round just lived
  function applyChoice(L, focus, say, cards, a) {
    if (!focus || focus === 'steady') return;
    const R = k => hash(L.seed + '|' + L.turn + '|ch|' + k);
    const lowKids = L.kids.length && L.pct < 40;
    if (focus === 'study') {
      if (R('study') < .5) { move(L, 1, 'Studied'); say(L.edu === 'college' ? 'You make the dean\'s list one semester. It feels like proof. +1' : 'Night classes, two nights a week. Your supervisor notices. +1', 'good'); }
      else say(L.edu === 'college' ? 'You study hard. The grades hold steady.' : 'Night classes, two nights a week. Nothing to show for it yet.');
    }
    if (focus === 'hustle') {
      move(L, 1, 'Extra shifts'); say('Doubles, weekends, holidays. The money helps. +1', 'good');
      if (lowKids) {
        const k = L.kids[0], kidName = k.sex === 'f' ? 'daughter' : 'son';
        if (L.partner && R('strain') < .5) {
          L.strain++;
          if (L.strain >= 2) { L.partner = false; L.strain = 0; L.partnerLeft = true; move(L, -1, 'Partner moved out'); say('Your partner moves out. You split the rent, then you don\'t. -1', 'bad'); }
          else { move(L, -1, 'Strain'); say('You and your partner only see each other at shift change. You argue about money. -1', 'bad'); }
        } else if (a - k.born >= 3) { move(L, -1, 'Missed kid'); say(`You miss your ${kidName}'s school play. ${k.sex === 'f' ? 'She' : 'He'} doesn't mention it, which is worse. -1`, 'bad'); }
        else { move(L, -1, 'Missed kid'); say(`You miss your ${kidName}'s first steps. Your mom sends a video. -1`, 'bad'); }
        cards.push({ text: 'Two-thirds of hourly service workers get less than two weeks\' notice of their schedules. Children of parents with unstable schedules show more anxiety and acting out.', src: ['shift'] });
      } else if (R('burn') < (L.kids.length ? .5 : .3)) { move(L, -1, 'Burnout'); say(L.kids.length ? 'You miss bedtime most nights and it wears on everyone. -1' : 'You get sick from running on no sleep. -1', 'bad'); }
    }
    if (focus === 'rest') { L.strain = 0; say(L.kids.length ? 'You take the kids to the park, call your mom back, sleep. Setbacks are less likely this round.' : 'You rest, see friends, sleep. Setbacks are less likely this round.'); }
  }

  function resolveDream(L, q, say, cards, a) {
    if (!q) return;
    L.lastDream = q.id;
    if (hash(L.seed + '|dr|' + q.id + '|' + q.tries) < q.odds) {
      L.wins.push({ id: q.id, age: a, text: q.win });
      move(L, 1, q.win);
      if (q.id === 'cushion') L.cushion = true;
      if (q.id === 'debt') L.debtFree = true;
      if (q.id === 'house') L.house = true;
      if (q.id === 'cert' || q.id === 'ged') L.edu = L.edu === 'nohs' ? 'hs' : L.edu;
      L.bump = Math.min(5, (L.bump || 0) + 1.5);
      say(`${q.win}. ${q.tries ? 'It took ' + (q.tries + 1) + ' tries. ' : ''}You did it. +1`, 'good');
      if (q.card) cards.push({ text: q.card[0], src: [q.card[1]] });
    } else {
      L.dreamTries[q.id] = q.tries + 1;
      say(pick(hash(L.seed + '|df|' + a), ['Not this time. You are closer than you were.', 'You come up short, but now you know what it takes.', 'It does not work out yet. You will try again.']));
    }
  }

  function chanceEvents(L, say, cards, focus) {
    const R = k => hash(L.seed + '|' + L.turn + '|ev|' + k);
    const band = bandOf(L.pct), restMul = focus === 'rest' ? .5 : 1;
    let fired = false;
    for (const [id, p] of SETBACKS) {
      if (fired) break;
      if (id === 'evict' && L.house) continue;
      if (R(id) < p[band] * restMul) {
        fired = true;
        if (id === 'bill' && (L.cushion || L.debtFree)) { say('A surprise bill arrives. Your cushion covers it. No debt, no change.', 'good'); continue; }
        say(pick(R(id + 't'), SET_TEXT[id][band]) + ' -1', 'bad'); move(L, -1, id);
        if (id === 'doctor') L.sick = true;
        if (SET_CARD[id]) cards.push({ text: SET_CARD[id][0], src: [SET_CARD[id][1]] });
      }
    }
    let good = false;
    for (const [id, p] of GOODS) {
      if (good) break;
      if (R('g' + id) < p[band]) {
        good = true; say(pick(R(id + 't'), SET_TEXT[id][band]) + ' +1', 'good'); move(L, 1, id);
        if (SET_CARD[id] && !cards.length) cards.push({ text: SET_CARD[id][0], src: [SET_CARD[id][1]] });
      }
    }
    if (L.sick && !fired && R('clear') < .5) { L.sick = false; move(L, 1, 'Good news'); say('Good news from the doctor: the numbers are down. +1', 'good'); }
  }

  // First births follow education: mean age 21.4 without a diploma, 30.3 with a bachelor's (NCFMR 2023).
  function firstBirthAge(L) {
    let c = L.edu === 'nohs' ? 21 : L.edu === 'degree' || L.edu === 'college' ? 30 : L.edu === 'somecollege' ? 26 : 24;
    if (L.pct > 70) c += 1;
    return c;
  }
  function family(L, say, cards, a) {
    const R = k => hash(L.seed + '|' + L.turn + '|fam|' + k);
    if (!L.partner && !L.partnerLeft && a >= 22 && a <= 32 && R('partner') < 1 - Math.pow(1 - Math.min(.9, pMarried(L.race, L.parentPct) + .2), 1 / 5)) {
      L.partner = true; move(L, 1, 'Partner'); L.wins.push({ id: 'partner', age: a, text: 'Found a partner' });
      say(pick(R('pw'), ['You meet someone at a friend\'s cookout. A year later you move in together. +1', 'You fall in love. For the first time in a while, you are not doing this alone. +1', 'You get married in your aunt\'s backyard. Everyone dances. +1']), 'good');
      const m = bw(L.race) ? `By their early 30s, ${pc(interp(D().pcts, D().married[L.race], 1) / 100)} of ${RACE_KIDS[L.race]} adults from the poorest families are married, compared with ${pc(interp(D().pcts, D().married[L.race], 100) / 100)} from the richest.` : 'Marriage rates rise steadily with parents\' income.';
      cards.push({ text: m, src: ['race'] });
    }
    const center = firstBirthAge(L), dist = Math.abs(a - center);
    const pFirst = dist <= 1 ? .45 : dist <= 3 ? .2 : .05;
    const wantKid = !L.kids.length ? R('kid') < pFirst : L.kids.length < 2 && a - L.kids[L.kids.length - 1].born >= 2 && R('kid') < .25;
    if (a >= 18 && a <= 32 && L.scene !== 'jail' && wantKid) {
      const sex = R('sex') < .5 ? 'f' : 'm';
      L.kids.push({ born: a, sex }); move(L, 1, 'Child');
      L.wins.push({ id: 'kid' + L.kids.length, age: a, text: L.kids.length === 1 ? 'First child born' : 'Second child born' });
      say(`Your ${sex === 'f' ? 'daughter' : 'son'} is born. You hold ${sex === 'f' ? 'her' : 'him'} and everything feels possible. +1`, 'good');
      cards.push({ text: 'In 2023, women without a high school diploma had their first child at 21.4 on average. Women with a bachelor\'s degree waited until 30.3.', src: ['birthage'] });
      cards.push({ text: 'Full-day child care for one child cost $6,552 to $15,600 a year in 2022, which is 9% to 16% of a median family\'s income.', src: ['care'] });
      return;
    }
    if (L.kids.length && R('milestone') < .6) {
      const k = L.kids[Math.floor(R('which') * L.kids.length)], ka = a - k.born;
      const row = KIDM.find(([lo, hi]) => ka >= lo && ka <= hi);
      const f = k.sex === 'f', P = { kid: f ? 'daughter' : 'son', he: f ? 'she' : 'he', his: f ? 'her' : 'his', him: f ? 'her' : 'him' };
      if (row) say(pick(R('mt'), row[2]).replace(/\{(\w+)\}/g, (_, t) => P[t]), 'good');
    }
  }

  function incomeNow(L, a) {
    const w = clamp((a - 18) / 14, 0, 1);
    let p = L.parentPct * (1 - w) * .4 + expPct(L) * (1 - (1 - w) * .4) + (L.goal && L.goal.key === 'middle' ? (L.bar - 5) * 3 : 0) + (L.bump || 0) + (hash(L.seed + '|n|' + a) - .5) * 8;
    if (L.edu === 'college') p = Math.min(p, 25);
    if (L.scene === 'jail') p = 1;
    return clamp(p, 1, 99);
  }

  // Advance one turn. focus = choice for the round just lived; answer = choice at a branch.
  function advance(L, focus, answer) {
    const lines = [], cards = [];
    const say = (text, tone = 'neutral') => lines.push({ text, tone });
    const dream = focus === 'dream' ? dreamFor(L) : null;
    L.moves = []; L.lastResolved = null; L.roll = null;
    L.turn++;
    const T = TURNS[L.turn]; L.age = T.age; const a = T.age;
    const R = k => hash(L.seed + '|' + L.turn + '|' + k);
    const pp = L.parentPct, band = bandOf(pp);
    applyChoice(L, focus === 'dream' ? null : focus, say, cards, a);
    resolveDream(L, dream, say, cards, a);

    if (T.k === 'child5') {
      L.scene = 'home';
      say(['Both parents work shifts. You spend most days with a neighbor. There\'s no preschool.', 'You go to public pre-K half days.', 'You go to a private preschool. Someone reads to you every night.'][band]);
      if (R('evict') < [.2, .04, .005][band]) {
        move(L, -1, 'Evicted'); say('Your family is evicted. You change schools in the middle of the year. -1', 'bad');
        cards.push({ text: 'Children are more than 40% of the people evicted in the US. About 1.5 million kids are evicted each year.', src: ['kidevict'] });
      }
      cards.push({ text: 'Only 32% of 3- and 4-year-olds whose parents didn\'t finish high school are in school. When a parent has a bachelor\'s degree, it\'s 57%.', src: ['nces'] });
      dataRoll(L, cards);
    } else if (T.k === 'child11') {
      L.scene = 'school';
      say(['Three of your teachers leave in the middle of the year. There are no after-school programs, so you watch your little brother.', 'School is fine. Summers are TV and a week of day camp.', 'Tutors, travel soccer and summer camp fill your calendar.'][band]);
      if (R('pjob') < [.25, .12, .05][band]) { move(L, -1, 'Parent lost job'); say('A parent loses their job. Things get tight at home. -1', 'bad'); }
      cards.push({ text: 'Teacher turnover is 50% higher in high-poverty (Title I) schools. The richest 10% of families spend about $9,000 a year on care and enrichment for each young child; spending by the poorest fifth has barely changed since the 1970s.', src: ['lpi', 'kornrich'] });
      dataRoll(L, cards);
    } else if (T.k === 'teen') {
      L.scene = 'school';
      say(['You work 20 hours a week after school to help with rent.', 'You have a part-time job and take the SAT once.', 'You take an SAT prep course and tour colleges with your parents.'][band]);
      dataRoll(L, cards);
      const hit = resolveGoal(L);
      L.edu = hit ? 'hs' : 'nohs';
      say(hit ? `You graduate from high school. Goal 1 hit at ${L.bar}/10.` : `You leave school to work full-time. Goal 1 missed at ${L.bar}/10. You can still get a GED later.`, hit ? 'good' : 'bad');
      const lo = pHS(L.race, L.gender, 1), hi = pHS(L.race, L.gender, 100);
      cards.unshift({ text: `Among ${kidword(L)} from the poorest families, ${pc(1 - lo)} don't finish high school. From the richest families, ${pc(1 - hi)} don't.${bw(L.race) ? '' : ' (Estimated from the Black and white figures, which are the only ones published.)'}`, src: ['oidata'] });
      L.goal = null;
      L.pending = { key: 'path', q: `What's next? Your bar carries into goal 2 at ${L.bar}/10.`, options: [['school', 'GO TO SCHOOL', 'Goal 2 becomes: finish your degree by 24.'], ['work', 'START WORKING', 'Goal 2 becomes: a steady job with benefits by 24.']] };
    } else if (T.k === 'launch') {
      if (answer === 'school') {
        const p = pCollege(L.race, L.gender, pp) * (L.edu === 'nohs' ? .4 : 1);
        const u = Phi(-.5 * L.z + Math.sqrt(.75) * PhiInv(R('admit')));
        if (u < p) {
          L.path = 'school'; L.edu = 'college'; L.scene = 'campus';
          say(['You get in. Grants cover part of it and loans cover the rest. You\'re the first in your family to go.', 'You enroll at the state university and borrow for most of it.', 'You start at a selective university. Your parents cover tuition.'][band], 'good');
        } else {
          L.path = 'work'; L.scene = 'work'; move(L, -1, 'Not admitted');
          say(band === 2 ? 'You don\'t get into the schools you applied to. You take a gap year that turns into a job. -1' : pick(R('noadmit'), ['You get in, but the aid package leaves a $9,000 gap. You start working full-time instead. -1', 'Nobody at home or at school knew the deadlines. Your application is late. You start working. -1', 'You\'re admitted, but you can\'t afford to move three hours away. You take a warehouse job. -1']), 'bad');
        }
        cards.push({ text: `Among ${kidword(L)} from the poorest families, ${pc(pCollege(L.race, L.gender, 1))} start college. From the richest, ${pc(pCollege(L.race, L.gender, 100))} do.`, src: [bw(L.race) ? 'race' : 'pell'] });
      } else {
        L.path = 'work'; L.scene = 'work';
        say(band === 0 ? 'You take a full-time job at a warehouse.' : band === 1 ? 'You start full-time at a store and work toward assistant manager.' : 'You join your uncle\'s contracting business.');
        cards.push({ text: 'Workers with a high school diploma earn a median $966 a week. Without one, it\'s $770.', src: ['edpays'] });
      }
      nextGoal(L, 'path', say);
      dataRoll(L, cards);
    } else if (T.k === 'round') {
      const pj = pJail(L.race, L.gender, pp);
      const jailAt = 22 + 2 * Math.floor(hash(L.seed + '|jailage') * 4);
      if (L.scene === 'jail' && a >= L.jailAge + 4) {
        const reentry = L.edu === 'degree' ? .7 : (L.edu === 'hs' || L.edu === 'somecollege') ? .5 : .35;
        L.scene = 'work';
        if (R('reentry') < reentry) say(`You're released. ${L.edu === 'degree' ? 'Your degree gets you in the door somewhere that looks past the record.' : 'A cousin vouches for you at a moving company.'}`, 'good');
        else { move(L, -1, 'Record'); say('You\'re released. You apply to 40 jobs. The box asking about convictions ends most of them. -1', 'bad'); }
        cards.push({ text: 'Formerly incarcerated people were unemployed at over 27% in 2008, compared with 5.8% of everyone.', src: ['ppi'] });
      } else if (pj !== null && !L.jailed && a === jailAt && Phi(.5 * L.z + Math.sqrt(.75) * PhiInv(hash(L.seed + '|jail'))) < pj) {
        L.jailed = true; L.jailAge = a; L.scene = 'jail'; move(L, -1, 'Prison');
        if (L.edu === 'college') L.edu = 'somecollege';
        say('You\'re arrested and sentenced. You spend the next four years in prison. -1', 'bad');
        cards.push({ text: `On one day in 2010, ${pc(pJail('black', 'm', 1))} of Black men from the poorest 1% of families were incarcerated, compared with ${pc(pJail('white', 'm', 1))} of white men. From the richest 1%, it was ${pc(pJail('black', 'm', 100))} and ${pc(pJail('white', 'm', 100))}.`, src: ['race'] });
      } else if (L.scene === 'jail') {
        say('Count, chow, work detail, count. The days are the same.');
      } else {
        if (L.edu === 'college' && a < 24) say(pick(R('col'), ['Classes, a campus job and too little sleep.', 'You change your major once. Your advisor says that\'s normal.']));
        chanceEvents(L, say, cards, focus);
        family(L, say, cards, a);
      }
      dataRoll(L, cards);
      if (a === 24 && L.goal && L.goal.key === 'path') {
        let hit = resolveGoal(L);
        if (L.path === 'school') {
          if (L.edu !== 'college') { hit = false; L.results.path = false; L.lastResolved.hit = false; }
          L.edu = hit ? 'degree' : 'somecollege';
          say(hit ? `You graduate with a bachelor's degree. Goal 2 hit at ${L.bar}/10.` : (band === 2 ? `You switch majors twice, lose interest and leave without finishing. Goal 2 missed at ${L.bar}/10.` : `Your work hours go up and your grades slip. You leave with loans and no degree. Goal 2 missed at ${L.bar}/10.`), hit ? 'good' : 'bad');
          cards.unshift({ text: `Only 16% of young people from the poorest quarter of families earn a bachelor's by 24, compared with 58% from the richest. Graduates earn a median $1,578 a week; people with some college but no degree earn $1,062.`, src: ['pell', 'edpays'] });
          if (L.scene !== 'jail') L.scene = 'work';
        } else {
          say(hit ? `You're hired permanent, with a health plan. Goal 2 hit at ${L.bar}/10.` : `Still temp. Still no insurance. Goal 2 missed at ${L.bar}/10.`, hit ? 'good' : 'bad');
          cards.unshift({ text: '39% of the lowest-paid quarter of private workers can get an employer health plan, compared with 94% of the top quarter.', src: ['benefits'] });
        }
        nextGoal(L, 'middle', say);
      }
      L.pct = incomeNow(L, a);
    } else if (T.k === 'mid35') {
      if (L.scene === 'jail') L.scene = 'work';
      dataRoll(L, cards);
      const hit = resolveGoal(L);
      const r = mobRow(L), qs = hit ? [2, 3, 4] : [0, 1], tot = qs.reduce((s, q) => s + r[q], 0);
      let u = hash(L.seed + '|q35') * tot, q = qs[qs.length - 1];
      for (const qq of qs) { u -= r[qq]; if (u <= 0) { q = qq; break; } }
      L.pct = clamp(q * 20 + 1 + L.within * 19, hit ? 41 : 1, hit ? 99 : 40);
      say(`At 35 your household earns about $${Math.round(dollars(L.pct) / 1000)}k a year, the ${ord(L.pct)} percentile.`);
      say(hit ? `You made it out of the bottom 40%. Goal 3 hit at ${L.bar}/10.` : `You're still in the bottom 40%. Goal 3 missed at ${L.bar}/10.`, hit ? 'good' : 'bad');
      const w = D().groups['white_' + L.gender].mob[0];
      cards.unshift({ text: `Of ${kidword(L)} born in the bottom fifth, ${pc(1 - mobRow({ ...L, pq: 0 })[0] - mobRow({ ...L, pq: 0 })[1])} reach the middle or higher. Born in the top fifth, ${pc(1 - mobRow({ ...L, pq: 4 })[0] - mobRow({ ...L, pq: 4 })[1])} do.${L.race !== 'white' ? ` For white ${L.gender === 'f' ? 'girls' : 'boys'} born in the bottom fifth, it's ${pc(1 - w[0] - w[1])}.` : ''}`, src: ['race'] });
      nextGoal(L, 'outearn', say);
      L.pending = { key: 'go', q: 'How do you compare with your parents at your age?', options: [['go', 'FIND OUT', 'Three rolls at the real odds.']] };
    } else if (T.k === 'earn35') {
      dataRoll(L, cards, 3);
      const hit = resolveGoal(L);
      say(hit ? `You earn more than your parents did at your age. Goal 4 hit at ${L.bar}/10.` : `You earn less than your parents did at your age. Goal 4 missed at ${L.bar}/10.`, hit ? 'good' : 'bad');
      cards.unshift({ text: `${pc(pOutEarn(1))} of kids from the poorest families out-earn their parents, but only ${pc(pOutEarn(99))} from the richest. Across everyone it's about half. For kids who grew up in the 1950s, it was nine in ten.`, src: ['fading'] });
      nextGoal(L, 'live65', say);
      L.pending = { key: 'go', q: 'The rest of your life plays out.', options: [['go', 'FAST-FORWARD', 'Three more stops.']] };
    } else if (T.k === 'health') {
      L.scene = 'home';
      const b = bandOf(L.pct);
      if (R('health') < [1 / 3, 1 / 5, 1 / 8][b]) { move(L, -1, 'Health'); say(['The doctor says your blood pressure and blood sugar are both too high. You\'re told to cut stress and eat better. You laugh, then you try. -1', 'A routine checkup finds high blood pressure. The pills help. -1', 'A scare at your annual physical turns out to be caught early. -1'][b], 'bad'); }
      else say('Your knees complain, but you\'re healthy.');
      cards.push({ text: 'From 2021 to 2024, 13.4% of urban adults below the poverty line had diagnosed diabetes, compared with 8.9% above it. In rural areas it was 16.1% compared with 11.7%.', src: ['cdc'] });
      dataRoll(L, cards);
      L.pending = { key: 'go', q: '', options: [['go', 'CONTINUE', null]] };
    } else if (T.k === 'later') {
      const b = bandOf(L.pct);
      if (L.kids.length) { const k = L.kids[0]; say(R('kl') < .6 ? `Your ${k.sex === 'f' ? 'daughter' : 'son'} graduates high school. You cry in the parking lot.` : `Your ${k.sex === 'f' ? 'daughter' : 'son'} moves back home after a layoff. You make room.`, 'good'); }
      say(['Your back gives out before a pension ever would have. You keep working part-time.', 'You retire at 64 with a small 401(k) and Social Security.', 'You retire at 60 and take the trip you always talked about.'][b]);
      cards.push({ text: '15% of non-retired adults earning under $25k have a retirement account, compared with 89% of those earning $100k or more.', src: ['shed'] });
      dataRoll(L, cards);
      L.pending = { key: 'go', q: '', options: [['go', 'CONTINUE', null]] };
    } else if (T.k === 'final') {
      dataRoll(L, cards);
      const hit = resolveGoal(L);
      const A = gompA(le40(L.gender, L.pct)), s65 = surv(A, 65), u = hash(L.seed + '|deathu');
      L.deathAge = Math.floor(hit ? invSurv(A, s65 * (1 - u * .999)) : invSurv(A, s65 + (1 - s65) * (1 - u * .999)));
      L.deathAge = hit ? Math.max(65, Math.min(104, L.deathAge)) : Math.max(41, Math.min(64, L.deathAge));
      L.scene = 'end';
      say(hit ? `You live to ${L.deathAge}.${L.kids.length ? ' Your grandkids know your laugh.' : ' Your friends throw you a party every year.'}` : `Your heart gives out at ${L.deathAge}, before you could retire.`, hit ? 'good' : 'bad');
      if (L.kids.length) say(`Your ${L.kids.length > 1 ? 'kids carry' : 'kid carries'} what you built into the next generation. Their start is the ${ord(L.pct)} percentile.`, 'good');
      cards.unshift({ text: 'Men in the richest 1% live 14.6 years longer than men in the poorest 1%. For women the gap is 10.1 years.', src: ['life'] });
      L.goal = null; L.done = true;
    }
    L.cards = cards;
    L.history.push({ age: a, bar: L.bar, idx: L.goal ? L.goal.idx : null });
    return lines;
  }

  // Published odds for the ending table: rows are goals, one value per group.
  function table(pp) {
    const groups = [['black', 'f'], ['black', 'm'], ['asian', 'f'], ['asian', 'm'], ['white', 'f'], ['white', 'm'], ['hisp', 'f'], ['hisp', 'm']];
    const pq = Math.min(4, Math.floor((pp - 1) / 20));
    const rows = [
      ['Finish high school', (r, g) => [pHS(r, g, pp), !bw(r)]],
      ['Start college', (r, g) => [pCollege(r, g, pp), !bw(r)]],
      ['Out of the bottom 40% by 35', (r, g) => { const m = D().groups[r + '_' + g].mob[pq]; return [1 - m[0] - m[1], false]; }],
      ['Reach the top 20%', (r, g) => [D().groups[r + '_' + g].mob[pq][4], false]],
      ['Incarcerated on one day, ages 27-32', (r, g) => bw(r) ? [pJail(r, g, pp), false] : [null, false]],
      ['Married by early 30s', (r, g) => bw(r) ? [pMarried(r, pp), false] : [null, false]],
    ];
    return { groups, rows: rows.map(([label, f]) => [label, groups.map(([r, g]) => f(r, g))]), outearn: pOutEarn(pp), finish: pFinish(pp) };
  }

  function simulate(seed, fixed, policy) {
    policy = policy || {};
    const L = newLife(seed, fixed); let i = 0;
    while (!L.done) {
      const t = TURNS[L.turn + 1];
      const ans = L.pending && L.pending.key === 'path' ? (policy.path || 'school') : 'go';
      const f = policy.list ? policy.list[i] : 'steady';
      L.pending = null; advance(L, f, ans); i++;
    }
    return L;
  }
  function odds(fixed, n) {
    const c = { hs: 0, path: 0, middle: 0, outearn: 0, live65: 0 };
    for (let i = 0; i < (n || 1200); i++) { const L = simulate('odds' + i + JSON.stringify(fixed), fixed); for (const k in c) if (L.results[k]) c[k]++; }
    for (const k in c) c[k] /= (n || 1200);
    return c;
  }

  root.LL = { tune: (m, sd, r) => { TGT_MID = m; TGT_SD = sd; ROLL_SD = r; }, newLife, advance, simulate, odds, table, describeBirth, birthCard, dreamFor, isRound, dollars, ord, RACES, SRC, TURNS, GOALS, LINE, hash, goalBase, pMiddle, pHS, pCollege, pOutEarn, p65, kidword };
})(typeof window !== 'undefined' ? window : globalThis);
