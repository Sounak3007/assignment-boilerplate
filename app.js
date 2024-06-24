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
  const loomLink = "https://www.loom.com/share/fa99f6cd673c4a3aa03810246dc7569c?sid=541faa81-4da5-4c09-8e8d-9b15df5556c4";
  const githubLink = "https://github.com/your-github-username/your-repo-name";

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Snaptrude Assignment Submission</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f8f9fa;
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        .container {
          background: #fff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          text-align: center;
        }
        h1 {
          color: #333;
        }
        p {
          font-size: 1.1em;
          color: #555;
        }
        a {
          color: #007bff;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Snaptrude Assignment Submission</h1>
        <p>GitHub repo link - <a href="${githubLink}" target="_blank">${githubLink}</a></p>
        <p>Code description recording - <a href="${loomLink}" target="_blank">${loomLink}</a></p>
      </div>
    </body>
    </html>
  `);
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
