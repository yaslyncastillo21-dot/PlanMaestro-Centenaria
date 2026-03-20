const sql = require("mssql");

function parseSqlServerTarget(rawServer = "") {
  const value = String(rawServer).trim();
  if (!value) return { server: "", instanceName: undefined };

  const parts = value.split("\\");
  if (parts.length >= 2) {
    return { server: parts[0], instanceName: parts[1] };
  }

  return { server: value, instanceName: undefined };
}

const { server, instanceName } = parseSqlServerTarget(process.env.DB_SERVER);
const dbPort = Number(process.env.DB_PORT || 0);

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server,
  ...(dbPort > 0 ? { port: dbPort } : {}),
  database: process.env.DB_DATABASE,
  connectionTimeout: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 15000),
  requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT_MS || 15000),
  pool: {
    max: Number(process.env.DB_POOL_MAX || 10),
    min: Number(process.env.DB_POOL_MIN || 0),
    idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS || 30000),
  },
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
    ...(dbPort > 0 ? {} : instanceName ? { instanceName } : {}),
  },
};

let pool;
let poolPromise;

function withTimeout(promise, ms, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function getPool() {
  if (pool) return pool;
  if (poolPromise) return poolPromise;

  const timeoutMs = Number(process.env.DB_CONNECT_GUARD_TIMEOUT_MS || 20000);
  poolPromise = withTimeout(
    sql.connect(config),
    timeoutMs,
    "Tiempo de espera agotado conectando a SQL Server"
  )
    .then((connectedPool) => {
      pool = connectedPool;
      pool.on("error", () => {
        pool = null;
        poolPromise = null;
      });
      return pool;
    })
    .catch((error) => {
      pool = null;
      poolPromise = null;
      throw error;
    });

  return poolPromise;
}

module.exports = { sql, getPool };
