import mongoose from "mongoose";

const RaffleSchema = new mongoose.Schema({
  ticketPrice: Number,
  ordinalInscription: String,
  ticketList: {
    type: Array,
    default: [],
  },
  ticketAmounts: Number,
  createTime: Number,
  endTime: {
    type: Number,
    default: 100000000000000,
  },
  endTimePeriod: Number,
  winner: String,
  creatorOrdinalAddress: String,
  creatorPaymentAddress: String,
  status: {
    type: Number,
    default: 0,
  }, // 0: Create Pending, 1: Created, 2: Buy Ticket Completed, 3: Finished
  walletType: String,
  createRaffleTx: String,
  lastBuyTx: String,
},
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

export default mongoose.model("RaffleSchema", RaffleSchema);