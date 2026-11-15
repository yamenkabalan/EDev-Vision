/** JRC yearly classification: 2 seasonal, 3 permanent; 0/1 are masked. */
export const annualWaterService = 'https://di-jrcglobaldata.img.arcgis.com/arcgis/rest/services/GSW_Yearly_History_TimeEnabled/ImageServer';
export function annualWaterTiles(year: number): string {
  if (!Number.isInteger(year) || year < 1984 || year > 2021) throw new Error('Annual water year outside source coverage.');
  const renderingRule = { rasterFunction: 'Colormap', rasterFunctionArguments: {
    Colormap: [[2,49,163,84],[3,33,113,181]],
    Raster: { rasterFunction: 'Remap', rasterFunctionArguments: {
      Raster: '$$', InputRanges: [2,3,3,4], OutputValues: [2,3], NoDataRanges: [0,2], AllowUnmatched: false,
    } },
  } };
  const params = new URLSearchParams({ f: 'image', bboxSR: '3857', imageSR: '3857', size: '256,256', format: 'png32',
    interpolation: 'RSP_NearestNeighbor', time: `${Date.UTC(year,0,1)},${Date.UTC(year,11,31,23,59,59)}`, renderingRule: JSON.stringify(renderingRule) });
  return `${annualWaterService}/exportImage?${params}&bbox={bbox-epsg-3857}`;
}
