import { getMigrations } from "better-auth/db/migration";
import { getAuth } from "../src/lib/auth-server";
import { getPool, migrateAppSchema } from "../src/lib/db.server";

const pool = getPool();
try {
  await migrateAppSchema(pool);
  const auth = getAuth();
  const migrations = await getMigrations(auth.options, {
    throwOnUnsafe: false,
  });
  await migrations.runMigrations();
  console.log("migrasi database selesai");
} finally {
  await pool.end();
}
