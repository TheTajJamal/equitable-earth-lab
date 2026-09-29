# Equitable Earth Lab

Small interactive tools about fairness and opportunity, built on real data. By [Equitable Earth Solutions](https://equitableearth.solutions).

Live at: https://thetajjamal.github.io/equitable-earth-lab/ (custom domain `tools.equitableearth.solutions` once DNS is set)

## Life Lottery (`/life-lottery`)

Draw a random American life and try to reach five goals:

1. Start college by 18
2. Finish a bachelor's by 22
3. Get out of the bottom 40% of household income by 35
4. Out-earn your parents
5. Live to retirement age (65)

Births are weighted like real US births (race, gender, and parents' income). The data sets the odds of each outcome for someone born where you were. Player choices (study, extra shifts, rest) shift those odds slightly. Everyday setbacks in the story text are illustrative.

### Data

| What | Source | File |
|---|---|---|
| Parent → child household income quintile, by race and gender; parent income distribution by race | Chetty, Hendren, Jones & Porter (2020), *Race and Economic Opportunity in the United States*, Online Table 2 (children born 1978–83) | `data-us.js` → `groups` |
| College attendance and incarceration by parent income percentile (Black and white children, by gender) | Same paper, Online Table 1 | `college`, `jail` |
| College enrollment and bachelor's by 24 by family income quartile | Pell Institute, *Indicators of Higher Education Equity* 2024 (bottom and top quartile published; middle two interpolated) | `pell` |
| Share earning more than their parents, by birth cohort and parent percentile | Chetty et al. (2017), *The Fading American Dream*, Online Table 1 | `abs` |
| Life expectancy at 40 by household income percentile and gender | Chetty et al. (2016), *JAMA*, Online Table 1 | `le` |
| Household income by percentile (approximate, 2025 dollars) | US Census Bureau CPS ASEC (median $87,460; 90/10 ratio 13.06) | `dollars` |

All Opportunity Insights data: https://opportunityinsights.org/data/

### Modelling assumptions

- Outcomes are linked through one latent "fortune" draw per life (correlation 0.5 for college, finishing, and incarceration; 0.8 for out-earning parents), so each outcome matches its published rate while outcomes stay realistically connected.
- Finishing a degree uses the Pell ratio (bachelor's by 24 ÷ enrollment) for all groups.
- Incarceration uses the share incarcerated on one day around ages 27–32, so it understates lifetime incarceration. Not published for Hispanic, Asian or American Indian children, so the event does not occur for those groups.
- Death age uses a Gompertz curve fitted to each person's life expectancy at 40.
- Choices shift the latent draw by at most about 0.4 standard deviations over a whole life.

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
