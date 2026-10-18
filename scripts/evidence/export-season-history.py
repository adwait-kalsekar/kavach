"""Explicit research-only EE export: 10 town-centre grids, 32 matched monsoons.
Run with --run after verifying project daily EECU quota. No tasks, map tiles,
recurring jobs, retries or API/runtime permissions are created.
"""
import argparse,datetime,json,subprocess
from pathlib import Path
P='kavach-farmers-market-sense'
REGIONS=[('latur','Latur',18.4088,76.5604),('beed','Beed',18.9891,75.7601),('nanded','Nanded',19.1383,77.3210),('dharashiv','Dharashiv / Osmanabad',18.1861,76.0419),('parbhani','Parbhani',19.2608,76.7748),('hingoli','Hingoli',19.7174,77.1494),('jalna','Jalna',19.8410,75.8864),('sambhajinagar','Chhatrapati Sambhajinagar / Aurangabad',19.8762,75.3433),('solapur','Solapur',17.6599,75.9064),('ahilyanagar','Ahilyanagar / Ahmednagar',19.0948,74.7480)]
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--run',action='store_true');a=ap.parse_args()
 if not a.run:print('PLAN: one CHIRPS query; 10 fixed illustrative town-centre locations; June–September 1991–2020 + 2023 + 2026. No cloud calls.');raise SystemExit()
 import ee
 from google.oauth2.credentials import Credentials
 token=subprocess.check_output(['gcloud','auth','print-access-token'],text=True).strip()
 ee.Initialize(credentials=Credentials(token),project=P)
 ee.data.setDeadline(120000);ee.data.setMaxRetries(0)
 rain=ee.ImageCollection('UCSB-CHC/CHIRPS/V3/DAILY_RNL').select('precipitation')
 points=ee.FeatureCollection([ee.Feature(ee.Geometry.Point([lon,lat]),{'regionId':key,'name':label,'latitude':lat,'longitude':lon}) for key,label,lat,lon in REGIONS])
 rows=[]
 years=[*range(1991,2021),2023,2026]
 for year in years:
  images=rain.filterDate(f'{year}-06-01',f'{year}-10-01')
  totals=images.sum().rename(f'rain_{year}').addBands(images.count().rename(f'days_{year}'))
  rows.append(totals)
 # One multiband reduction avoids concurrent per-year aggregation fanout.
 result=ee.Image.cat(rows).reduceRegions(collection=points,reducer=ee.Reducer.first(),scale=5566,crs=rain.first().projection()).getInfo()
 features=[]
 for feature in result['features']:
  p=feature['properties']
  for year in years:
   features.append({**{k:p[k] for k in ['regionId','name','latitude','longitude']},'year':year,'expectedDays':122,'validDays':p.get(f'days_{year}'),'precipitation':p.get(f'rain_{year}')})
 for f in features:
  if f.get('validDays')!=122 or not isinstance(f.get('precipitation'),(int,float)) or f['precipitation']<0:raise ValueError('Incomplete/invalid rainfall: '+str(f))
 out={'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'product':'UCSB-CHC/CHIRPS/V3/DAILY_RNL','scope':'approximate-town-centre-grid-not-district-or-field','resolutionMetres':5566,'period':'June 1–September 30; 122 days each year','baseline':'1991–2020','selection':'Baseline years plus 2023 and current 2026; highlighted historical examples 2002, 2009, 2015, 2023. Not all ENSO events and not a causal study.','rows':features}
 target=Path('.data/research/climate/chirps-ten-region-history.json');target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(out,indent=2)+'\n')
 print(json.dumps({'rows':len(features),'regions':len(REGIONS),'path':str(target)}))
