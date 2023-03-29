#%%
import h3
import psycopg2 as p2
import rasterio as rio
import matplotlib.pyplot as plt
import pyproj.transformer as pt
import os

#%%
thisDir = os.getcwd()
dataDir = os.path.join(thisDir, '..', 'data')
fileName = "heatmap_clipped.tif"
fileFullPath = os.path.join(dataDir, fileName)

# %%
fh = rio.open(fileFullPath)
data = fh.read(1)

#%%

rows = []
transformer = pt.Transformer.from_proj(fh.crs, 'EPSG:4326')
res0 = 12

for r, row in enumerate(data):
    print(f"row {r}/{len(data)}")
    for c, val in enumerate(row):
        x, y = fh.xy(r, c)
        lat, lon = transformer.transform(x, y)
        cell = h3.latlng_to_cell(lat, lon, res0)
        rows.append((cell, res0, val))


# %%
queryString = "insert into public.heat (index, resolution, value) values "
rowStrings = [f"('{row[0]}', {row[1]}, {row[2]})" for row in rows]
valuesString = ", ".join(rowStrings)
queryString += valuesString
queryString += ";"

conn = p2.connect(
    host = "localhost",
    port = 54320,
    database = "heat",
    user = "postgres",
    password = "postgres"
)

cursor = conn.cursor()
cursor.execute(queryString)
conn.commit()
conn.close()

# %%
