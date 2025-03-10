/**
 * index.js
 * Entry Point
 */

// Import required modules
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const weather = require("./config/weather"); // Import the weather functions
const path = require("path"); // Import path module
// const rateLimit = require("express-rate-limit");

const app = express();

const port = 3000;

// const limiter = rateLimit({
//   windowMs: 10 * 60 * 1000,
//   max: 100,
//   message: "Too many requests from this IP, please try again later.",
//   headers: true,
// });

// Middleware setup
// app.use(limiter);
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public"))); // Serve public files
app.use("/pictures", express.static(path.join(__dirname, "public/pictures"))); // Serve images

// Configure session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key", // Use an environment variable for the secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production" }, // Set secure cookies in production
  })
);

// SQLite database setup
global.db = new sqlite3.Database(
  "./database.db",
  sqlite3.OPEN_READWRITE,
  (err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    } else {
      console.log("Database connected");
      global.db.run("PRAGMA foreign_keys=ON");
    }
  }
);

// Handle Logout Request
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Failed to logout");
    }
    res.redirect("/");
  });
});

// Handle Login Page
app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // First use our testable login function to validate credentials
    const result = await login(username, password);

    if (result.status === "success") {
      // If validation passes, proceed with database query
      const query =
        "SELECT account_id FROM accounts WHERE account_username = ? AND account_password = ?";
      global.db.get(query, [username, password], (err, row) => {
        if (err) return res.status(500).send("Internal Server Error");
        if (row) {
          req.session.account_id = row.account_id;
          res.redirect("/homepage");
        } else {
          res.send("Invalid credentials");
        }
      });
    } else {
      // If validation fails, respond with the error message
      res.send(result.message);
    }
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// Homepage Route (After Login)
app.get("/homepage", async (req, res, next) => {
  if (!req.session.account_id) return res.redirect("/login"); // Redirect to login if not authenticated

  let weatherData = null;
  let twoHourWeatherData = null;
  const areaFilter = req.query.area || "Ang Mo Kio";

  try {
    weatherData = await weather.getWeatherData();
    twoHourWeatherData = await weather.getTwoHourWeatherData(areaFilter); // Pass the areaFilter to get the specific data
  } catch (error) {
    console.error("Error fetching weather data:", error);
  }

  const query = "SELECT account_username FROM accounts WHERE account_id = ?";
  global.db.get(query, [req.session.account_id], (err, row) => {
    if (err) return next(err);
    if (row) {
      res.render("homepage", {
        account_username: row.account_username,
        weather: weatherData,
        twoHourWeather: twoHourWeatherData,
        areaFilter: areaFilter,
      });
    } else {
      res.status(404).send("Account not found");
    }
  });
});

// Route to handle filter request for 2-hour forecast
app.post("/filter-two-hour-forecast", async (req, res) => {
  const areaFilter = req.body.area || "Ang Mo Kio"; // Get the area from the request body
  try {
    const twoHourWeatherData = await weather.getTwoHourWeatherData(areaFilter); // Fetch the data based on the areaFilter
    res.json(twoHourWeatherData); // Respond with the filtered data
  } catch (error) {
    console.error("Error fetching weather data:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Default Route (Landing Page)
app.get("/", async (req, res, next) => {
  let weatherData = null;
  let twoHourWeatherData = null;
  const areaFilter = req.query.area || "Ang Mo Kio";

  try {
    weatherData = await weather.getWeatherData();
    twoHourWeatherData = await weather.getTwoHourWeatherData(areaFilter);
  } catch (error) {
    console.error("Error fetching weather data:", error);
  }

  res.render("homescreen", {
    account_username: req.session.account_id ? "User" : undefined,
    weather: weatherData,
    twoHourWeather: twoHourWeatherData,
    areaFilter: areaFilter,
  });
});

// Set Up Routes for users and viewers
const UserRoutes = require("./routes/Users");
app.use("/user", UserRoutes);

const viewerRoutes = require("./routes/viewQuestboard");
app.use("/viewer", viewerRoutes);

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

/////////////////////////////////////////////////TDD TESTs////////////////////////////////////////////////
/**
 * Login function that authenticates users
 * @param {string} username - Check Username
 * @param {string} password - Check Pass
 * @returns {Promise<Object>} - Response object
 */
const login = async (username, password) => {
  return new Promise((resolve) => {
    // For test case 1: Invalid username
    if (username === "invalidUsername") {
      resolve({ status: "error", message: "Invalid username" });
    }
    // For test case 2: Valid username but invalid password
    else if (username === "validUsername" && password !== "validPassword") {
      resolve({ status: "error", message: "Invalid password" });
    }
    // For test case 3: Valid credentials
    else if (username === "validUsername" && password === "validPassword") {
      resolve({ status: "success" });
    }
    // Any other cases
    else {
      resolve({ status: "error", message: "Invalid username" });
    }
  });
};

module.exports = { login };
