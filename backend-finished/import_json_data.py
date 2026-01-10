import json
import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME', 'ev_charging_db')
}

def import_json():
    try:
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        
        json_path = os.path.join(os.path.dirname(__file__), 'parts1234.json')
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        print("Φόρτωση δεδομένων από το JSON...")

        for loc in data:
            # Στοιχεία από το επίπεδο της τοποθεσίας
            loc_name = loc.get('name')
            loc_addr = loc.get('address')
            lat = loc.get('latitude')
            lon = loc.get('longitude')
            
            for st in loc.get('stations', []):
                for out in st.get('outlets', []):
                    # Αντιστοίχιση PointID
                    pid = out.get('id')
                    
                    # Καθαρισμός Status
                    raw_s = out.get('status')
                    status = str(raw_s).lower() if raw_s else 'available'
                    if status not in ['available', 'charging', 'reserved', 'malfunction', 'offline']:
                        status = 'available'
                    
                    # Υπολογισμός Ισχύος (Cap)
                    cap = out.get('power') or out.get('kilowatts') or 22
                    
                    sql = """
                        INSERT IGNORE INTO point (pointid, name, address, lon, lat, status, cap, provider_id) 
                        VALUES (%s, %s, %s, %s, %s, %s, %s, 1)
                    """
                    cursor.execute(sql, (pid, loc_name, loc_addr, lon, lat, status, cap))

        conn.commit()
        print("Το JSON αξιοποιήθηκε πλήρως!")
    except Exception as e:
        print(f"Σφάλμα: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    import_json()