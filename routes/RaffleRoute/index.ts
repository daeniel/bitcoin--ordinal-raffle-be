import express from "express";
import {
    sendOrdinal,
    sendOrdinalCombineAndPush,
    buyTickets,
    buyTicketsCombineAndPush,
    getRaffles,
    getRaffleHistory,
    // getRaffleHistory,
} from "../../controller/raffleController";

const raffleRouter = express.Router();

// Middleware for logging requests to this router
raffleRouter.use((req, res, next) => {
    console.log(`Raffle request received: ${req.method} ${req.originalUrl}`);
    next();
});

raffleRouter.get("/get-raffles", async (req, res, next) => {
    try {
        await getRaffles(req, res);
    } catch (error) {
        next(error)
    }
});

raffleRouter.get("/get-raffle-history", async (req, res, next) => {
    try {
        await getRaffleHistory(req, res);
    } catch (error) {
        next(error);
    }
});

raffleRouter.post("/send-ordinal", async (req, res, next) => {
    try {
        await sendOrdinal(req, res);
    } catch (error) {
        next(error);
    }
});

raffleRouter.post("/send-ordinal-combine-push", async (req, res, next) => {
    try {
        await sendOrdinalCombineAndPush(req, res);
    } catch (error) {
        next(error);
    }
});

raffleRouter.post("/buy-tickets", async (req, res, next) => {
    try {
        await buyTickets(req, res);
    } catch (error) {
        next(error);
    }
});

raffleRouter.post("/buy-tickets-combine-push", async (req, res, next) => {
    try {
        await buyTicketsCombineAndPush(req, res);
    } catch (error) {
        next(error);
    }
});

export default raffleRouter;