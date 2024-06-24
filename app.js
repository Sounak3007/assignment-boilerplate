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

app.use(express.static(path.join(__dirname, "public")));

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
  const loomLink = "https://www.loom.com/share/5be972b25d2d4e19a22174808a093ba1?sid=4275fc71-741a-442d-9e90-cd0c3066ef23";
  const githubLink = "https://github.com/Sounak3007/assignment-boilerplate.git";

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Snaptrude Assignment Submission</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');

        body {
          font-family: 'Roboto', sans-serif;
          background: url('/kubernetes-cover.png') no-repeat center center fixed;
          background-size: cover;
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          transition: background-color 0.5s;
        }

        body::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: inherit;
          filter: blur(10px);
          z-index: -1;
        }

        .container {
          background: rgba(255, 255, 255, 0.85);
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 0 15px rgba(0, 0, 0, 0.15);
          text-align: center;
          max-width: 90%;
          width: 400px;
          animation: fadeIn 1.5s ease-in-out;
          position: relative;
          z-index: 1;
        }

        h1 {
          color: #333;
          margin-bottom: 20px;
          font-size: 2em;
        }

        p {
          font-size: 1.1em;
          color: #555;
          margin: 10px 0;
          word-wrap: break-word;
        }

        a {
          color: #007bff;
          text-decoration: none;
          font-weight: bold;
        }

        a:hover {
          text-decoration: underline;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .icon {
          width: 50px;
          height: 50px;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <img src="/img/snaptrude.ico" class="icon" alt="Snaptrude Icon"/>
        <h1>Snaptrude Assignment Submission</h1>
        <p>GitHub repo link - <a href="${githubLink}" target="_blank">${githubLink}</a></p>
        <p>Code Video Description - <a href="${loomLink}" target="_blank">${loomLink}</a></p>
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
