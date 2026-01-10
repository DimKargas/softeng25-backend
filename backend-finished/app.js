
const express = require("express");
const fs = require("fs");
const https = require("https");
const app = express();


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
const keyPath = __dirname + '/key.pem';
const certPath = __dirname + '/cert.pem';

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
  https.createServer(options, app).listen(PORT, () => {
    console.log(`HTTPS server running on https://localhost:${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} (no SSL certs found)`);
    console.log('To enable HTTPS, generate key.pem and cert.pem as described in GENERATE_CERTIFICATE.txt');
  });
}
