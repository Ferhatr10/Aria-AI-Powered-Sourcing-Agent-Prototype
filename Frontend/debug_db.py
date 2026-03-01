import psycopg2
import os
import requests
import json

DB_CONFIG = {
    "dbname": "rfq_db",
    "user": "postgres",
    "password": "postgres",
    "host": "localhost"
}

def check():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # 1. Check if location column is populated
        cur.execute("SELECT name, lat, lng, location FROM suppliers WHERE location IS NOT NULL LIMIT 2;")
        rows = cur.fetchall()
        print(f"Suppliers with location: {len(rows)}")
        for r in rows:
            print(f"  Name: {r[0]}, Lat: {r[1]}, Lng: {r[2]}, Location: {r[3]}")
            
        # 2. Test Geocoding
        city = "Istanbul"
        url = "https://nominatim.openstreetmap.org/search"
        headers = {"User-Agent": "Aria-Sourcing-Agent/1.0"}
        params = {"q": city, "format": "json", "limit": 1}
        resp = requests.get(url, headers=headers, params=params)
        data = resp.json()
        if data:
            lat, lon = float(data[0]["lat"]), float(data[0]["lon"])
            print(f"Geocoding {city}: {lat}, {lon}")
            
            # 3. Test Distance SQL
            cur.execute("""
                SELECT name, ST_Distance(location, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography) / 1000.0 as dist
                FROM suppliers 
                WHERE location IS NOT NULL 
                LIMIT 2;
            """, (lon, lat))
            dist_rows = cur.fetchall()
            for dr in dist_rows:
                print(f"  Supplier: {dr[0]}, Calculated Dist: {dr[1]} KM")
        else:
            print("Geocoding failed.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check()
