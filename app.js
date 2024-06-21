const express = require("express");
const app = express();
const cors = require("cors");
const logger = require("morgan");
const favicon = require("serve-favicon");
const path = require("path");

app.use(cors());
app.use(logger("dev"));
app.use(express.json({ limit: "512mb" }));
app.use(express.urlencoded({ limit: "512mb", extended: false }));
app.use(favicon(path.join(__dirname, "public", "img", "snaptrude.ico")));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
    return res.status(200).json({});
  }
  next();
});

// Define a route handler for the root path ("/")
app.get("/", (req, res) => {
  res.redirect("https://www.loom.com/share/fa99f6cd673c4a3aa03810246dc7569c?sid=541faa81-4da5-4c09-8e8d-9b15df5556c4");
});

const routes = require("./routes");
app.use("/", routes);

app.use((req, res, next) => {
  const error = new Error("Not Found");
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 500).json({
    error: {
      message: error.message,
    },
  });
});

module.exports = app;
