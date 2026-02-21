import app from "./app.js";
import http from "http";
export const server = http.createServer(app);