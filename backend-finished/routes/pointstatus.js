const express = require("express");
const router = express.Router();
const db = require("../db");
const  errorResponse  = require("../utils/errorResponse");
const { toCSV } = require("../utils/csv");

// GET /pointstatus/:pointid/:from/:to
router.get("/:pointid/:from/:to", async (req, res) => {
  try {
    const { pointid, from, to } = req.params;
    const { format } = req.query;

    // έλεγχος pointid
    if (isNaN(pointid)) {
      return errorResponse(
        req,
        res,
        400,
        "Invalid point id",
        "Point id must be numeric"
      );
    }

    // έλεγχος ημερομηνιών YYYYMMDD και εγκυρότητας ημερολογίου
    const dateRegex = /^\d{8}$/;
    function isValidDate(str) {
      if (!dateRegex.test(str)) return false;
      const y = parseInt(str.substring(0, 4), 10);
      const m = parseInt(str.substring(4, 6), 10);
      const d = parseInt(str.substring(6, 8), 10);
      if (m < 1 || m > 12 || d < 1 || d > 31) return false;
      const dt = new Date(y, m - 1, d);
      return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
    }
    if (!isValidDate(from) || !isValidDate(to)) {
      return errorResponse(
        req,
        res,
        400,
        "Invalid date value",
        "Dates must be valid calendar dates in YYYYMMDD format"
      );
    }

    // έλεγχος ότι from < to
    const fromDateObj = new Date(from.substring(0, 4) + '-' + from.substring(4, 6) + '-' + from.substring(6, 8));
    const toDateObj = new Date(to.substring(0, 4) + '-' + to.substring(4, 6) + '-' + to.substring(6, 8));
    if (fromDateObj >= toDateObj) {
      return errorResponse(
        req,
        res,
        400,
        "Invalid date range",
        'from must be less than to'
      );
    }

    // μετατροπή ημερομηνιών σε timestamps
    const fromDate =
      from.substring(0, 4) +
      "-" +
      from.substring(4, 6) +
      "-" +
      from.substring(6, 8) +
      " 00:00";

    const toDate =
      to.substring(0, 4) +
      "-" +
      to.substring(4, 6) +
      "-" +
      to.substring(6, 8) +
      " 23:59";

    // έλεγχος αν υπάρχει point

    const [rows] = await db.query(
      "SELECT pointid AS pointid FROM point WHERE pointid = ?",
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

    // ανάκτηση μεταβολών κατάστασης
    const [rowsChanges] = await db.query(
      `SELECT timeref, old_state, new_state
       FROM status_history
       WHERE pointid = ? AND timeref >= ? AND timeref <= ?
       ORDER BY timeref DESC`,
      [pointid, fromDate, toDate]
    );
    // Format timeref as 'YYYY-MM-DD HH:MM'
    const formatDate = (d) => {
      if (!d) return d;
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return d;
      return dt.toISOString().slice(0, 16).replace('T', ' ');
    };
    const formattedChanges = rowsChanges.map(row => ({
      ...row,
      timeref: formatDate(row.timeref)
    }));

    if (formattedChanges.length === 0) {
      return res.status(204).end();
    }

    if ((format && format.toLowerCase() === "csv")) {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      return res.status(200).send(toCSV(formattedChanges));
    }

    return res.status(200).json(formattedChanges);

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
