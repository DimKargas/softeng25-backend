const express = require("express");
const router = express.Router();
const errorResponse = require("../utils/errorResponse");
const { toCSV } = require("../utils/csv");
const db = require("../db");

const ALLOWED_STATUS = [
  "available",
  "charging",
  "reserved",
  "malfunction",
  "offline"
];
router.get("/", async (req, res) => {
  try {
    const { status, format } = req.query;

    // invalid status → 400 
    if (status && !ALLOWED_STATUS.includes(status)) {
      return errorResponse(
        req,
        res,
        400,
        "Invalid status parameter",
        `Allowed values: ${ALLOWED_STATUS.join(", ")}`
      );
    }

    let query = `SELECT 
      provider.providerName AS providerName,
      point.pointid AS pointid,
      point.lon AS lon,
      point.lat AS lat,
      point.status AS status,
      point.cap AS cap
    FROM point
    JOIN provider ON point.provider_id = provider.id`;
    let params = [];
    if (status) {
      query += " WHERE point.status = ?";
      params.push(status);
    }

    const [rows] = await db.query(query, params);

    if (!rows || rows.length === 0) {
      return res.sendStatus(204);
    }

    if (format && format.toLowerCase() === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      return res.status(200).send(toCSV(rows));
    }

    // 200 success (default json)
    return res.status(200).json(rows);
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
