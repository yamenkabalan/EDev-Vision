import report from '../experiments/global-water/results/report.json';

const oneYear = report.evaluation['1'];

export const ridgeResearch = {
  firstYear: report.evaluationYears[0],
  lastYear: report.evaluationYears[1],
  worldYears: oneYear.world.rows,
  worldError: oneYear.world.candidates.climatePanel.wape_pct,
  worldBaseline: oneYear.world.candidates.persistence.wape_pct,
  countries: oneYear.countries.places,
  countryError: oneYear.countries.candidates.climatePanel.wape_pct,
  countryBaseline: oneYear.countries.candidates.persistence.wape_pct,
  countryMape: oneYear.countries.candidates.climatePanel.mape_pct,
  basins: oneYear.basins.places,
  basinError: oneYear.basins.candidates.equal.wape_pct,
};

export type RidgeResearch = typeof ridgeResearch;
