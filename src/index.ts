import express from "express";
import cors from "cors";
import { ping, userop, getSenderNonce, getScheduledOps } from "./handlers";
import { config } from "dotenv";
import logger from "./logger";

config();

const app = express();
const port = 8080;

app.use(cors());

app.use(express.json());

app.get("/ping", ping);
app.get("/scheduled", getScheduledOps);
app.get("/nonce", getSenderNonce);
app.post("/userop", userop);

app.listen(port, () => {
  logger.info(`Server running at http://localhost:${port}`);
});
