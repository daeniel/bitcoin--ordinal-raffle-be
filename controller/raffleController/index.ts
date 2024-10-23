import * as Bitcoin from "bitcoinjs-lib";
import { Request, Response } from "express";
import axios from "axios";
import raffleModel from "../../model/RaffleModel";
import ecc from "@bitcoinerlab/secp256k1";
import { ECPairFactory, ECPairInterface } from "ecpair";
import {
    combinePsbt,
    generateSendBTCPSBT,
    generateSendOrdinalPSBT,
    finalizePsbtInput,
    combinePsbt1,
} from "../../service/PsbtService";
import { LocalWallet } from "../../service/localWallet";
import {
    TEST_MODE,
    WalletTypes,
    OPENAPI_UNISAT_TOKEN,
    OPENAPI_UNISAT_URL,
    RaffleStatus,
} from "../../config/config";
// import { chooseWinner } from "../service/utils.service";
// import { sendInscription } from "../service/unisat.service";
import { TRaffleTypes } from "../../propTypes";

Bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);
const network = TEST_MODE ? Bitcoin.networks.testnet : Bitcoin.networks.bitcoin;
const key = process.env.ADMIN_PRIVATE_KEY;
if (typeof key !== "string" || key === "") {
    throw new Error(
        "Environment variable PRIVATE_KEY must be set and be a valid string."
    );
}
const adminWallet = new LocalWallet(key, TEST_MODE ? 1 : 0);

export const getRaffles = async (req: Request, res: Response) => {
    try {
        const raffles = await raffleModel.find({ status: RaffleStatus.START });
        const currentTime = new Date().getTime();
        return res.status(200).json({ success: true, raffles, currentTime });
    } catch (error) {
        console.log("Get Raffles Error : ", error);
        return res.status(500).json({ success: false });
    }
};

export const getRaffleHistory = async (req: Request, res: Response) => {
    try {
        const { ordinalAddress } = req.params;
        console.log(ordinalAddress);
        const raffles = await raffleModel.find({
            status: RaffleStatus.END,
            // ticketList: ordinalAddress,
        });
        console.log('raffles ==> ', raffles);

        return res.status(200).json({ success: true, raffles });
    } catch (error) {
        console.log("Get Raffle History Error : ", error);
        return res.status(500).json({ success: false });
    }
};

export const sendOrdinal = async (req: Request, res: Response) => {
    try {
        const {
            walletType,
            ordinalInscription,
            creatorPaymentAddress,
            creatorPaymentPubkey,
            creatorOrdinalPubkey,
        } = req.body;
        console.log("herhe", adminWallet.pubkey);
        const { psbt, buyerPaymentsignIndexes } = await generateSendOrdinalPSBT(
            walletType,
            adminWallet.address,
            ordinalInscription,
            creatorPaymentPubkey,
            creatorPaymentAddress,
            creatorOrdinalPubkey,
            0
        );

        console.log("buyer payment sign indexes", buyerPaymentsignIndexes);

        return res.status(200).json({
            success: true,
            psbtHex: psbt.toHex(),
            psbtBase64: psbt.toBase64(),
            buyerPaymentsignIndexes: buyerPaymentsignIndexes,
        });
    } catch (error) {
        console.log("Send Ordinal PSBT Error : ", error);
        return res.status(500).json({ success: false });
    }
};

