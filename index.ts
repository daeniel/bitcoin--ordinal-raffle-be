import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from 'path';
import cron from "node-cron";

import { PORT, connectMongoDB } from "./config";
import http from "http";
import { UserRouter, RuneRouter, raffleRouter } from "./routes";
import { checkTxStatus, chooseRaffleWinner } from "./controller/raffleController";
import WebSocket from "ws";
// import SenderBtcRouter from "./routes/SendBtcRoute";

// Load environment variables from .env file
dotenv.config();

// Connect to the MongoDB database
connectMongoDB();

// Create an instance of the Express application
const app = express();

// Set up Cross-Origin Resource Sharing (CORS) options
app.use(cors());

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, './public')));

// Parse incoming JSON requests using body-parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {

  //connection is up, let's add a simple simple event
  ws.on('message', (message) => {

    //log the received message and send it back to the client
    console.log('received: %s', message);
    ws.send(`Hello, you sent -> ${message}`);
  });

  //send immediatly a feedback to the incoming connection    
  ws.send('Hi there, I am a WebSocket server');
});
// Define routes for different API endpoints
app.use("/api/users", UserRouter);
app.use("/api/rune", RuneRouter);
app.use("/api/raffle", raffleRouter);


// Define a route to check if the backend server is running
app.get("/", async (req: any, res: any) => {
  res.send("Backend Server is Running now!");
});

// Start the Express server to listen on the specified port
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// checkTxStatus();
cron.schedule("*/1 * * * *", () => {
  console.log("Update Raffles Every 1 mins");
  checkTxStatus();
  chooseRaffleWinner()
});
