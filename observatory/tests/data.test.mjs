import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measurement, parseSeries, parseBounds, segments, highest, change, validDate } from '../lib/data.ts';
test('Missing, invalid and zero values remain distinct', () => {
  assert.equal(measurement(0),0); for (const v of [null, undefined, '', '0', -1, NaN]) assert.equal(measurement(v),null);
  const rows=parseSeries([{date:'2026-07-08',open_water_km2:0}],['2026-07-08','2026-07-20']);
  assert.equal(rows[0].open_water_km2,0); assert.equal(rows[1].open_water_km2,null); assert.equal(change(null,5),null); assert.equal(change(0,5),5);
});
test('Missing observations and acquisition gaps break the plotted line', () => {
  const rows=parseSeries([{date:'2026-07-08',open_water_km2:2},{date:'2026-07-20',open_water_km2:3},{date:'2026-08-13',open_water_km2:4},{date:'2026-08-25',open_water_km2:null},{date:'2026-09-06',open_water_km2:0}],['2026-07-08','2026-07-20','2026-08-13','2026-08-25','2026-09-06']);
  assert.deepEqual(segments(rows,'open_water_km2',[['2026-07-27','2026-08-10']]).map(x=>x.length),[2,1,1]);
  assert.equal(highest(rows,'open_water_km2').date,'2026-08-13');
});
test('Invalid geolocation, dates and duplicates fail explicitly', () => {
  assert.equal(validDate('2026-02-30'),false);
  assert.throws(()=>parseBounds({date:'2026-07-08',bounds:[[20,22],[-20,24]],width:10,height:10},'2026-07-08'));
  assert.throws(()=>parseSeries([{date:'2026-07-08'},{date:'2026-07-08'}],['2026-07-08']));
});
