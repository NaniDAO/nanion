import express from "express";
import cors from "cors";
import { ping, userop } from "./handlers";
import { config } from "dotenv";

config();

const app = express();
const port = 8080;

app.use(cors());

app.use(express.json());

app.get("/ping", ping);
app.post("/userop", userop);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
