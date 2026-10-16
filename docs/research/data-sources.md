# Data sources and API register

Reviewed 17 October 2026. Official documentation/catalog pages were consulted. No authenticated endpoint, data export, latency, quota or commercial entitlement was tested. Catalog dates are a snapshot and must be checked in ingestion.

## Recommended inputs

| Source | Intended use and characteristics | Access / constraints | Priority |
| --- | --- | --- | --- |
| [CHIRPS v3 daily ERA5-based](https://developers.google.com/earth-engine/datasets/catalog/UCSB-CHC_CHIRPS_V3_DAILY_RNL) | Historical rainfall; 1981 onward, 0.05° (~5.6 km). Daily amounts partition pentad totals using ERA5. Catalog listed through 31 August 2026 when reviewed. | Public-domain dataset via provider/Earth Engine. Not a live rainfall feed. Pin product/version and avoid mixing incompatible climatologies. | MVP historical |
| [ERA5-Land daily aggregates](https://developers.google.com/earth-engine/datasets/catalog/ECMWF_ERA5_LAND_DAILY_AGGR) | Historical temperature, modeled soil water and water-balance variables; Earth Engine catalog grid ~11 km | Reanalysis, not a field measurement. Account for publication lag, units and variable-specific caveats. | MVP historical |
| [SMAP L4 v008](https://developers.google.com/earth-engine/datasets/catalog/NASA_SMAP_SPL4SMGP_008) | Surface/root-zone modeled and assimilated moisture; 9 km, three-hourly; starts March 2015. Catalog availability listed through 13 October 2026. | Public-domain dataset/Earth Engine. Cannot supply 2002/2009 comparisons. During instrument outages, modeling continues without brightness-temperature assimilation. | Candidate recent moisture |
| [MODIS MOD13Q1 v061](https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MOD13Q1) | NDVI/EVI; 250 m, 16-day composites | Quality filtering and crop/land-use masking required. Vegetation change is not crop loss, and pre-sowing bare ground should not be labeled crop stress. | Next |
| [Open-Meteo weather API](https://open-meteo.com/en/docs) | Coordinate-based short-term rain/temperature forecasts | Public API; free hosted access limited to noncommercial use. Review [terms](https://open-meteo.com/en/terms) for production. Model outputs are not field observations. | MVP near-term |
| [Open-Meteo seasonal API](https://open-meteo.com/en/docs/seasonal-forecast-api) | ECMWF EC46 (46 days) and SEAS5 (up to 7 months), 51 members, ~36 km. EC46 daily and SEAS5 monthly updates documented. | Not bias-corrected; area-level signals, not precise village/date predictions. Some soil variables limited to EC46 horizon. Archive forecast issue times and members needed for evaluation. | Prototype outlook; validate before decisions |
| [Copernicus seasonal forecasts](https://climate.copernicus.eu/seasonal-forecasts) | Direct multi-system seasonal data and historical forecast information | CDS account/API setup, dataset terms and processing required. Useful for skill assessment and a mature pipeline. | Next |
| [NOAA CPC ENSO discussion](https://cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml) | ENSO outlook, probabilities and contextual explanation | Public pages/linked tables. Inspect current ONI/RONI definitions and products; preserve index version and release date. ENSO probabilities do not equal district drought probabilities. | MVP context |
| [IMD 0.25° rainfall](https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html) | India-specific historical rainfall benchmark, NetCDF downloads | Confirm covered years and intended-use terms. Historical availability does not establish a live public API. | Validation |
| [ICAR-CRIDA plans](https://www.icar-crida.res.in/Crop_Contingency_Plan.html) | Official district/crop contingency guidance, including Maharashtra | Documents require extraction, passage/page references, freshness checks and local agronomic review. Public access does not mean every recommendation is current. | MVP essential |
| [IMD current crop advisories](https://imdagrimet.gov.in/cropAdvisory_3.php) | Current crop-specific advice; portal states Tuesday/Friday updates | Portal/bulletin retrieval; unrestricted integration API not verified. Keep issue dates and applicability. | MVP curated subset |
| [CWC reservoir monitoring](https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2146366), [RSMS](https://rsms.cwc.gov.in/frameWork/web/public-dashboard) | Regional live-storage context; weekly bulletin process | Public dashboard/bulletins; API entitlement unverified. Map water access/catchments, not simply nearest reservoir. | Later |
| [Government crop statistics](https://data.gov.in/dataset-group-name/crop-production-statistics) | District/crop/season area and production for retrospective outcome evaluation | Catalog download/API availability and keys vary; check missing years, reporting lag, boundary changes and yield trends. | Validation |
| [geoBoundaries API](https://www.geoboundaries.org/api.html) | Administrative polygons for aggregation and coordinate lookup | Validate India district coverage/vintage, attribution, names and boundary correspondence. Cache a pinned release. | MVP geography |
| [NASA POWER daily API](https://power.larc.nasa.gov/docs/services/api/temporal/daily/), [tutorials](https://power.larc.nasa.gov/docs/tutorials/) | Convenient meteorology fallback; documented meteorology resolution 0.5° × 0.625° | Public API; too coarse to justify field-level claims. Respect service limits. | Fallback |

## Access and speech dependencies

- [Earth Engine registration/access](https://developers.google.com/earth-engine/guides/access): requires a Cloud project and registration; noncommercial eligibility/verification differs from paid commercial use. Dataset openness does not imply free processing.
- [Sarvam speech-to-text FAQ](https://docs.sarvam.ai/api/speech-to-text/faq) and [text-to-speech API](https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/rest-api): Hindi/Marathi support documented; paid/account API candidate. Benchmark dialects, crop names, dates, units and noise against the chosen Google speech implementation. No model quality claim established here.
- Gemini is the intended explanation layer from the project brief. Model/version, speech path, quotas, retention and cost still need selection and testing. WeatherNext is optional and is not required for the proposed MVP.

## Integration instructions

1. Confirm credentials, terms, endpoints and actual newest observations before promising live behavior.
2. Pin district IDs/boundaries, dataset versions and a baseline period; normalize mm/m, Kelvin/Celsius and timestamps explicitly.
3. Preserve raw metadata: dataset/version, source URL, variable, units, observation interval, forecast issue/lead time, release/retrieval times, geography/resolution and quality flags.
4. Precompute historical district features in batch. Cache current observations and forecasts separately. Serve prepared records rather than invoking heavy geospatial jobs during chat.
5. Keep historical evidence, observed conditions, reanalysis and forecasts distinguishable in schema and UI. A daily cadence is not a freshness guarantee.
6. Use all suitable historical seasons and held-out evaluation, not four handpicked ENSO years as a probability model. Track small sample sizes and confounding influences such as irrigation and IOD.
7. Avoid double-counting correlated inputs. CHIRPS v3 daily ERA5 partitioning is not independent confirmation of ERA5 daily rainfall.
8. Curate CRIDA/IMD recommendations into reviewed structured rules. Do not use unrestricted retrieval output as a production action plan.
9. Record data gaps and stale feeds; withhold dependent recommendations. Do not fabricate fallback observations.

## Remaining research / implementation gates

Actual API probes and exports; local forecast skill; agronomy review; current varieties and sowing prerequisites; applicable insurance notification/deadline sources; reliable water-access mapping; privacy and consent before real profiles. Do not claim an insurance deadline or a farmer's irrigation access from generic national information.
