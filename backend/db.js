// LocalDB only listens on Named Pipes / Shared Memory, never plain TCP/IP.
// The default `mssql` driver (tedious) is pure-JS TCP-only and cannot reach it
// (it tries to resolve "(localdb)" as a DNS hostname and fails with ENOTFOUND).
// msnodesqlv8 uses the native ODBC driver, which understands the
// "(localdb)\InstanceName" syntax and Windows Integrated Auth (Trusted_Connection).
const sql = require('mssql/msnodesqlv8');
const dotenv = require('dotenv');
dotenv.config();

const DB_SERVER = process.env.DB_SERVER || '(localdb)\\MSSQLLocalDB';
const DB_DATABASE = process.env.DB_DATABASE || 'BiblionDB';
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const ODBC_DRIVER = process.env.ODBC_DRIVER || 'ODBC Driver 17 for SQL Server';

function buildConnectionString() {
  if (process.env.DB_CONNECTION_STRING) return process.env.DB_CONNECTION_STRING;

  const parts = [`Driver={${ODBC_DRIVER}}`, `Server=${DB_SERVER}`, `Database=${DB_DATABASE}`];
  if (DB_USER) {
    parts.push(`Uid=${DB_USER}`, `Pwd=${DB_PASS || ''}`);
  } else {
    parts.push('Trusted_Connection=Yes');
  }
  return parts.join(';') + ';';
}

let poolPromise = null;

// Only clear the cache if it still points at the attempt that just failed.
// Without this, two requests racing through getPool() at the same time could
// each detect a dead connection, and whichever's cleanup runs second would
// wipe out the OTHER one's fresh, healthy reconnect — forcing yet another
// reconnect for the next caller for no reason. Comparing identity means a
// failure can only ever cancel itself, never a newer attempt that already
// replaced it.
function invalidate(failedPromise) {
  if (poolPromise === failedPromise) {
    poolPromise = null;
  }
}

// msnodesqlv8's own `connectionTimeout` option turned out not to be reliable:
// tested cold (LocalDB fully stopped), a connect attempt sat past it for
// several minutes with no error and no result. Racing it against our own
// plain setTimeout — the same approach already proven to work for the ping
// below — actually cuts it off.
const CONNECT_TIMEOUT_MS = 20000;

function wireErrorHandler(pool, ownAttempt) {
  // Fires on acquire failures from ANY query, not just our own ping below —
  // e.g. LocalDB dying mid-session while a route is mid-request. Without
  // this, only our ping's own failures cleared the cache, so a route that
  // failed on its own could keep re-failing against the same dead pool.
  pool.on('error', err => {
    console.error('Error en el pool de conexión SQL, se reconectará en la próxima petición:', err.message);
    invalidate(ownAttempt);
  });
}

function connectPool() {
  // Passing a config OBJECT (not a bare string) to sql.connect() is required here:
  // mssql's connect() parses bare strings as ADO.NET connection strings, which
  // discards the raw value and silently rebuilds a broken one for msnodesqlv8.
  //
  // pool.max: 1 — this is a single-user local dev app, and a pool of several
  // connections meant a ping on connection #1 could pass while a route's real
  // query then borrowed connection #2, which was actually dead: the ping gave
  // a false "all good" and the query hung anyway. With one connection there is
  // nothing else it could be.
  const rawConnect = sql.connect({
    connectionString: buildConnectionString(),
    options: {},
    pool: { max: 1, min: 0 },
    requestTimeout: 8000,
    connectionTimeout: CONNECT_TIMEOUT_MS
  });

  const thisAttempt = Promise.race([
    rawConnect,
    new Promise((_, reject) => setTimeout(() => reject(new Error('connect timeout')), CONNECT_TIMEOUT_MS))
  ]).catch(err => {
    invalidate(thisAttempt); // allow retry on next request instead of caching a failure forever
    console.error('MSSQL connection error:', err.message || err);
    throw err;
  });

  thisAttempt.then(p => wireErrorHandler(p, thisAttempt)).catch(() => {});

  // Promise.race doesn't cancel the loser: if our own timeout won the race
  // but the real connect was just slow rather than actually stuck, let it
  // keep going in the background and adopt it if it does come through —
  // otherwise that connection attempt (and the LocalDB auto-start it
  // triggered) would just be thrown away for nothing.
  rawConnect.then(p => {
    if (!poolPromise) {
      poolPromise = Promise.resolve(p);
      wireErrorHandler(p, poolPromise);
      console.log('Conexión SQL demorada se completó igual, quedó lista para la próxima petición.');
    }
  }).catch(() => {}); // already reported via thisAttempt's own .catch above

  return thisAttempt;
}

// LocalDB stops itself after a period of inactivity. If that happens while
// the backend keeps running, the cached pool holds a connection to a database
// that no longer exists from its point of view, and queries hang until they
// time out instead of failing fast. A cheap "SELECT 1" ping before reusing
// the cached pool catches that and reconnects (which re-triggers LocalDB's
// auto-start) instead of requiring a manual server restart.
async function getPool() {
  const currentAttempt = poolPromise;
  if (currentAttempt) {
    try {
      const existingPool = await currentAttempt;
      await Promise.race([
        existingPool.request().query('SELECT 1'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('ping timeout')), 3000))
      ]);
      return existingPool;
    } catch (err) {
      console.error('Conexión SQL inactiva, reconectando:', err.message);
      invalidate(currentAttempt);
    }
  }

  // Someone else may have already started a fresh attempt while we were
  // pinging (or we're the first ones here) — reuse it instead of piling on
  // a second simultaneous connection attempt.
  if (!poolPromise) {
    poolPromise = connectPool();
  }
  return poolPromise;
}

module.exports = { sql, getPool, DB_SERVER, DB_DATABASE };
