
const express = require("express");
const router = express.Router();
const db = require("../db");
const errorResponse = require("../utils/errorResponse");

// Update a charge point's status and/or kwhprice
router.post("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, kwhprice } = req.body;

    // 1. Validate ID
    if (isNaN(id)) {
      return errorResponse(
        req,
        res,
        400,
        "Invalid point id",
        "Point id must be numeric"
      );
    }

    // 2. Validate body
    if (status === undefined && kwhprice === undefined) {
      return errorResponse(
        req,
        res,
        400,
        "Invalid request body",
        "At least one field (status or kwhprice) must be provided"
      );
    }

    // 3. Status validation
    const allowedStatus = [
      "available",
      "charging",
      "reserved",
      "malfunction",
      "offline"
    ];
    if (status !== undefined && !allowedStatus.includes(status)) {
      return errorResponse(
        req,
        res,
        400,
        "Invalid status value",
        `Allowed values: ${allowedStatus.join(", ")}`
      );
    }

    // 4. Price validation
    if (
      kwhprice !== undefined &&
      (typeof kwhprice !== "number" || kwhprice <= 0)
    ) {
      return errorResponse(
        req,
        res,
        400,
        "Invalid kwhprice value",
        "kwhprice must be a positive number"
      );
    }

    // 5. Check if point exists
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
        `No charge point with id ${id}`
      );
    }

    // 6. Build dynamic update
    const updates = [];
    const values = [];
    let oldStatus = point.status;
    let statusChanged = false;
    if (status !== undefined) {
      updates.push("status = ?");
      values.push(status);
      if (status !== oldStatus) statusChanged = true;
    }
    if (kwhprice !== undefined) {
      updates.push("kwhprice = ?");
      values.push(kwhprice);
    }
    values.push(id);

    // 7. Execute update
    await db.query(
      `UPDATE point SET ${updates.join(", ")} WHERE pointid = ?`,
      values
    );

    // 7b. Insert into status_history if status changed
    if (statusChanged) {
      await db.query(
        `INSERT INTO status_history (pointid, old_state, new_state) VALUES (?, ?, ?)` ,
        [id, oldStatus, status]
      );
    }

    // 8. Respond with updated values
    return res.status(200).json({
      pointid: id,
      status: status ?? point.status,
      kwhprice: kwhprice ?? point.kwhprice
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