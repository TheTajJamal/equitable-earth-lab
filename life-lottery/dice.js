// Life Lottery v1: dice rules, roll lines and data cards.
// Rules (locked after simulation, see README):
//   Start at parents' income decile (1-10). Roll a 1-10 die at each stop; double rolls at 5,15,25,35,45,55.
//   Win +2, lose -1, points stay 1-10. Win chance = (decile - 1) x 10%, never below 30% or above 50%,
//   reset at each double-roll age. Cost of Living -1 at 18, 33, 48 (everyone).
//   Girls -1 at 25, 35, 45. Black, Hispanic and Native players -1 at 30, 40, 50.
(function (root) {
  const STOPS = [5, 15, 18, 20, 25, 30, 33, 35, 40, 45, 48, 50, 55];
  const ROLLS = { 5: 2, 15: 2, 18: 1, 20: 1, 25: 2, 30: 1, 33: 0, 35: 2, 40: 1, 45: 2, 48: 0, 50: 1, 55: 2 };
  const RESET = new Set([5, 15, 25, 35, 45, 55]);
  const COST = [18, 33, 48], GIRL = [25, 35, 45], RACE = [30, 40, 50];
  const POC = new Set(['black', 'hisp', 'aian']);
  const WIN = 2, LOSE = -1, MIN_CH = 30, MAX_CH = 50;
  const N_DICE = 17;

  const RACES = { white: 'White', black: 'Black', hisp: 'Hispanic', asian: 'Asian American', aian: 'Native American' };
  const dec = lp => Math.min(10, Math.max(1, Math.round(lp)));
  const clamp = lp => Math.min(10, Math.max(1, lp));
  // Win if the die is at least `need`. chance = (11 - need) x 10%.
  const needFor = d => { const ch = Math.max(MIN_CH, Math.min(MAX_CH, (dec(d) - 1) * 10)); return 11 - ch / 10; };
  const band = d => d <= 3 ? 'low' : d <= 7 ? 'mid' : 'high';

  // ---------- seeded dice ----------
  function hashStr(s) { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return (h ^= h >>> 16) >>> 0; }; }
  function rng(seed) { let a = hashStr(String(seed))(); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function rollDice(seed) { const r = rng(seed); return Array.from({ length: N_DICE }, () => 1 + Math.floor(r() * 10)); }

  // ---------- what happens on each roll ----------
  // LINES[age][win|lose][band] = one line per roll at that age.
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
      win: { low: ['You got hired at a union job with benefits.'], mid: ['You landed a paid internship.'], high: ["A friend of your parents got you a job at their firm."] },
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
  const STAGE = { 5: 'Starting school', 15: 'High school', 18: 'On your own', 20: 'Twenty', 25: 'Early career', 30: 'Thirty', 33: 'Thirty-three', 35: 'Mid-career', 40: 'Forty', 45: 'Mid-forties', 48: 'Forty-eight', 50: 'Fifty', 55: 'Fifty-five' };

  // ---------- sources ----------
  const SRC = {
    race: ['Chetty, Hendren, Jones & Porter (2020), Race and Economic Opportunity', 'https://opportunityinsights.org/paper/race/'],
    oidata: ['Opportunity Insights data', 'https://opportunityinsights.org/data/'],
    jchs: ["Harvard JCHS, State of the Nation's Housing 2024", 'https://www.jchs.harvard.edu/state-nations-housing-2024'],
    care: ['US Department of Labor, childcare prices (2024)', 'https://www.dol.gov/newsroom/releases/wb/wb20241119'],
    kff: ['KFF, Employer Health Benefits Survey 2024', 'https://www.kff.org/health-costs/report/2024-employer-health-benefits-survey/'],
    blau: ['Blau & Kahn (2017), The Gender Wage Gap', 'https://www.nber.org/papers/w21913'],
    kleven: ['Kleven et al. (2019), Child Penalties across Countries', 'https://www.nber.org/papers/w25524'],
    aarp: ['AARP & NAC, Caregiving in the US 2020', 'https://www.aarp.org/ppi/info-2020/caregiving-in-the-united-states.html'],
    resume: ['Bertrand & Mullainathan (2004), résumé audit study', 'https://www.nber.org/papers/w9873'],
    lending: ['Bartlett et al. (2019), Consumer-Lending Discrimination', 'https://www.nber.org/papers/w25943'],
    homes: ['Brookings (2018), Devaluation of Assets in Black Neighborhoods', 'https://www.brookings.edu/articles/devaluation-of-assets-in-black-neighborhoods/'],
    census: ['US Census Bureau, Income in the US', 'https://www.census.gov/library/publications/2026/demo/p60-289.html'],
  };

  // ---------- penalties ----------
  const PEN = {
    cost: {
      name: 'COST OF LIVING',
      18: ["You're on your own now. Rent, a phone, a bus pass. It adds up.", { text: 'Half of US renter households spend 30% or more of their income on rent. That is a record high.', src: ['jchs'] }],
      33: ['Rent went up again. So did childcare.', { text: 'Childcare for one child costs about 9% to 16% of a median family\'s income, depending on the county and age of the child.', src: ['care'] }],
      48: ['Health insurance went up. Your parents need help too.', { text: 'In 2024 the average family health plan at work cost about $25,600 a year. Workers paid about $6,300 of that themselves.', src: ['kff'] }],
    },
    girl: {
      name: 'GENDER GAP',
      25: ['You were steered into a lower-paid role than the men you started with.', { text: 'Differences in the jobs and industries women end up in are the biggest single reason women earn less than men.', src: ['blau'] }],
      35: ['Having kids, or being expected to, stalled your raises. The men on your team kept moving up.', { text: 'In the US, women\'s earnings drop about 30% after their first child and never fully recover. Men\'s earnings barely change.', src: ['kleven'] }],
      45: ['You cut back your hours to care for a family member.', { text: 'About six in ten family caregivers in the US are women, and many cut hours or leave work to do it.', src: ['aarp'] }],
    },
    race: {
      name: 'DISCRIMINATION',
      30: ['You sent out the same résumé as everyone else. You got fewer calls back.', { text: 'In a famous experiment, résumés with white-sounding names got about 50% more callbacks than identical résumés with Black-sounding names.', src: ['resume'] }],
      40: ['The bank charged you a higher rate on the same loan.', { text: 'Black and Latino borrowers pay higher interest on mortgages than white borrowers with the same credit, even with online lenders.', src: ['lending'] }],
      50: ['Your house is worth less than the same house in a whiter neighborhood.', { text: 'Homes in majority-Black neighborhoods are valued about $48,000 less, on average, than similar homes in similar neighborhoods with few Black residents.', src: ['homes'] }],
    },
  };

  // ---------- simulate a whole life from a list of dice ----------
  // Returns the start plus a list of steps, in order: odds resets, rolls and penalties.
  function simulate(opts, dice) {
    const { race, gender, start } = opts;
    let lp = start, need = needFor(start), k = 0;
    const steps = [], hist = [{ age: 0, lp }];
    for (const age of STOPS) {
      if (RESET.has(age)) { need = needFor(lp); steps.push({ age, kind: 'odds', need, chance: (11 - need) * 10, dec: dec(lp) }); }
      for (let i = 0; i < ROLLS[age]; i++) {
        const die = dice[k++], b = band(lp), win = die >= need, before = lp;
        lp = clamp(lp + (win ? WIN : LOSE));
        const pool = LINES[age][win ? 'win' : 'lose'][b];
        steps.push({ age, kind: 'roll', die, need, win, before, lp, delta: lp - before, text: pool[i % pool.length], idx: i, of: ROLLS[age] });
      }
      const pens = [];
      if (COST.includes(age)) pens.push('cost');
      if (gender === 'f' && GIRL.includes(age)) pens.push('girl');
      if (POC.has(race) && RACE.includes(age)) pens.push('race');
      for (const p of pens) {
        const before = lp; lp = clamp(lp - 1);
        const [text, card] = PEN[p][age];
        steps.push({ age, kind: 'pen', type: p, name: PEN[p].name, text, card, before, lp, delta: lp - before });
      }
      hist.push({ age, lp });
    }
    return { start, final: dec(lp), steps, hist };
  }

  const ENDINGS = [
    [2, 'STUCK', 'You worked hard your whole life and still ended near the bottom. It was never only up to you.'],
    [4, 'GETTING BY', 'You made it, paycheck to paycheck. One bad month could still knock you down.'],
    [7, 'STABLE', 'A steady middle-class life. Not rich, but you can breathe.'],
    [10, 'THRIVING', 'You ended near the top. Savings, a home, a cushion for your kids.'],
  ];
  const ending = d => ENDINGS.find(e => d <= e[0]);

  // Share of simulated lives in each fifth, for a given start.
  function gameOdds(opts, n) {
    const out = [0, 0, 0, 0, 0], r = rng('odds|' + opts.race + opts.gender + opts.start);
    for (let i = 0; i < n; i++) {
      const dice = Array.from({ length: N_DICE }, () => 1 + Math.floor(r() * 10));
      out[Math.ceil(simulate(opts, dice).final / 2) - 1]++;
    }
    return out.map(v => v / n);
  }

  root.DICE = { STOPS, ROLLS, RESET, RACES, POC, STAGE, SRC, PEN, LINES, ENDINGS, WIN, LOSE, MIN_CH, MAX_CH, dec, needFor, rollDice, rng, simulate, ending, gameOdds };
})(typeof window !== 'undefined' ? window : globalThis);
