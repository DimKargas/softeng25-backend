function errorResponse(req, res, code, message, debugInfo = "") {
  return res.status(code).json({
    call: req.originalUrl,
    timeref: new Date().toISOString().slice(0, 16).replace("T", " "),
    originator: req.ip,
    return_code: code,
    error: message,
    debuginfo: debugInfo
  });
}

module.exports = errorResponse;
