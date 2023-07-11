#%% 
from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2 as p2
import h3


#%% database-api
def fetchCells(bbox, resolution):
    resolution = int(float(resolution))
    conn = p2.connect(
        host     = "db",
        port     = 5432,
        database = "heat",
        user     = "postgres",
        password = "postgres"
    )
    cursor = conn.cursor()

    # point, box: psql-native types != st_point, st_polygon.
    # weirdly, h3_cell_to_lat_lng returns point(lon, lat) ...
    lonMin, latMin, lonMax, latMax = bbox
    cursor.execute(f"""
        select h.*
        from heat{resolution} as h
        where h3_cell_to_lat_lng(h.h3index) <@ box(point '({lonMin}, {latMin})', point '({lonMax}, {latMax})');
    """)
    data = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return data


#%% rest-api

app = Flask(__name__)
CORS(app)

@app.route('/')
def base():
    return jsonify({ "message": "hello!" })

@app.route('/getData', methods=["GET"])
def getData():
    # example: http://localhost:5000/getData?resolution=9&bbox=11.35,48.03,11.81,48.20
    args = request.args
    resolution = args.get("resolution")
    bboxStr = args.get("bbox")
    bbox = [float(e) for e in bboxStr.split(",")]
    data = fetchCells(bbox, resolution)
    return jsonify(data)


@app.route('/getResolved', methods=["GET"])
def getResolved():
    args = request.args
    resolution = args.get("resolution")
    bboxStr = args.get("bbox")
    bbox = [float(e) for e in bboxStr.split(",")]
    data = fetchCells(bbox, resolution)
    resolved = [
        { "coords": h3.cell_to_latlng(entry[1]),  "value": entry[3] }
        for entry in data
    ]
    return jsonify(resolved)

# %%
if __name__ == "__main__":
    app.run(debug=True)