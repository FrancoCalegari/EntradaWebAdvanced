require("dotenv").config({ quiet: true });
const db = require("./services/database");

db.query("SELECT id, nombre, email, rol FROM usuarios")
  .then(r => console.log(JSON.stringify(r.result || [], null, 2)))
  .catch(e => {
    console.error("Error:", e.message);
    process.exitCode = 1;
  });
