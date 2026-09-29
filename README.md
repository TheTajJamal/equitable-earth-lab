# Equitable Earth Solutions Lab

Small interactive tools about fairness and opportunity, built on real data. By [Equitable Earth Solutions](https://equitableearth.solutions).

Live at: https://thetajjamal.github.io/equitable-earth-lab/ (custom domain `tools.equitableearth.solutions` once DNS is set)

## Life Lottery (`/life-lottery`)

Draw a random American life and chase five goals, one at a time:

1. Finish high school (resolves at 17)
2. Your path, chosen at 17: finish a degree, or land a steady job with benefits (resolves at 24)
3. Get out of the bottom 40% of household income by 35
4. Out-earn your parents
5. Live to 65

A ticker at the top shows the current goal and a **0–10 bar**. End a goal at 6 or more to hit it; whatever level you finish at is where the next goal starts. Every event moves the bar by 1. Once a round, a roll uses the published odds for kids born where you were (race, gender, parents' income) and pulls the bar toward where those kids usually end up, so across many lives the game lands near the real rates (average gap about 5 points in testing). Kids arrive on a schedule tied to education: first births average 21.4 without a diploma and 30.3 with a bachelor's (NCFMR 2023).

Every round has a **WHY?** button that opens a "What the data says" card with a source link.

From 18 to 33 each two-year round offers: an "If I can just..." dream (+1 if it works; odds rise 15 points per retry), night classes (+1 half the time), extra shifts (+1, but with kids and a low income the kid or the relationship pays -1; two strained rounds in a row and your partner moves out), or rest (setbacks half as likely). Partners, children (with age-appropriate milestones), health news and incarceration (Black and white players only, where data exists; job odds after release depend on education) are all in the event library. When a life with children ends, you can play as your child.

The dialogue and data script lives in the Life Lottery script doc.

### Data

| What | Source | File |
|---|---|---|
| Parent → child household income quintile, by race and gender; parent income distribution by race | Chetty, Hendren, Jones & Porter (2020), *Race and Economic Opportunity in the United States*, Online Table 2 (children born 1978–83) | `data-us.js` → `groups` |
| High school completion, college attendance, marriage and incarceration by parent income percentile (Black and white children, by gender) | Same paper, Online Table 1 | `nohs`, `college`, `married`, `jail` |
| Access to employer health plans by wage | BLS Employee Benefits, March 2026 | `benefits` |
| College enrollment and bachelor's by 24 by family income quartile | Pell Institute, *Indicators of Higher Education Equity* 2024 (bottom and top quartile published; middle two interpolated) | `pell` |
| Share earning more than their parents, by birth cohort and parent percentile | Chetty et al. (2017), *The Fading American Dream*, Online Table 1 | `abs` |
| Life expectancy at 40 by household income percentile and gender | Chetty et al. (2016), *JAMA*, Online Table 1 | `le` |
| Mother's mean age at first birth by education | NCFMR Family Profile FP-25-29 (2023) | `engine.js` |
| Household income by percentile (approximate, 2025 dollars) | US Census Bureau CPS ASEC (median $87,460; 90/10 ratio 13.06) | `dollars` |

All Opportunity Insights data: https://opportunityinsights.org/data/

### Modelling assumptions

- The odds roll moves the bar up with probability Φ((target − bar) / 1.2), where target = 5.4 + 1.2·Φ⁻¹(published rate). This makes the chance of ending at 6 or more close to the published rate. Rolls share one latent "fortune" per life (correlation 0.4) so outcomes stay connected.
- High school odds for Hispanic, Asian and American Indian players average the published Black and white figures (only those are published). College odds for those groups use the Pell Institute income gradient.
- Degree completion uses the Pell ratio (bachelor's by 24 ÷ enrollment) for all groups.
- Incarceration uses the share incarcerated on one day around ages 27–32, which understates lifetime incarceration.
- Survival to 65 uses a Gompertz curve fitted to each person's life expectancy at 40.
- Event chances by income band and all point sizes are modelling choices, listed in `engine.js` (`SETBACKS`, `GOODS`, `DREAMS`). Other data sources: see the sources list in `engine.js` (`SRC`) and on the game's ending screen.

## Structure

```
index.html            Lab landing page
life-lottery/
  index.html          Game page (HTML + CSS)
  game.js             UI and pixel scenes
  engine.js           Seeded simulation engine
  data-us.js          US data tables (edit numbers here)
```

Plain HTML/JS, no build step. To add a country, add a `data-xx.js` with the same shape.
