// Life Lottery: dice rules, roll lines, life events and data. (v2, 1-100 life points)
// Rules (locked after simulation against individual earnings, see README):
//   Start with life points = parents' household income percentile (1-100).
//   Roll a 1-10 die at 5, 15, 18, 20, 25, 30, 35, 40, 45, 50, 55 (two rolls at 5, 15, 25, 35, 45, 55).
//   1-3: -10.  4-7: no change.  8-10: +20.  Points stay 1-100.  Everyone rolls the same die.
//   Cost of Living: -10 at 18, 33, 48 (everyone).
//   Group hit at 30, 40, 50: see GROUP (fit to Chetty et al. 2020 individual earnings).
(function (root) {
  const STOPS = [5, 15, 18, 20, 25, 30, 33, 35, 40, 45, 48, 50, 55];
  const ROLLS = { 5: 2, 15: 2, 18: 1, 20: 1, 25: 2, 30: 1, 33: 0, 35: 2, 40: 1, 45: 2, 48: 0, 50: 1, 55: 2 };
  const LOSE_MAX = 3, WIN_MIN = 8, LOSE = -10, WIN = 20, STAY = 0;
  const COST = [18, 33, 48], COST_HIT = 10, GROUP_AGES = [30, 40, 50];
  // Points lost at each of 30, 40 and 50.
  const GROUP = {
    white_m: 0, white_f: 5, asian_m: 0, asian_f: 0, hisp_m: 5, hisp_f: 5,
    black_m: 10, black_f: 5, aian_m: 10, aian_f: 10,
  };
  const N_DICE = 17;

  const RACES = { white: 'White', black: 'Black', hisp: 'Hispanic', asian: 'Asian American', aian: 'Native American' };
  const clamp = v => Math.min(100, Math.max(1, v));
  const band = v => v <= 30 ? 'low' : v <= 70 ? 'mid' : 'high';
  const zone = die => die <= LOSE_MAX ? 'lose' : die >= WIN_MIN ? 'win' : 'stay';

  // Share of children in each fifth of individual earnings (ages 31-37), by parents' household income fifth.
  // KIR[group][parent fifth] = [bottom, 2nd, middle, 4th, top]. Chetty, Hendren, Jones & Porter (2020), Online Table 2.
  const KIR = {
    white_f: [[.3028, .3066, .1997, .1192, .0718], [.2469, .2747, .2272, .1568, .0944], [.2114, .2429, .2362, .19, .1195], [.1782, .2038, .2274, .2279, .1627], [.1492, .1564, .1739, .2381, .2824]],
    white_m: [[.2595, .2151, .1974, .1798, .1482], [.1868, .1844, .2136, .2238, .1915], [.1403, .1524, .2094, .2569, .2409], [.1068, .1229, .186, .2708, .3135], [.0865, .0964, .1386, .2266, .452]],
    black_f: [[.2047, .4021, .2366, .1045, .0521], [.1647, .3384, .269, .1467, .0811], [.1446, .2841, .2661, .185, .1202], [.1278, .2368, .261, .2147, .1598], [.1101, .1756, .2179, .242, .2543]],
    black_m: [[.3753, .2521, .1789, .1201, .0737], [.2994, .2352, .2031, .1568, .1055], [.2501, .212, .2099, .1839, .1441], [.2051, .1915, .211, .2054, .187], [.1644, .1597, .1891, .2166, .2701]],
    asian_f: [[.1801, .2037, .1745, .186, .2557], [.1613, .1706, .1757, .2039, .2885], [.149, .1511, .178, .2115, .3104], [.1332, .1295, .1625, .2202, .3546], [.1187, .1053, .1172, .1899, .4689]],
    asian_m: [[.1698, .1873, .1711, .1917, .2801], [.1509, .1507, .1709, .21, .3174], [.1318, .1295, .1688, .2227, .3472], [.1192, .11, .1522, .2208, .3978], [.108, .0842, .1082, .1718, .5279]],
    hisp_f: [[.2285, .3184, .2458, .1403, .0671], [.1975, .2767, .2645, .1736, .0877], [.1835, .2364, .2561, .2057, .1183], [.1688, .2084, .2378, .2274, .1576], [.1507, .1717, .1881, .2351, .2543]],
    hisp_m: [[.2345, .2024, .2157, .1994, .1479], [.1873, .1762, .2214, .2338, .1812], [.1586, .1591, .2109, .2503, .2211], [.1355, .1433, .1952, .2522, .2738], [.1161, .1216, .1605, .2269, .375]],
    aian_f: [[.3661, .3349, .1863, .0797, .0329], [.3036, .3015, .2297, .1138, .0514], [.2606, .2798, .2383, .1464, .0748], [.2257, .2466, .2394, .1745, .1138], [.2027, .2017, .2013, .2029, .1913]],
    aian_m: [[.3896, .2553, .1685, .1131, .0736], [.3072, .2375, .1947, .1543, .1063], [.2394, .2142, .2059, .1893, .1512], [.1976, .1793, .1979, .2232, .202], [.1621, .1592, .1752, .216, .2875]],
  };
  // Approximate individual income by percentile, 2024 (Census CPS ASEC via IPUMS, people in the workforce).
  const EARN = [[1, 1000], [10, 10264], [20, 23006], [25, 28000], [30, 31711], [40, 40438], [50, 50200], [60, 62000], [70, 78155], [75, 88710], [80, 100850], [90, 150000], [95, 201050], [99, 430000], [100, 700000]];

  // ---------- seeded dice (placeholders; the game rolls fresh dice on each tap) ----------
  function hashStr(s) { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return (h ^= h >>> 16) >>> 0; }; }
  function rng(seed) { let a = hashStr(String(seed))(); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function rollDice(seed) { const r = rng(seed); return Array.from({ length: N_DICE }, () => 1 + Math.floor(r() * 10)); }

  // ---------- what happens on each roll ----------
  // LINES[age][win|lose][band] = one line per roll at that age. STAY_LINES[age] for 4-7.
  const LINES = {
    5: {
      win: {
        low: ['A free pre-K spot opened up near you.', 'Your aunt moved in and watches you after school.'],
        mid: ['Your parents found a good daycare they can just afford.', 'The library runs a free reading club. You love it.'],
        high: ['Your parents hired a tutor to get you reading early.', 'Your family moved to a district with top-rated schools.'],
      },
      lose: {
        low: ['Your family was evicted and you changed schools.', "Your mom's shifts changed and no one could get you to school."],
        mid: ['Your dad got laid off and money got tight.', 'Ear infections kept you home for weeks.'],
        high: ['Your parents divorced and sold the house.', 'Your mom stopped working to care for your grandma.'],
      },
    },
    15: {
      win: {
        low: ['A teacher saw something in you and stayed after class to help.', 'You got into a free summer program at the community college.'],
        mid: ['A coach took an interest in you and pushed your grades up.', 'You did well on the PSAT and colleges started writing to you.'],
        high: ['Your parents paid for SAT prep and a college counselor.', 'A family friend got you a summer internship.'],
      },
      lose: {
        low: ['You started working nights to help with rent. Your grades slipped.', 'Your school lost its only math teacher mid-year.'],
        mid: ['Your parents split up and you moved twice in one year.', 'You failed algebra and had to repeat it.'],
        high: ['You burned out and your grades dropped.', 'You got suspended after a fight.'],
      },
    },
    18: {
      win: { low: ['You got a full Pell Grant and started community college.'], mid: ['You got into the state university with a scholarship.'], high: ['You got into your first-choice college. Your parents are paying.'] },
      lose: { low: ["Financial aid fell through. You're working full time at a warehouse instead."], mid: ['You started college, but the loans scared you off and you left.'], high: ["You didn't get in where you wanted and took a gap year that became two."] },
    },
    20: {
      win: { low: ['You got hired at a union job with benefits.'], mid: ['You landed a paid internship.'], high: ['A friend of your parents got you a job at their firm.'] },
      lose: { low: ['Your car broke down and you missed shifts. You got let go.'], mid: ['A medical bill you could not pay went to collections.'], high: ['You switched majors and lost a year.'] },
    },
    25: {
      win: {
        low: ['You finished a trade certificate and your pay jumped.', 'Your manager made you shift lead.'],
        mid: ['You got a raise.', 'You moved to a city with better jobs.'],
        high: ['You got into a top graduate program.', 'You got a signing bonus at a new job.'],
      },
      lose: {
        low: ['Your hours got cut to part-time.', 'Your rent went up $300 and you took out a payday loan.'],
        mid: ['Student loan payments started and ate your savings.', 'Your company downsized and you were laid off.'],
        high: ['Your startup failed.', "You moved for your partner's job and started over."],
      },
    },
    30: {
      win: { low: ['You got a steady job with health insurance.'], mid: ['You bought a small house with a first-time buyer loan.'], high: ['You got promoted to manager.'] },
      lose: { low: ['You got sick with no paid leave and lost your job.'], mid: ['Your baby came early. The hospital bill wiped out your savings.'], high: ['A divorce split everything you had in half.'] },
    },
    35: {
      win: {
        low: ['You finished an associate degree at night.', 'You got a raise.'],
        mid: ['You got promoted.', 'Your side business started paying.'],
        high: ['You got promoted to director.', 'Your stock options paid out.'],
      },
      lose: {
        low: ['Your landlord sold the building. The only place you found costs more and is farther away.', 'Your kid got sick and you missed too many days of work.'],
        mid: ['Your plant closed.', "Your partner lost their job and you're covering everything."],
        high: ['The market crashed and your investments dropped.', 'Your company was bought and your job was cut.'],
      },
    },
    40: {
      win: { low: ['You got hired by the city. Steady pay and a pension.'], mid: ['You paid off your student loans.'], high: ['You inherited money from your grandparents.'] },
      lose: { low: ["Your back gave out after years of lifting. You can't do the job anymore."], mid: ['Your car and your furnace died the same winter. It all went on credit cards.'], high: ['Your job was automated away.'] },
    },
    45: {
      win: {
        low: ['You got certified and moved up to supervisor.', 'You got a raise.'],
        mid: ['You got promoted.', 'Your house went up in value.'],
        high: ['Your investments had a great year.', 'You got promoted to vice president.'],
      },
      lose: {
        low: ['You were diagnosed with diabetes and the medicine costs a fortune.', 'Your hours were cut again.'],
        mid: ["You were laid off at 45. Every interview says you're overqualified.", 'Your mom needs care and you are paying for it.'],
        high: ['A health scare kept you out of work for months.', 'Your divorce was expensive.'],
      },
    },
    50: {
      win: { low: ['You finally got a job with a retirement plan.'], mid: ['You paid off your mortgage early.'], high: ['You sold your business.'] },
      lose: { low: ['Your hours were cut and your savings ran out.'], mid: ['Your company froze its pension.'], high: ['A bad investment took a big chunk of your savings.'] },
    },
    55: {
      win: {
        low: ['You got a raise.', 'Your grown kids started helping out.'],
        mid: ['Your retirement account finally looks healthy.', 'You got a late-career promotion.'],
        high: ['Your investments kept growing.', 'Your firm made you a partner.'],
      },
      lose: {
        low: ['Your knees gave out and you had to stop working full time.', 'Medical bills went to collections.'],
        mid: ['You were pushed into early retirement.', "You're now caring for a parent full time."],
        high: ['A market dip hit right as you planned to retire.', 'Your health forced you to cut back.'],
      },
    },
  };
  const STAY_LINES = {
    5: ['An ordinary year. Nothing big changed at home.', 'You started school. Life went on.'],
    15: ['A normal year of school.', 'You kept your grades steady.'],
    18: ['You finished high school and took the first job you found.'],
    20: ['You kept the same job all year.'],
    25: ['Same job, no raise, no cuts.', 'Your rent went up about as much as your pay did.'],
    30: ['A steady year. Nothing changed much.'],
    35: ['You held on to what you had.', 'Same job, same pay, same bills.'],
    40: ['A quiet year at work.'],
    45: ['A small raise, eaten by rising prices.', 'Nothing changed much.'],
    50: ['Steady work, no big changes.'],
    55: ['You kept working. Retirement is still years away.', 'An ordinary year.'],
  };
  const STAGE = { 5: 'Starting school', 15: 'High school', 18: 'On your own', 20: 'Twenty', 25: 'Early career', 30: 'Thirty', 33: 'Thirty-three', 35: 'Mid-career', 40: 'Forty', 45: 'Mid-forties', 48: 'Forty-eight', 50: 'Fifty', 55: 'Fifty-five' };

  // ---------- sources ----------
  const SRC = {
    race: ['Chetty, Hendren, Jones & Porter (2020), Race and Economic Opportunity', 'https://opportunityinsights.org/paper/race/'],
    oidata: ['Opportunity Insights data (Online Table 2)', 'https://opportunityinsights.org/data/?geographic_level=0&topic=0&paper_id=992#resource-listing'],
    earn: ['DQYDJ analysis of Census CPS ASEC (IPUMS), individual income 2024', 'https://dqydj.com/2024-average-median-top-individual-income-percentiles/'],
    census: ['US Census Bureau, Income in the US', 'https://www.census.gov/library/publications/2026/demo/p60-289.html'],
    jchs: ["Harvard JCHS, State of the Nation's Housing 2024", 'https://www.jchs.harvard.edu/state-nations-housing-2024'],
    care: ['US Department of Labor, childcare prices (2024)', 'https://www.dol.gov/newsroom/releases/wb/wb20241119'],
    kff: ['KFF, Employer Health Benefits Survey 2024', 'https://www.kff.org/health-costs/report/2024-employer-health-benefits-survey/'],
    blau: ['Blau & Kahn (2017), The Gender Wage Gap', 'https://www.nber.org/papers/w21913'],
    kleven: ['Kleven et al. (2019), Child Penalties across Countries', 'https://www.nber.org/papers/w25524'],
    aarp: ['AARP & NAC, Caregiving in the US 2020', 'https://www.aarp.org/ppi/info-2020/caregiving-in-the-united-states.html'],
    resume: ['Bertrand & Mullainathan (2004), résumé audit study', 'https://www.nber.org/papers/w9873'],
    lending: ['Bartlett et al. (2019), Consumer-Lending Discrimination', 'https://www.nber.org/papers/w25943'],
    homes: ['Brookings (2018), Devaluation of Assets in Black Neighborhoods', 'https://www.brookings.edu/articles/devaluation-of-assets-in-black-neighborhoods/'],
  };

  // ---------- life events (no roll) ----------
  const PEN = {
    cost: {
      name: 'COST OF LIVING',
      18: ["You're on your own now. Rent, a phone, a bus pass. It adds up.", { text: 'Half of US renter households spend 30% or more of their income on rent. That is a record high.', src: ['jchs'] }],
      33: ['Rent went up again. So did childcare.', { text: 'Childcare for one child costs about 9% to 16% of a median family\'s income, depending on the county and age of the child.', src: ['care'] }],
      48: ['Health insurance went up. Your parents need help too.', { text: 'In 2024 the average family health plan at work cost about $25,600 a year. Workers paid about $6,300 of that themselves.', src: ['kff'] }],
    },
    gender: {
      name: 'PAY GAP',
      30: ['You were steered into a lower-paid role than the men you started with.', { text: 'Differences in the jobs and industries women end up in are the biggest single reason women earn less than men.', src: ['blau'] }],
      40: ['Having kids, or being expected to, stalled your raises. The men on your team kept moving up.', { text: 'In the US, women\'s earnings drop about 30% after their first child and never fully recover. Men\'s earnings barely change.', src: ['kleven'] }],
      50: ['You cut back your hours to care for a family member.', { text: 'About six in ten family caregivers in the US are women, and many cut hours or leave work to do it.', src: ['aarp'] }],
    },
    race: {
      name: 'DISCRIMINATION',
      30: ['You sent out the same résumé as everyone else. You got fewer calls back.', { text: 'In a famous experiment, résumés with white-sounding names got about 50% more callbacks than identical résumés with Black-sounding names.', src: ['resume'] }],
      40: ['The bank charged you a higher rate on the same loan.', { text: 'Black and Latino borrowers pay higher interest on mortgages than white borrowers with the same credit, even with online lenders.', src: ['lending'] }],
      50: ['Your house is worth less than the same house in a whiter neighborhood.', { text: 'Homes in majority-Black neighborhoods are valued about $48,000 less, on average, than similar homes in similar neighborhoods with few Black residents.', src: ['homes'] }],
    },
  };
  // Why each group takes the hit it does (numbers come from KIR at run time).
  const GROUP_WHY = {
    white_f: 'Women earn less than men from families with the same income. That is the pay gap.',
    asian_f: 'Asian American women earn about as much as white men from families with the same income, so they take no hit.',
    asian_m: 'Asian American men out-earn white men from families with the same income, so they take no hit.',
    white_m: 'White men are the comparison group in this game, so they take no hit.',
    hisp_m: 'Hispanic men earn less than white men from families with the same income.',
    hisp_f: 'Hispanic women earn less than white men from families with the same income.',
    black_m: 'Black men face one of the biggest earnings gaps of any group, even when they grow up in families with the same income as white men.',
    black_f: 'Black women earn about as much as white women from families with the same income, but less than men. Their gap is smaller than Black men\'s.',
    aian_m: 'Native American men face one of the biggest earnings gaps of any group.',
    aian_f: 'Native American women face both a race gap and a pay gap, the largest combined gap in the data.',
  };
  const groupType = k => k === 'white_f' ? 'gender' : 'race';

  // ---------- simulate a whole life from a list of dice ----------
  function simulate(opts, dice) {
    const { race, gender, start } = opts, key = race + '_' + gender, hit = GROUP[key] || 0;
    let lp = start, k = 0;
    const steps = [], hist = [{ age: 0, lp }];
    for (const age of STOPS) {
      for (let i = 0; i < ROLLS[age]; i++) {
        const die = dice[k++], z = zone(die), b = band(lp), before = lp;
        lp = clamp(lp + (z === 'win' ? WIN : z === 'lose' ? LOSE : STAY));
        const pool = z === 'stay' ? STAY_LINES[age] : LINES[age][z][b];
        steps.push({ age, kind: 'roll', die, zone: z, before, lp, delta: lp - before, text: pool[i % pool.length], idx: i, of: ROLLS[age] });
      }
      const pens = [];
      if (COST.includes(age)) pens.push(['cost', COST_HIT]);
      if (hit && GROUP_AGES.includes(age)) pens.push([groupType(key), hit]);
      for (const [p, amt] of pens) {
        const before = lp; lp = clamp(lp - amt);
        const [text, card] = PEN[p][age];
        steps.push({ age, kind: 'pen', type: p, name: PEN[p].name, text, card, amt, before, lp, delta: lp - before });
      }
      hist.push({ age, lp });
    }
    return { start, final: lp, steps, hist };
  }

  const ENDINGS = [
    [20, 'STUCK', 'You worked hard your whole life and still ended near the bottom. It was never only up to you.'],
    [40, 'GETTING BY', 'You made it, paycheck to paycheck. One bad month could still knock you down.'],
    [80, 'STABLE', 'A steady life in the middle. Not rich, but you can breathe.'],
    [100, 'THRIVING', 'You ended near the top. Savings, a home, a cushion for your kids.'],
  ];
  const ending = v => ENDINGS.find(e => v <= e[0]);
  const fifth = v => Math.min(4, Math.floor((Math.max(1, v) - 1) / 20));

  // Share of simulated lives ending in each fifth, for starts spread across the parents' fifth.
  function gameOdds(opts, n) {
    const out = [0, 0, 0, 0, 0], r = rng('odds|' + opts.race + opts.gender + fifth(opts.start));
    for (let i = 0; i < n; i++) {
      const dice = Array.from({ length: N_DICE }, () => 1 + Math.floor(r() * 10));
      const st = fifth(opts.start) * 20 + 1 + Math.floor(r() * 20);
      out[fifth(simulate({ ...opts, start: st }, dice).final)]++;
    }
    return out.map(v => v / n);
  }
  function earnings(v) {
    for (let i = 1; i < EARN.length; i++) if (v <= EARN[i][0]) { const [a, va] = EARN[i - 1], [b, vb] = EARN[i]; return va + (vb - va) * (v - a) / (b - a); }
    return EARN[EARN.length - 1][1];
  }

  root.DICE = { STOPS, ROLLS, RACES, STAGE, SRC, PEN, LINES, STAY_LINES, ENDINGS, GROUP, GROUP_AGES, GROUP_WHY, KIR, COST, COST_HIT, WIN, LOSE, LOSE_MAX, WIN_MIN, zone, rollDice, rng, simulate, ending, fifth, gameOdds, earnings };
})(typeof window !== 'undefined' ? window : globalThis);
