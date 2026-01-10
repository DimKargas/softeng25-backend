const express = require("express");
const router = express.Router();
const db = require("../db");
const errorResponse = require("../utils/errorResponse");


async function handleReservation(req, res, id, minutes) {
  try {
    const [rows] = await db.query(
      `SELECT 
        point.pointid AS pointid,
        point.status AS status
      FROM point
      WHERE point.pointid = ?`,
      [id]
    );
    const point = rows[0];
    if (!point) {
      return errorResponse(
        req,
        res,
        404,
        "Point not found",
        `Charge point ${id} does not exist`
      );
    }

    // Έλεγχος κατάστασης
    if (point.status !== "available") {
      return res.status(200).json({
        pointid: id,
        status: point.status,
        reservationendtime: "1970-01-01 00:00"
      });
    }

    // Υπολογισμός χρόνου (Greece timezone UTC+2)
    const now = new Date();
    now.setHours(now.getHours() + 2); // Adjust to Greece time
    const endTime = new Date(now.getTime() + minutes * 60000);
    const formatDate = (d) => d.toISOString().slice(0, 16).replace("T", " ");
    const reservationEnd = formatDate(endTime);

    // Update ΒΔ
    await db.query(
      `UPDATE point
       SET status = 'reserved', reservationendtime = ?
       WHERE pointid = ?`,
      [reservationEnd, id]
    );

    // Καταγραφή μεταβολής κατάστασης
    await db.query(
      `INSERT INTO status_history (pointid, old_state, new_state) VALUES (?, ?, ?)` ,
      [id, point.status, 'reserved']
    );

    // Response (SUCCESS)
    return res.status(200).json({
      pointid: id,
      status: "reserved",
      reservationendtime: reservationEnd
    });
  } catch (err) {
    console.error(err);
    return errorResponse(
      req,
      res,
      500,
      "Internal server error",
      err.message
    );
  }
}

// POST /:id (default 30 minutes)
router.post("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return errorResponse(
      req,
      res,
      400,
      "Invalid point id",
      "Point id must be numeric"
    );
  }
  let minutes = 30;
  return handleReservation(req, res, id, minutes);
});

// POST /:id/:minutes
router.post("/:id/:minutes", async (req, res) => {
  const id = parseInt(req.params.id);
  const minutesParam = req.params.minutes;
  if (isNaN(id)) {
    return errorResponse(
      req,
      res,
      400,
      "Invalid point id",
      "Point id must be numeric"
    );
  }
  let minutes = 30;
  if (minutesParam !== undefined) {
    minutes = parseInt(minutesParam);
    if (isNaN(minutes) || minutes <= 0) {
      return errorResponse(
        req,
        res,
        400,
        "Invalid minutes parameter",
        "Minutes must be a positive number"
      );
    }
    minutes = Math.min(minutes, 60);
  }
  return handleReservation(req, res, id, minutes);
});
module.exports = router;

