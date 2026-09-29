# Equitable Earth Solutions Lab

Small interactive tools about fairness and opportunity, built on real data. By [Equitable Earth Solutions](https://equitableearth.solutions).

Live at: https://thetajjamal.github.io/equitable-earth-lab/ (custom domain `tools.equitableearth.solutions` once DNS is set)

## Life Lottery (`/life-lottery`)

Draw a random American life (or choose race, gender and parents' income decile) and roll a 1–10 die from age 5 to 55.

### Rules (v1)

1. You start at your parents' income decile (1–10). Random draws are weighted by US births and each group's parent income distribution (Chetty et al. 2020).
2. Roll at ages 5, 15, 18, 20, 25, 30, 35, 40, 45, 50 and 55. At 5, 15, 25, 35, 45 and 55 you roll twice.
3. Win **+2**, lose **−1**. Points stay between 1 and 10; your points are your income decile.
4. Win chance = (decile − 1) × 10%, never below **30%** or above **50%**. It resets to your current decile at each double-roll age.
5. **Cost of Living:** everyone takes −1 at 18, 33 and 48.
6. **Gender gap:** girls take −1 at 25, 35 and 45. **Discrimination:** Black, Hispanic and Native players take −1 at 30, 40 and 50. White and Asian American players take neither race hit (Asian American children out-earn white children from the same parent income in the data).
7. Endings by final decile: 1–2 Stuck, 3–4 Getting by, 5–7 Stable, 8–10 Thriving.

Each roll shows a plain win or loss line matched to your age and income band. Each penalty and each odds reset has a **WHY?** card with the data and a source link.

At the end: your decile over your life, **the same dice replayed** with a different start (top or bottom decile) and as a different player (a white boy, or a Black girl if you were a white or Asian boy), the **game vs real data** for your group and starting fifth, and **play as your child** (they start where you ended).

### Calibration

The rules were tuned by simulation (100,000 lives per start and group) against Chetty, Hendren, Jones & Porter (2020). Roughly:

| | Game | Real |
|---|---|---|
| Bottom fifth → top fifth, white boys | 12% | ~10% |
| Bottom fifth → top fifth, Black girls | 2% | 2.6% |
| Top fifth stays top, white boys | 46% | ~39% |
| Top fifth stays top, Black girls | 13% | 19% |
| Top fifth → bottom fifth, Black girls | 41% | 12% |

The game is harsher than reality on well-off players of color who hit bad luck (the last row). The ending screen shows the real numbers next to the game's so players can see the gap.

### Data

| What | Source | File |
|---|---|---|
| Parent → child household income quintile by race and gender; parent income distribution by race | Chetty, Hendren, Jones & Porter (2020), Online Table 2 (children born 1978–83) | `data-us.js` → `groups` |
| Household income by percentile (approximate) | US Census Bureau | `data-us.js` → `dollars` |
| Penalty cards: housing, childcare, health premiums, gender gap, child penalty, caregiving, résumé callbacks, lending, home values | See `SRC` in `dice.js` | `dice.js` → `PEN` |

All Opportunity Insights data: https://opportunityinsights.org/data/

`engine.js` is the earlier v4 engine (goals and bar). It is no longer loaded by the game and is kept for reference; `data-us.js` still holds its extra tables.

## Structure

```
index.html            Lab landing page
life-lottery/
  index.html          Game page (HTML + CSS)
  game.js             UI and pixel scenes
  dice.js             v1 rules, roll lines, penalty cards, simulator
  data-us.js          US data tables (edit numbers here)
  engine.js           v4 engine (not loaded, kept for reference)
```

Plain HTML/JS, no build step. To change a rule, edit the constants at the top of `dice.js`. To add a country, add a `data-xx.js` with the same shape.
