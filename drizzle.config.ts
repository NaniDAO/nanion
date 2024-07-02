import type { Config } from "drizzle-kit";
import fs from "fs";
import path from "path";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  throw new Error("NO DATABASE_URL SET");
}

const CA_CERT_PATH =
  process.env.CA_CERT_PATH || path.join(process.cwd(), "ca-certificate.crt");

if (!fs.existsSync(CA_CERT_PATH)) {
  throw new Error(`CA certificate not found at ${CA_CERT_PATH}`);
}

const caString = fs.readFileSync(CA_CERT_PATH).toString();

const dbUrl = new URL(DB_URL);
dbUrl.searchParams.append("sslmode", "no-verify");
// Remove the line appending the encoded CA certificate to the URL
// dbUrl.searchParams.append("sslrootcert", encodeURIComponent(caString));

// Use a configuration object for SSL settings if your library supports it
//
console.log("ca string", caString);
const sslConfig = {
  rejectUnauthorized: false,
  ca: caString,
};

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl.toString(),
    ssl: sslConfig, // Add SSL configuration separately if supported
  },
  schemaFilter: ["public"],
} satisfies Config;
