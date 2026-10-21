require("dotenv").config();
const db = require("./services/database");

db.queryParams(
  "SELECT id, nombre, email, rol FROM usuarios WHERE LOWER(email) = ?",
  ["lucas.admin@entradaweb.local"]
)
.then(r => console.log(JSON.stringify(r.result || [], null, 2)))
.catch(e => {
  console.error("Error:", e.message);
  process.exitCode = 1;
});
