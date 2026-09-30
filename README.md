# Equitable Earth Solutions Lab

Small interactive tools about fairness and opportunity, built on real data. By [Equitable Earth Solutions](https://equitableearth.solutions).

Live at: https://thetajjamal.github.io/equitable-earth-lab/ (custom domain `tools.equitableearth.solutions` once DNS is set)

## Life Lottery (`/life-lottery`)

Draw a random American life (or choose race, gender and parents' income decile) and roll a 1–10 die from age 5 to 55.

### Rules

1. You start with **life points (1–100)** equal to your parents' household income percentile. Random draws are weighted by US births and each group's parent income distribution (Chetty et al. 2020).
2. Roll a fair 1–10 die at ages 5, 15, 18, 20, 25, 30, 35, 40, 45, 50 and 55 (two rolls at 5, 15, 25, 35, 45 and 55). **Everyone rolls the same die:** 1–3 is **−10**, 4–7 is no change, 8–10 is **+20**. Points stay between 1 and 100. Each die is rolled with `crypto.getRandomValues` when the player taps ROLL.
3. **Cost of Living:** everyone takes −10 at 18, 33 and 48.
4. **Group hits** at 30, 40 and 50 (shown as a popup, no roll):

| | Men | Women |
|---|---|---|
| White | 0 | −5 (pay gap) |
| Asian American | 0 | 0 |
| Hispanic | −5 | −5 |
| Black | −10 | −5 |
| Native American | −10 | −10 |

5. Endings by final points: 1–20 Stuck, 21–40 Getting by, 41–80 Stable, 81–100 Thriving.

The top bar shows life points out of 100 and your age. Earnings are shown only at 20, 30, 40, 50 and 55. Dollar amounts map life points onto the 5th–95th percentile (10 points or less = 5th, 100 points = 95th), so the game never shows extreme top incomes.

At the end: your points over your life, **the same dice replayed** with a different start (5 or 95) and as a different player (a white boy, or a Black boy if your group takes no hit), the **game vs real data** for your group and parents' fifth, and **play as your child** (they start where you ended).

### Calibration

Adults are compared on their **own earnings**, not household income: household income counts a spouse's pay, which hides the gender pay gap and makes the game (which follows one person) impossible to match for women. The group hits were fit by simulation (100,000 lives per group and start) to Chetty, Hendren, Jones & Porter (2020), Online Table 2, individual income (`kir`) quintiles at ages 31–37 by parents' household income quintile. Across all 50 group, gender and parent-fifth cells, the game's bottom-fifth and top-fifth shares miss the real ones by about 4.5 percentage points on average (the previous version missed by about 13).

Known gaps: Asian American players reach the top fifth less often than in the data; boys of color who start at the top stay there less often than in the data; and few players from the top fall all the way to the bottom (real falls come from big shocks the game does not model).

### Data

| What | Source | File |
|---|---|---|
| Parent household income → child individual earnings quintile, by race and gender | Chetty, Hendren, Jones & Porter (2020), Online Table 2 (children born 1978–83) | `dice.js` → `KIR` |
| Parent income distribution by race (for random starts) | Same table | `data-us.js` → `groups` |
| Family household income by percentile (childhood) | US Census Bureau | `data-us.js` → `dollars` |
| Individual income by percentile (adults) | Census CPS ASEC 2024 via IPUMS, as tabulated by DQYDJ | `dice.js` → `EARN` |
| Penalty cards: housing, childcare, health premiums, gender gap, child penalty, caregiving, résumé callbacks, lending, home values | See `SRC` in `dice.js` | `dice.js` → `PEN` |

All Opportunity Insights data: https://opportunityinsights.org/data/

`engine.js` is the earlier v4 engine (goals and bar). It is no longer loaded by the game and is kept for reference; `data-us.js` still holds its extra tables.

## Structure

```
index.html            Lab landing page
life-lottery/
  index.html          Game page (HTML + CSS)
  game.js             UI and pixel scenes
  dice.js             Rules, roll lines, life events, earnings data, simulator
  data-us.js          US data tables (edit numbers here)
  engine.js           v4 engine (not loaded, kept for reference)
```

Plain HTML/JS, no build step. To change a rule, edit the constants at the top of `dice.js`. To add a country, add a `data-xx.js` with the same shape.
