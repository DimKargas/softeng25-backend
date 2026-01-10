const express = require("express");
const router = express.Router();
const db = require("../db");
const errorResponse = require("../utils/errorResponse");

router.post("/", async (req, res) => {
  try {
    const {
      pointid,
      starttime,
      endtime,
      startsoc,
      endsoc,
      totalkwh,
      kwhprice,
      amount
    } = req.body;

    // Required fields

    if (
      pointid === undefined ||
      !starttime ||
      !endtime ||
      startsoc === undefined ||
      endsoc === undefined ||
      totalkwh === undefined ||
      kwhprice === undefined ||
      amount === undefined
    ) {
      return errorResponse(
        req,
        res,
        400,
        "Missing required fields",
        "All fields are mandatory"
      );
    }

    // Numeric validation
    
    if (
      typeof pointid !== "number" ||
      typeof startsoc !== "number" ||
      typeof endsoc !== "number" ||
      typeof totalkwh !== "number" ||
      typeof kwhprice !== "number" ||
      typeof amount !== "number"
    ) {
      return errorResponse(
        req,
        res,
        400,
        "Invalid data types",
        "Numeric fields must be numbers"
      );
    }

    // Validate starttime and endtime
    const startDate = new Date(starttime);
    const endDate = new Date(endtime);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return errorResponse(
        req,
        res,
        400,
        "Invalid date/time",
        "starttime and endtime must be valid date-time strings (YYYY-MM-DD HH:MM)"
      );
    }
    if (endDate <= startDate) {
      return errorResponse(
        req,
        res,
        400,
        "Invalid time range",
        "endtime must be after starttime"
      );
    }

    // Check for active session (overlapping time)
    const [activeSessions] = await db.query(
      `SELECT session_id FROM session WHERE pointid = ? AND ((starttime <= ? AND endtime > ?) OR (starttime < ? AND endtime >= ?))`,
      [pointid, starttime, starttime, endtime, endtime]
    );
    if (activeSessions.length > 0) {
      return errorResponse(
        req,
        res,
        409,
        "Active session exists",
        "There is already an active session for this point in the given time range"
      );
    }


    // Business rules
    
    if (startsoc < 0 || startsoc > 100 || endsoc < 0 || endsoc > 100) {
      return errorResponse(
        req,
        res,
        400,
        "Invalid SOC values",
        "SOC must be between 0 and 100"
      );
    }

    if (endsoc < startsoc) {
      return errorResponse(
        req,
        res,
        400,
        "Invalid SOC range",
        "endsoc must be greater than or equal to startsoc"
      );
    }

    if (totalkwh <= 0 || kwhprice <= 0 || amount < 0) {
      return errorResponse(
        req,
        res,
        400,
        "Invalid charging values",
        "Energy and price must be positive"
      );
    }

    
    // Check point exists

    const [rows] = await db.query(
      "SELECT pointid FROM point WHERE pointid = ?",
      [pointid]
    );
    const point = rows[0];
    if (!point) {
      return errorResponse(
        req,
        res,
        404,
        "Charge point not found",
        `Point ${pointid} does not exist`
      );
    }

    
    // Insert session
    await db.query(
      `INSERT INTO session (pointid, starttime, endtime, startsoc, endsoc, totalkwh, kwhprice, amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [pointid, starttime, endtime, startsoc, endsoc, totalkwh, kwhprice, amount]
    );
    // Success (200, empty)
    return res.status(200).end();

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
});

module.exports = router;
