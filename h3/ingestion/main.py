#%%
import h3
import psycopg2 as p2
import rasterio as rio
import matplotlib.pyplot as plt
import pyproj.transformer as pt
import os
import numpy as np

#%%
thisDir = os.getcwd()
dataDir = os.path.join(thisDir, '..', 'data')
fileName = "heatmap_clipped.tif"
fileFullPath = os.path.join(dataDir, fileName)

# %% reading data
fh = rio.open(fileFullPath)
data = fh.read(1)

#%% parsing raw data into cells

rows12 = []
transformer = pt.Transformer.from_proj(fh.crs, 'EPSG:4326')
res0 = 12

for r, row in enumerate(data):
    print(f"row {r}/{len(data)}")
    for c, val in enumerate(row):
        x, y = fh.xy(r, c)
        lat, lon = transformer.transform(x, y)
        cell = h3.latlng_to_cell(lat, lon, res0)
        rows12.append((cell, val))


# %% inserting data into lowest resolution table

"""
CREATE TABLE IF NOT EXISTS public.heat12 (
    index bigint NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1 ),
    h3index h3index NOT NULL,
    "time" date,
    value integer,
    CONSTRAINT heat12_pkey PRIMARY KEY (index)
)
"""


queryString = "insert into public.heat12 (h3index, time, value) values "
rowStrings = [f"('{row[0]}', TO_DATE('30/03/2023', 'DD/MM/YYYY'), {row[1]})" for row in rows12]
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


#%% filling parent-tables with aggregated data
queryString = """
insert into heat11 (h3index, time, value)
select slct.pidx as h3index, TO_DATE('30/03/2023', 'DD/MM/YYYY') as time, slct.val as value
from (
	select round(avg(h12.value)) as val, h3_cell_to_parent(h12.h3index, 11) as pidx
	from heat12 as h12
	group by pidx
) as slct;
"""
cursor.execute(queryString)
conn.commit()

queryString = """
insert into heat10 (h3index, time, value)
select slct.pidx as h3index, TO_DATE('30/03/2023', 'DD/MM/YYYY') as time, slct.val as value
from (
	select round(avg(h11.value)) as val, h3_cell_to_parent(h11.h3index, 10) as pidx
	from heat11 as h11
	group by pidx
) as slct;
"""
cursor.execute(queryString)
conn.commit()

queryString = """
insert into heat9 (h3index, time, value)
select slct.pidx as h3index, TO_DATE('30/03/2023', 'DD/MM/YYYY') as time, slct.val as value
from (
	select round(avg(h10.value)) as val, h3_cell_to_parent(h10.h3index, 9) as pidx
	from heat10 as h10
	group by pidx
) as slct;
"""
cursor.execute(queryString)
conn.commit()

queryString = """
insert into heat8 (h3index, time, value)
select slct.pidx as h3index, TO_DATE('30/03/2023', 'DD/MM/YYYY') as time, slct.val as value
from (
	select round(avg(h9.value)) as val, h3_cell_to_parent(h9.h3index, 8) as pidx
	from heat9 as h9
	group by pidx
) as slct;
"""
cursor.execute(queryString)
conn.commit()

#%%
conn.close()


# %%
