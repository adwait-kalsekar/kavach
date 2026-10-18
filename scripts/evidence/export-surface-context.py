"""Two explicit bounded research queries; no tasks/schedules or runtime calls."""
import argparse,datetime,json,subprocess
from pathlib import Path
from importlib.util import spec_from_file_location,module_from_spec
spec=spec_from_file_location('regions',Path(__file__).with_name('export-season-history.py'));m=module_from_spec(spec);spec.loader.exec_module(m)
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--run',action='store_true');a=ap.parse_args()
 if not a.run:print('PLAN: one ERA5 September query; one quality-masked MODIS September-composite query, 10 sample grids. No cloud calls.');raise SystemExit()
 import ee
 from google.oauth2.credentials import Credentials
 ee.Initialize(credentials=Credentials(subprocess.check_output(['gcloud','auth','print-access-token'],text=True).strip()),project=m.P)
 ee.data.setDeadline(120000);ee.data.setMaxRetries(0)
 points=ee.FeatureCollection([ee.Feature(ee.Geometry.Point([lon,lat]),{'regionId':key,'name':label}) for key,label,lat,lon in m.REGIONS])
 root=Path('.data/research/climate');root.mkdir(parents=True,exist_ok=True)
 # Query one: modeled surface moisture (0–7cm) and mean daily max air temperature.
 target=root/'era5-surface-context.json'
 if not target.exists():
  col=ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR');bands=[];years=[*range(1991,2021),2023,2026]
  for y in years:
   c=col.filterDate(f'{y}-09-01',f'{y}-10-01')
   bands.append(c.select('volumetric_soil_water_layer_1').mean().rename(f'moisture_{y}').addBands(c.select('temperature_2m_max').mean().subtract(273.15).rename(f'tmaxC_{y}')).addBands(c.select('volumetric_soil_water_layer_1').count().rename(f'moistureDays_{y}')).addBands(c.select('temperature_2m_max').count().rename(f'temperatureDays_{y}')))
  data=ee.Image.cat(bands).reduceRegions(collection=points,reducer=ee.Reducer.first(),scale=11132,crs=col.first().projection()).getInfo()
  rows=[f['properties'] for f in data['features']]
  for r in rows:
   for y in years:
    if r.get(f'moistureDays_{y}')!=30 or r.get(f'temperatureDays_{y}')!=30 or not 0<=r.get(f'moisture_{y}',-1)<=1 or not -50<r.get(f'tmaxC_{y}',-999)<70:raise ValueError('Incomplete/invalid ERA5 context')
  target.write_text(json.dumps({'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'product':'ECMWF/ERA5_LAND/DAILY_AGGR','period':'September 1–30 each year','surfaceDepthCm':'0–7','moistureUnits':'m3/m3','heatUnits':'Celsius, mean of daily maximum 2m air temperature','scope':'modeled approximate town-centre grid; not field/root-zone measurement','scaleMetres':11132,'rows':rows},indent=2)+'\n')
  print('ERA5 acquired:',len(rows),'regions',flush=True)
 # Query two: composites whose start dates occur in September; quality retained.
 target=root/'modis-vegetation-context.json'
 if not target.exists():
  col=ee.ImageCollection('MODIS/061/MOD13Q1');bands=[];years=[*range(2001,2021),2023,2026]
  def good(image):return image.select('NDVI').updateMask(image.select('SummaryQA').eq(0)).multiply(0.0001)
  for y in years:
   c=col.filterDate(f'{y}-09-01',f'{y}-09-25');clean=c.map(good)
   bands.append(clean.mean().rename(f'ndvi_{y}').addBands(clean.count().rename(f'validComposites_{y}')))
  data=ee.Image.cat(bands).reduceRegions(collection=points,reducer=ee.Reducer.first(),scale=250,crs=col.first().projection()).getInfo()
  rows=[f['properties'] for f in data['features']]
  # Masked years remain missing; do not fill as zero vegetation.
  for r in rows:
   for y in years:
    if r.get(f'ndvi_{y}') is not None and not -0.2<=r[f'ndvi_{y}']<=1:raise ValueError('Invalid NDVI')
  target.write_text(json.dumps({'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'product':'MODIS/061/MOD13Q1','period':'16-day composites starting Sep 1–24 (normally Sep 13/14), excluding late-Sep composites not yet available for 2026; not a September monthly mean','baselineCandidate':'2001–2020, require sufficient valid years per grid','qualityMask':'SummaryQA == 0 (good data only); missing values retained','scaleFactor':0.0001,'scope':'approximate town-centre pixel; no agricultural land/crop mask, NOT crop condition evidence','scaleMetres':250,'rows':rows},indent=2)+'\n')
  print('MODIS acquired:',len(rows),'regions; per-year missingness retained',flush=True)