export const sendOrdinalCombineAndPush = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            walletType,
            ticketPrice,
            ticketAmounts,
            ordinalInscription,
            endTime,
            creatorOrdinalAddress,
            creatorPaymentAddress,
            psbt,
            signedPSBT,
        } = req.body;

        let sellerSignPSBT;
        if (walletType === WalletTypes.XVERSE) {
            sellerSignPSBT = Bitcoin.Psbt.fromBase64(signedPSBT);
            sellerSignPSBT = await finalizePsbtInput(sellerSignPSBT.toHex(), [0, 1]);
        } else if (walletType === WalletTypes.HIRO) {
            sellerSignPSBT = await finalizePsbtInput(signedPSBT, [0, 1]);
        } else {
            sellerSignPSBT = signedPSBT;
        }

        // const userSignedPSBT = Bitcoin.Psbt.fromHex(sellerSignPSBT);
        // console.log(userSignedPSBT);
        // const signedPSBT1 = await adminWallet.signPsbt(userSignedPSBT);

        const txID = await combinePsbt(
            psbt,
            sellerSignPSBT,
            walletType
            // userSignedPSBT.toHex(),
            // signedPSBT1.toHex()
        );
        console.log(txID);

        const currentDate = new Date().getTime();

        const newRaffle = new raffleModel({
            ticketPrice,
            ordinalInscription,
            ticketAmounts,
            createTime: currentDate,
            endTimePeriod: endTime,
            winner: "",
            creatorOrdinalAddress,
            creatorPaymentAddress,
            walletType,
            createRaffleTx: txID,
            lastBuyTx: txID,
        });

        await newRaffle.save();

        return res.status(200).json({ success: true });
    } catch (error) {
        console.log("Send Ordinal and Combine PSBT Error : ", error);
        return res.status(500).json({ success: false });
    }
};

export const buyTickets = async (req: Request, res: Response) => {
    try {
        const {
            buyerPayPubkey,
            buyerOrdinalAddress,
            buyerOrdinalPubkey,
            ticketCounts,
            _id,
            walletType,
        } = req.body;
        const raffles: any = await raffleModel.findById(_id);
        if (
            raffles.ticketAmounts <
            raffles.ticketList.length + Number(ticketCounts)
        )
            return res
                .status(500)
                .json({ success: false, msg: "All of Tickets are sold" });

        const { psbt, buyerPaymentsignIndexes } = await generateSendBTCPSBT(
            walletType,
            buyerPayPubkey,
            buyerOrdinalAddress,
            buyerOrdinalPubkey,
            raffles.creatorPaymentAddress,
            (raffles.ticketPrice + 5000) * ticketCounts
        );

        return res.status(200).json({
            success: true,
            psbtHex: psbt.toHex(),
            psbtBase64: psbt.toBase64(),
            buyerPaymentsignIndexes,
        });
    } catch (error) {
        console.log("Generate Buy Tickets PSBT Error : ", error);
        return res.status(500).json({ success: false });
    }
};

export const buyTicketsCombineAndPush = async (req: Request, res: Response) => {
    try {
        const {
            _id,
            buyerOrdinalAddress,
            psbt,
            signedPSBT,
            ticketCounts,
            walletType,
        } = req.body;

        let sellerSignPSBT;
        if (walletType === WalletTypes.XVERSE) {
            sellerSignPSBT = Bitcoin.Psbt.fromBase64(signedPSBT);
            sellerSignPSBT = await finalizePsbtInput(sellerSignPSBT.toHex(), [0]);
        } else if (walletType === WalletTypes.HIRO) {
            sellerSignPSBT = await finalizePsbtInput(signedPSBT, [0]);
        } else {
            sellerSignPSBT = signedPSBT;
        }

        const txID = await combinePsbt(psbt, sellerSignPSBT, walletType);
        console.log(txID);
        const raffleUser: any = await raffleModel.findById(_id);
        const newArray = Array(Number(ticketCounts)).fill(buyerOrdinalAddress);
        raffleUser.ticketList = [...raffleUser.ticketList, ...newArray];
        raffleUser.lastBuyTx = txID;
        await raffleUser.save();

        return res
            .status(200)
            .json({ success: true, msg: `${ticketCounts} tickets purchased` });
    } catch (error) {
        console.log("Buy Ticket and Combine PSBT Error : ", error);
        return res.status(500).json({ success: false });
    }
};

