const express = require("express");
const router = express.Router();
const errorResponse = require("../utils/errorResponse");
const db = require("../db");

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return errorResponse(
        req,
        res,
        400,
        "Invalid point id",
        "Point id must be a number"
      );
    }

    const [rows] = await db.query(
      `SELECT 
        point.pointid AS pointid,
        point.lon AS lon,
        point.lat AS lat,
        point.status AS status,
        point.cap AS cap,
        provider.providerName AS providerName,
        point.kwhprice AS kwhprice,
        point.reservationendtime AS reservationendtime
      FROM point
      JOIN provider ON point.provider_id = provider.id
      WHERE point.pointid = ?`,
      [id]
    );
    const point = rows[0];

    if (!point) {
      return errorResponse(
        req,
        res,
        404,
        "Charging point not found",
        `No charging point with id ${id}`
      );
    }

      // Always return reservationendtime from DB, formatted for Greece timezone (UTC+2/UTC+3)
      let reservationEndTime;
      if (point.reservationendtime) {
        const dt = new Date(point.reservationendtime);
        // Adjust for Greece timezone (UTC+2 winter, UTC+3 summer)
        dt.setHours(dt.getHours() + 2); // Use +2 for simplicity
        reservationEndTime = isNaN(dt.getTime()) ? point.reservationendtime : dt.toISOString().slice(0, 16).replace("T", " ");
      } else {
        const now = new Date();
        now.setHours(now.getHours() + 2);
        reservationEndTime = now.toISOString().slice(0, 16).replace("T", " ");
      }

    res.status(200).json({
      pointid: point.pointid,
      lon: point.lon,
      lat: point.lat,
      status: point.status,
      cap: point.cap,
      reservationendtime: reservationEndTime,
      kwhprice: point.kwhprice
    });
  } catch (err) {
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
