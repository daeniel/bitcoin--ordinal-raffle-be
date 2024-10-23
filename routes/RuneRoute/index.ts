import { Router, Request, Response } from 'express';
import { getRuneUtxoByAddress } from '../../service/PsbtService';

const RuneRouter = Router();

RuneRouter.get("/all-rune", async (req: Request, res: Response) => {
    try {
        console.log('rune router is called')
        const res1 = await getRuneUtxoByAddress("tb1pp35qdls2ccshepzc7x5u9d22f6ultpkp2ltlda4vxv5vqg3q7lusygcjer");
        console.log("runedata", res1)
        return res.status(200).json({
            success: true,
            data: res1,
        });
    } catch (e: any) {
        console.log(e);
        return res.status(500).send(e);
    }
});

export default RuneRouter;