const express = require("express");
const router = express.Router();
const db = require("../db");
const fs = require("fs");
const multer = require("multer");
const csv = require("csv-parser");
const errorResponse = require("../utils/errorResponse");

// hardwired path για resetpoints (χρησιμοποιούμε το parts1234.json)
const POINTS_FILE = "./parts1234.json";

// multer setup για csv upload
const upload = multer({ dest: "uploads/" });


// GET /admin/healthcheck

router.get("/healthcheck", async (req, res) => {
  try {

    const [totalRows] = await db.query(
      "SELECT COUNT(*) AS total FROM point"
    );
    const [onlineRows] = await db.query(
      "SELECT COUNT(*) AS online FROM point WHERE status != 'offline'"
    );
    const [offlineRows] = await db.query(
      "SELECT COUNT(*) AS offline FROM point WHERE status = 'offline'"
    );

    return res.status(200).json({
      status: "OK",
      dbconnection: "MariaDB",
      n_charge_points: totalRows[0].total,
      n_charge_points_online: onlineRows[0].online,
      n_charge_points_offline: offlineRows[0].offline
    });

  } catch (err) {
    return errorResponse(
      req,
      res,
      400,
      "Database connection failed",
      err.message
    );
  }
});




// Νέα υλοποίηση resetpoints
router.post("/resetpoints", async (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(POINTS_FILE, "utf8"));

    // Διαγραφή όλων των δεδομένων
    await db.query("DELETE FROM session");
    await db.query("DELETE FROM status_history");
    await db.query("DELETE FROM point");
    await db.query("DELETE FROM provider");

    // Εισαγωγή provider(s) από το JSON
    // Υποθέτουμε ότι κάθε loc έχει provider info (id, name)
    const providerMap = new Map();
    let foundProvider = false;
    for (const loc of data) {
      if (loc.provider_id && !providerMap.has(loc.provider_id)) {
        await db.query(
          "INSERT INTO provider (id, providerName) VALUES (?, ?)",
          [loc.provider_id, loc.provider_name || loc.name || "Default Provider"]
        );
        providerMap.set(loc.provider_id, true);
        foundProvider = true;
      }
    }

    // Fallback: αν δεν βρέθηκε κανένας provider, εισάγουμε έναν με id=1
    if (!foundProvider) {
      await db.query(
        "INSERT INTO provider (id, providerName) VALUES (?, ?)",
        [1, "Default Provider"]
      );
    }

    // Εισαγωγή points με σωστό provider_id
    for (const loc of data) {
      const providerId = loc.provider_id || 1;
      for (const st of loc.stations) {
        for (const out of st.outlets) {
          await db.query(
            "INSERT INTO point (pointid, name, address, lon, lat, status, cap, provider_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [out.id, loc.name, loc.address || null, loc.longitude, loc.latitude, (out.status || '').toLowerCase() || 'available', out.kilowatts || 22, providerId]
          );
        }
      }
    }

    return res.status(200).end();
  } catch (err) {
    return errorResponse(
      req,
      res,
      500,
      "Reset points failed",
      err.message
    );
  }
});


// POST /admin/addpoints
router.post("/addpoints", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(
        req,
        res,
        400,
        "No file uploaded",
        "CSV file is required"
      );
    }

    const rows = [];
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", async () => {
        try {
          // Χάρτες για αποφυγή διπλοεγγραφών
          const locationMap = new Map();
          const stationMap = new Map();

          for (const p of rows) {
            // Ανάλογα με τα πεδία του csv
            const locationId = p.location_id || p.locationId || p.loc_id || p.locid;
            const locationName = p.location_name || p.locationName || p.loc_name || p.name;
            const longitude = p.longitude;
            const latitude = p.latitude;
            const address = p.address || null;

            const stationId = p.station_id || p.stationId || p.st_id || p.stid;
            const networkId = p.network_id || p.networkId || null;

            const outletId = p.outlet_id || p.outletId || p.id || p.outid;
            const connector = p.connector || null;
            const kilowatts = p.kilowatts || null;
            const status = (p.status || '').toLowerCase() || 'available';

            // Εισαγωγή Location αν δεν υπάρχει
            if (locationId && !locationMap.has(locationId)) {
              await db.query(
                "INSERT IGNORE INTO Location (id, name, longitude, latitude, address) VALUES (?, ?, ?, ?, ?)",
                [locationId, locationName, longitude, latitude, address]
              );
              locationMap.set(locationId, true);
            }

            // Εισαγωγή station αν δεν υπάρχει
            if (stationId && !stationMap.has(stationId)) {
              await db.query(
                "INSERT IGNORE INTO station (id, location_id, network_id) VALUES (?, ?, ?)",
                [stationId, locationId, networkId]
              );
              stationMap.set(stationId, true);
            }

            // Εισαγωγή point
            if (outletId) {
              await db.query(
                "INSERT IGNORE INTO point (pointid, name, address, lon, lat, status, cap, provider_id) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
                [outletId, locationName, address, longitude, latitude, status, kilowatts || 22]
              );
            }
          }

          return res.status(200).end();

        } catch (err) {
          return errorResponse(
            req,
            res,
            500,
            "Add points failed",
            err.message
          );
        }
      });

  } catch (err) {
    return errorResponse(
      req,
      res,
      500,
      "Add points failed",
      err.message
    );
  }
});

module.exports = router;
