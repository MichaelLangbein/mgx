#%%
from dotenv import dotenv_values
from landsatxplore.api import API
from landsatxplore.earthexplorer import EarthExplorer, EarthExplorerError

# %%
config = dotenv_values(".env")

# %%
api = API(config["username"], config["password"])
ee = EarthExplorer(config["username"], config["password"])

#%% configuration 

datasets = {
    "Landsat 5 TM Collection 2 Level 1":    "landsat_tm_c2_l1",
    "Landsat 5 TM Collection 2 Level 2":    "landsat_tm_c2_l2",
    "Landsat 7 ETM+ Collection 2 Level 1":  "landsat_etm_c2_l1",
    "Landsat 7 ETM+ Collection 2 Level 2":  "landsat_etm_c2_l2",
    "Landsat 8 Collection 2 Level 1":       "landsat_ot_c2_l1",
    "Landsat 8 Collection 2 Level 2":       "landsat_ot_c2_l2",
    "Landsat 9 Collection 2 Level 1":       "landsat_ot_c2_l1",
    "Landsat 9 Collection 2 Level 2":       "landsat_ot_c2_l2"
}

dataset = datasets["Landsat 8 Collection 2 Level 2"]
#  FLOAT...  Point of interest (latitude, longitude).
# location = []   
#  FLOAT...  Bounding box (xmin, ymin, xmax, ymax).
bbox = [11.214026877579727, 48.06498094193711, 11.338031979211422, 48.117561211533626]
#  INTEGER   Max. cloud cover (1-100).
clouds = 10                 
#  TEXT  Start date (YYYY-MM-DD).
start = "2022-01-01"        
#  TEXT  End date (YYYY-MM-DD).
end = "2023-01-01"          
#  [entity_id|display_id|json|csv] Output format.
output = 'json'             
# INTEGER    Max. results returned.
limit = 10               

#%%

scenes = api.search(
    dataset=dataset,
    start_date=start,
    end_date=end,
    bbox=bbox,
    max_cloud_cover=clouds,
    max_results=limit
)

#%%

for scene in scenes:
    print(f"Trying to download scene {scene['entity_id']}")
    try:
        ee.download(scene["entity_id"], output_dir="./data")
    except EarthExplorerError as e:
        print(e)


#%% Log out
api.logout()
ee.logout()