#!/usr/bin/env python3
"""Build bounded API evidence from acquired Earth Engine/NOAA raw snapshots.
No network calls. Run explicit exporters first; source/terms/methods in docs.
"""
from pathlib import Path
import json,hashlib,datetime
ROOT=Path(__file__).resolve().parents[2]
def load(name):
 p=ROOT/'.data/research/climate'/name;return json.loads(p.read_text()),hashlib.sha256(p.read_bytes()).hexdigest()
rain,rhash=load('chirps-ten-region-history.json');surface,shash=load('era5-surface-context.json')
oniPath=ROOT/'.data/readiness/oni.txt';oni={}
for line in oniPath.read_text().splitlines()[1:]:
 p=line.split()
 if len(p)==4:oni[(int(p[1]),p[0])]=float(p[3])
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
def source(id,title,url,date,product,scope,resolution,limitation,sha):return dict(id=id,title=title,url=url,retrievedAt=date,product=product,scope=scope,resolution=resolution,limitation=limitation,sha256=sha)
rs=source('chirps-jjas-2026','CHIRPS v3 rainfall · Google Earth Engine','https://developers.google.com/earth-engine/datasets/catalog/UCSB-CHC_CHIRPS_V3_DAILY_RNL',rain['retrievedAt'],rain['product'],'Approximate town-centre grid, not district mean or field rainfall','0.05° / approximately 5.6 km','Satellite/station-based rainfall estimates; daily ERA5 partitioning. Same June–September window and product for every year. Not a forecast.',rhash)
ss=source('era5-september-2026','ERA5-Land surface moisture and air heat · Google Earth Engine','https://developers.google.com/earth-engine/datasets/catalog/ECMWF_ERA5_LAND_DAILY_AGGR',surface['retrievedAt'],surface['product'],'Modeled town-centre grid; surface soil layer 0–7 cm','Approximately 11 km','September averages, not today’s field condition or root-zone moisture. Air heat is mean daily maximum temperature, not land surface temperature.',shash)
os=source('noaa-oni','NOAA Oceanic Niño Index','https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt',now,'NOAA ONI','Pacific Niño 3.4 sea-surface temperature anomaly','Three-month average','Global climate context, not local drought probability. Selected historical examples use JJA ONI; current context uses JAS. Index baselines can be revised.',hashlib.sha256(oniPath.read_bytes()).hexdigest())
pack=[]
for s in surface['rows']:
 key=s['regionId'];rows=[r for r in rain['rows'] if r['regionId']==key]
 assert len(rows)==32 and all(r['validDays']==122 for r in rows)
 base=[r for r in rows if 1991<=r['year']<=2020];assert len(base)==30
 normal=sum(r['precipitation'] for r in base)/30
 current=next(r for r in rows if r['year']==2026)
 assert all(s[f'moistureDays_{y}']==30 and s[f'temperatureDays_{y}']==30 for y in range(1991,2021))
 pack.append({'regionId':key,'name':current['name'],'latitude':current['latitude'],'longitude':current['longitude'],'rainfall':{'source':rs,'start':'2026-06-01','end':'2026-09-30','baselineStart':1991,'baselineEnd':2020,'baselineMeanMm':normal,'totalMm':current['precipitation'],'departurePct':100*(current['precipitation']/normal-1),'completeDays':122,'baselineTotals':[{'year':r['year'],'totalMm':r['precipitation']} for r in base],'history':[{'year':r['year'],'totalMm':r['precipitation'],'departurePct':100*(r['precipitation']/normal-1),'oni':oni[(r['year'],'JJA')]} for r in rows if r['year'] in [2002,2009,2015,2023]]},'surface':{'source':ss,'start':'2026-09-01','end':'2026-09-30','moisture':s['moisture_2026'],'baselineMoisture':sum(s[f'moisture_{y}'] for y in range(1991,2021))/30,'meanDailyMaxC':s['tmaxC_2026'],'baselineDailyMaxC':sum(s[f'tmaxC_{y}'] for y in range(1991,2021))/30,'completeDays':30,'baselineMoistureTotals':[{'year':y,'value':s[f'moisture_{y}']} for y in range(1991,2021)]},'enso':{'source':os,'period':'July–September 2026 (JAS)','anomalyC':oni[(2026,'JAS')],'limitation':'El Niño is a global influence. These four historical years are selected examples, not all events or evidence of causation.'}})
target=ROOT/'apps/api/src/evidence/season-readiness/regions.json';target.write_text(json.dumps(pack,indent=2)+'\n');print('Packaged',len(pack),'regional snapshots')