export const chooseRaffleWinner = async () => {
    console.log("choose winner every 1 minute")
    try {
        const raffles = await raffleModel.find({
            status: RaffleStatus.CANFINISH,
            endTime: { $lt: new Date().getTime() },
        });
        for (const raffle of raffles) {
            const selectedWinner =
                raffle.ticketList.length === 0
                    ? raffle.creatorOrdinalAddress
                    : await chooseWinner(raffle.ticketList);

            const res = await axios.get(
                `${OPENAPI_UNISAT_URL}/v1/indexer/inscription/info/${raffle.ordinalInscription}`,
                {
                    headers: {
                        Authorization: `Bearer ${OPENAPI_UNISAT_TOKEN}`,
                    },
                }
            );

            const { psbt, buyerPaymentsignIndexes } = await generateSendOrdinalPSBT(
                WalletTypes.UNISAT,
                selectedWinner as string,
                raffle.ordinalInscription as string,
                adminWallet.pubkey,
                adminWallet.address,
                adminWallet.pubkey,
                0
            );
            const keypair: ECPairInterface = ECPair.fromWIF(key, network);
            console.log("keypair.publicKey ==> ", keypair.publicKey.toString("hex"))
            const psbt1 = psbt;
            const signedPsbt = psbt1.signAllInputs(tweakSigner(keypair, {}));

            const txID = combinePsbt1(psbt.toHex(), signedPsbt.toHex(), WalletTypes.UNISAT);
            raffle.winner = selectedWinner;
            raffle.status = RaffleStatus.END;
            await raffle.save();
            console.log(`${raffle._id} completed : ${txID}`);
        }
    } catch (error) {
        console.log("Choose Raffle Error : ", error);
        return false;
    }
};

export const checkTxStatus = async () => {
    try {
        let _cnt = 0;
        const currentDate = new Date().getTime();
        const raffles: TRaffleTypes[] = await raffleModel.find({
            status: RaffleStatus.PENDING,
        });
        console.log(raffles[0]);
        const completedRaffles = await Promise.all(
            raffles.map((raffle) =>
                axios.get(
                    `https://mempool.space/${TEST_MODE && "testnet/"}api/tx/${raffle.createRaffleTx
                    }/status`
                )
            )
        );
        for (const indRaffleStatus of completedRaffles) {
            console.log(raffles[_cnt].createRaffleTx);
            if (indRaffleStatus.data.confirmed) {
                await raffleModel.findOneAndUpdate(
                    {
                        createRaffleTx: raffles[_cnt].createRaffleTx,
                    },
                    {
                        createTime: currentDate,
                        endTime: currentDate + raffles[_cnt].endTimePeriod * 1000,
                        status: RaffleStatus.START,
                    }
                );
            }
            _cnt++;
        }

        const checkBuyTxRaffles: TRaffleTypes[] = await raffleModel.find({
            status: RaffleStatus.START,
            endTime: { $lt: currentDate },
        });
        const completedBuyTicketRaffles = await Promise.all(
            checkBuyTxRaffles.map((raffle) =>
                axios.get(
                    `https://mempool.space/${TEST_MODE && "testnet/"}api/tx/${raffle.lastBuyTx
                    }/status`
                )
            )
        );
        _cnt = 0;
        for (const indBuyTicketRaffleStatus of completedBuyTicketRaffles) {
            console.log(checkBuyTxRaffles[_cnt].lastBuyTx);
            if (indBuyTicketRaffleStatus.data.confirmed) {
                await raffleModel.findOneAndUpdate(
                    {
                        lastBuyTx: checkBuyTxRaffles[_cnt].lastBuyTx,
                    },
                    {
                        status: RaffleStatus.CANFINISH,
                    }
                );
            }
            _cnt++;
        }
    } catch (error) {
        console.log("Check Raffle Status : ", error);
        return false;
    }
};
export const chooseWinner = async (array: Array<string>) => {
    const item = array[Math.floor(Math.random() * array.length)];
    return item;
};
export const toXOnly = (pubKey: string) =>
    pubKey.length == 32 ? pubKey : pubKey.slice(1, 33);
function tapTweakHash(pubKey: string, h: any) {
    return Bitcoin.crypto.taggedHash(
        "TapTweak",
        Buffer.concat(h ? [pubKey, h] : [pubKey])
    );
}
function tweakSigner(signer: any, opts: any) {
    if (opts == null) opts = {};
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    let privateKey = signer.privateKey;
    if (!privateKey) {
        throw new Error("Private key is required for tweaking signer!");
    }
    if (signer.publicKey[0] == 3) {
        privateKey = ecc.privateNegate(privateKey);
    }

    const tweakedPrivateKey = ecc.privateAdd(
        privateKey,
        tapTweakHash(toXOnly(signer.publicKey), opts.tweakHash)
    );
    if (!tweakedPrivateKey) {
        throw new Error("Invalid tweaked private key!");
    }

    return ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), {
        network: opts.network,
    });
}