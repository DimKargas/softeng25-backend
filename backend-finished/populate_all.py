import random
import datetime
import mysql.connector
import os
from faker import Faker
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
fake = Faker('el_GR')

config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME', 'ev_charging_db')
}

def run_seeder():
    try:
        db = mysql.connector.connect(**config)
        cursor = db.cursor(dictionary=True)
        print("🇬🇷 Ξεκινάω το γέμισμα με τους Admins και τους Έλληνες χρήστες...")

        
        admins = [
            ('nekil', 'admin123', 'nil@ev.gr', 'Νεκτάριος', 'Ηλιόπουλος', '6911111111', 'admin', 'Athens'),
            ('dimkar', 'admin456', 'kar@ev.gr', 'Δημήτρης', 'Κάργας', '6922222222', 'admin', 'Athens'),
            ('christos_lasdas', 'lasdas123', 'lasdas@ev.gr', 'Χρήστος', 'Λάσδας', '6933333333', 'admin', 'Athens'),
            ('evdokia_kav', 'evdokia456', 'kavvada@ev.gr', 'Ευδοκία', 'Καββαδά', '6944444444', 'admin', 'Athens')
        ]
        
        sql_user = """INSERT IGNORE INTO user (username, password, email, name, surname, phone_number, role, address) 
                      VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""
        
        cursor.executemany(sql_user, admins)

        # 30 ΔΟΚΙΜΑΣΤΙΚΟΙ 
        for _ in range(30):
            fn, ln = fake.first_name(), fake.last_name()
            cursor.execute(sql_user, (f"{fn.lower()}{random.randint(1,99)}", "pass123", f"{fn.lower()}@example.gr", fn, ln, f"69{random.randint(10000000, 99999999)}", "user", fake.address().replace('\n', ', ')))

        # ΟΧΗΜΑΤΑ
        cursor.execute("SELECT id FROM user")
        u_ids = [r['id'] for r in cursor.fetchall()]
        v_list = []
        for uid in u_ids:
            plate = f"{''.join(random.choices('ABEZHIKMNOTYPXY', k=3))}-{random.randint(1000, 9999)}"
            v_list.append((uid, random.choice(['Tesla', 'Hyundai', 'Nissan', 'VW']), 'Electric-Model', plate))
        cursor.executemany("INSERT IGNORE INTO vehicle (user_id, brand, model, license_plate) VALUES (%s, %s, %s, %s)", v_list)

        # SESSIONS & HISTORY
        cursor.execute("SELECT pointid, kwhprice FROM point")
        pts = cursor.fetchall()
        cursor.execute("SELECT id, user_id FROM vehicle")
        vhls = cursor.fetchall()

        if not pts:
            print("Προσοχή: Δεν βρέθηκαν points. Τρέξε πρώτα το import_json_data.py!")
            return

        for _ in range(60):
            p, v = random.choice(pts), random.choice(vhls)
            start = fake.date_time_between(start_date="-60d", end_date="now")
            end = start + datetime.timedelta(minutes=random.randint(30, 150))
            kwh = round(random.uniform(10, 45), 2)
            
            cursor.execute("""
                INSERT INTO session (pointid, user_id, vehicle_id, starttime, endtime, startsoc, endsoc, totalkwh, kwhprice, amount)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (p['pointid'], v['user_id'], v['id'], start, end, random.randint(5, 20), random.randint(80, 95), kwh, p['kwhprice'], round(kwh * p['kwhprice'], 2)))

            cursor.execute("INSERT INTO status_history (pointid, timeref, old_state, new_state) VALUES (%s, %s, %s, %s)", (p['pointid'], start, 'available', 'charging'))

        db.commit()
        print(f"Η βάση είναι έτοιμη με {len(admins)} Admins και 30 χρήστες!")
    except Exception as e:
        print(f"Σφάλμα: {e}")
    finally:
        if 'db' in locals() and db.is_connected():
            db.close()

if __name__ == "__main__":
    run_seeder()