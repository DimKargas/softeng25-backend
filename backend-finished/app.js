

const express = require("express");
const fs = require("fs");
const https = require("https");
const path = require("path");
const app = express();



// Parse JSON bodies
app.use(express.json());


// Custom error handler for invalid JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(
      req,
      res,
      400,
      "Invalid JSON",
      err.message
    );
  }
  next();
});



// All API routes under /api
app.use("/api/points", require("./routes/points"));
app.use("/api/point", require("./routes/point"));
app.use("/api/reserve", require("./routes/reserve"));
app.use("/api/updpoint", require("./routes/updpoint"));
app.use("/api/newsession", require("./routes/newsession"));
app.use("/api/sessions", require("./routes/sessions"));
app.use("/api/pointstatus", require("./routes/pointstatus"));
app.use("/api/admin", require("./routes/admin"));




// Custom 404 handler for all unmatched routes
const errorResponse = require("./utils/errorResponse");
app.use((req, res) => {
  errorResponse(req, res, 404, "Not found", "Endpoint does not exist");
});



const PORT = 9876;
const keyPath = path.join(__dirname, 'key.pem');
const certPath = path.join(__dirname, 'cert.pem');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
  https.createServer(options, app).listen(PORT, () => {
    console.log(`\x1b[32mHTTPS server running on https://localhost:${PORT}/api\x1b[0m`);
    console.log('Για να συνδεθείτε αγνοήστε το browser warning (λόγω self-signed πιστοποιητικού).');
  });
} else {
  app.listen(PORT, () => {
    console.log(`\x1b[33mServer running on http://localhost:${PORT} (no SSL certs found)\x1b[0m`);
    console.log('Για HTTPS, δημιουργήστε key.pem και cert.pem όπως περιγράφεται στο GENERATE_CERTIFICATE.txt');
  });
}
