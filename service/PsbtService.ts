import * as Bitcoin from 'bitcoinjs-lib';
import axios from 'axios';
import ecc from "@bitcoinerlab/secp256k1";
Bitcoin.initEccLib(ecc);
import { ECPairFactory, ECPairInterface } from "ecpair";
const ECPair = ECPairFactory(ecc);
declare const window: any;
import {
  TEST_MODE,
  OPENAPI_UNISAT_TOKEN,
  OPENAPI_UNISAT_URL,
  SIGNATURE_SIZE,
  SERVICE_FEE_PERCENT,
  ADMIN_PAYMENT_ADDRESS
} from '../config/config';
import {
  RuneId,
  Runestone,
  none,
} from "runelib";
import { WalletTypes } from '../config/config';
import { IUtxo, IRuneUtxo } from '../types';
import { bitcoin } from 'bitcoinjs-lib/src/networks';

const network = TEST_MODE ? Bitcoin.networks.testnet : Bitcoin.networks.bitcoin;
export const toXOnly = (pubKey: string) =>
  pubKey.length == 32 ? pubKey : pubKey.slice(1, 33);
function tapTweakHash(pubKey: string, h: any) {
  return Bitcoin.crypto.taggedHash(
    "TapTweak",
    Buffer.concat(h ? [pubKey, h] : [pubKey])
  );
}
// function tweakSigner(signer: any, opts: any) {
//   if (opts == null) opts = {};
//   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//   // @ts-ignore
//   let privateKey = signer.privateKey;
//   if (!privateKey) {
//     throw new Error("Private key is required for tweaking signer!");
//   }
//   if (signer.publicKey[0] == 3) {
//     privateKey = ecc.privateNegate(privateKey);
//   }

//   const tweakedPrivateKey = ecc.privateAdd(
//     privateKey,
//     tapTweakHash(toXOnly(signer.publicKey), opts.tweakHash)
//   );
//   if (!tweakedPrivateKey) {
//     throw new Error("Invalid tweaked private key!");
//   }

//   return ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), {
//     network: opts.network,
//   });
// }
export const getBtcUtxoByAddress = async (address: string) => {
  const url = `${OPENAPI_UNISAT_URL}/v1/indexer/address/${address}/utxo-data`;

  const config = {
    headers: {
      Authorization: `Bearer ${OPENAPI_UNISAT_TOKEN}`,
    },
  };

  let cursor = 0;
  const size = 5000;
  const utxos: IUtxo[] = [];

  while (1) {
    const res = await axios.get(url, { ...config, params: { cursor, size } });

    console.log("res.data.data", res.data.data);

    if (res.data.code === -1) throw "Invalid Address";

    utxos.push(
      ...(res.data.data.utxo as any[]).map((utxo) => {
        return {
          scriptpubkey: utxo.scriptPk,
          txid: utxo.txid,
          value: utxo.satoshi,
          vout: utxo.vout,
        };
      })
    );

    cursor += res.data.data.utxo.length;

    if (cursor === res.data.data.total - res.data.data.totalRunes) break;
  }
  return utxos;
}
export const getRuneUtxoByAddress = async (address: string) => {
  const url = `${OPENAPI_UNISAT_URL}/v1/indexer/address/${address}/runes/balance-list`;
  const config = {
    headers: {
      Authorization: `Bearer ${OPENAPI_UNISAT_TOKEN}`,
    },
  };


  const res = await axios.get(url, { ...config });

  console.log("res.data.data", res.data.data);

  return res.data.data.detail;
}

// export const getRuneUtxoByRuneId = async (address: string, runeId: string) => {
//   const url = `${OPENAPI_UNISAT_URL}/v1/indexer/address/${address}/runes/${runeId}/utxo`;

//   const config = {
//     headers: {
//       Authorization: `Bearer ${OPENAPI_UNISAT_TOKEN}`,
//     },
//   };
//   // 90d62a80dfefd1deabad8bed9c003850fa84daed716f73096d2982acadb23319
//   let cursor = 0;
//   const size = 5000;

//   const res = await axios.get(url, { ...config, params: { cursor, size } });

//   console.log("rune data", res.data.data);

//   if (res.data.code === -1) throw "Invalid Address";
//   const utxos: IRuneUtxo[] = [];
//   const utxo: IRuneUtxo = {
//     scriptpubkey: res.data.data.utxo[0].scriptPk,
//     txid: res.data.data.utxo[0].txid,
//     value: res.data.data.utxo[0].satoshi,
//     vout: res.data.data.utxo[0].vout,
//     amount: Number(res.data.data.utxo[0].runes[0].amount),
//     runeId: res.data.data.utxo[0].runes[0].runeid,
//   }
//   return utxo;
// }
export const getRuneUtxoByRuneId = async (address: string, runeId: string) => {
  const url = `${OPENAPI_UNISAT_URL}/v1/indexer/address/${address}/runes/${runeId}/utxo`;

  const config = {
    headers: {
      Authorization: `Bearer ${OPENAPI_UNISAT_TOKEN}`,
    },
  };
  // 90d62a80dfefd1deabad8bed9c003850fa84daed716f73096d2982acadb23319

  let cursor = 0;
  const size = 5000;
  const utxos: IRuneUtxo[] = [];


  const res = await axios.get(url, { ...config, params: { cursor, size } });

  console.log("res.data.data", res.data.data);

  if (res.data.code === -1) throw "Invalid Address";

  utxos.push(
    ...(res.data.data.utxo as any[]).map((utxo) => {
      return {
        scriptpubkey: utxo.scriptPk,
        txid: utxo.txid,
        value: utxo.satoshi,
        vout: utxo.vout,
        amount: Number(utxo.runes[0].amount),
        runeId: utxo.runes[0].runeid,
      };
    })
  );
  return utxos;
}
const getTxHexById = async (txId: string) => {
  try {
    const { data } = await axios.get(
      `https://mempool.space/${TEST_MODE ? "testnet/" : ""}api/tx/${txId}/hex`
    );

    return data as string;
  } catch (error) {
    console.log("Mempool api error. Can not get transaction hex");

    throw "Mempool api is not working now. Try again later";
  }
};
export const getFeeRate = async (feeRateNo: number) => {

  const url = `https://mempool.space/${TEST_MODE ? "testnet/" : ""
    }api/v1/fees/recommended`;

  const res = await axios.get(url);
  if (feeRateNo == 1) {
    return res.data.fastestFee * 2;
  } else if (feeRateNo == 2) {
    return res.data.halfHourFee * 2;
  } else if (feeRateNo == 3) {
    return res.data.hourFee * 2;
  } else {
    console.log("Sever not found!")
    return 40 * 3;
  }

};
const calculateTxFee = (psbt: Bitcoin.Psbt, feeRate: number) => {
  const tx = new Bitcoin.Transaction();

  for (let i = 0; i < psbt.txInputs.length; i++) {
    const txInput = psbt.txInputs[i];
    tx.addInput(txInput.hash, txInput.index, txInput.sequence);
    tx.setWitness(i, [Buffer.alloc(SIGNATURE_SIZE)]);
  }

  for (let txOutput of psbt.txOutputs) {
    tx.addOutput(txOutput.script, txOutput.value);
  }
  tx.addOutput(psbt.txOutputs[0].script, psbt.txOutputs[0].value);
  tx.addOutput(psbt.txOutputs[0].script, psbt.txOutputs[0].value);
  return Math.floor(tx.virtualSize() * feeRate / 1.4);
}

// const getTxHexById = async (txId: string) => {
//     try {
//       const { data } = await axios.get(
//         `https://mempool.space/${TEST_MODE ? "testnet/" : ""}api/tx/${txId}/hex`
//       );

//       return data as string;
//     } catch (error) {
//       console.log("Mempool api error. Can not get transaction hex");

//       throw "Mempool api is not working now. Try again later";
//     }
//   };

export const generateSendBTCPSBT = async (
  walletType: WalletTypes,
  buyerPaymentPubkey: string,
  buyerOrdinalAddress: string,
  buyerOrdinalPubkey: string,
  sellerPaymentAddress: string,
  price: number
) => {
  const psbt = new Bitcoin.Psbt({ network: network });

  // Add Inscription Input
  let paymentAddress, paymentoutput;

  if (walletType === WalletTypes.XVERSE) {
    const hexedPaymentPubkey = Buffer.from(buyerPaymentPubkey, "hex");
    const p2wpkh = Bitcoin.payments.p2wpkh({
      pubkey: hexedPaymentPubkey,
      network: network,
    });

    const { address, redeem } = Bitcoin.payments.p2sh({
      redeem: p2wpkh,
      network: network,
    });

    paymentAddress = address;
    paymentoutput = redeem?.output;
  } else if (
    walletType === WalletTypes.UNISAT ||
    walletType === WalletTypes.OKX
  ) {
    paymentAddress = buyerOrdinalAddress;
  } else if (walletType === WalletTypes.HIRO) {
    const hexedPaymentPubkey = Buffer.from(buyerPaymentPubkey, "hex");
    const { address, output } = Bitcoin.payments.p2wpkh({
      pubkey: hexedPaymentPubkey,
      network: network,
    });
    paymentAddress = address;
  }

  console.log(paymentAddress);
  const btcUtxos = await getBtcUtxoByAddress(paymentAddress as string);
  const feeRate = await getFeeRate(2);

  let amount = 0;

  const buyerPaymentsignIndexes: number[] = [];

  for (const utxo of btcUtxos) {
    if (amount < price && utxo.value > 10000) {
      amount += utxo.value;

      buyerPaymentsignIndexes.push(psbt.inputCount);

      if (walletType === WalletTypes.UNISAT || walletType === WalletTypes.OKX) {
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            value: utxo.value,
            script: Buffer.from(utxo.scriptpubkey as string, "hex"),
          },
          tapInternalKey:
            walletType === WalletTypes.OKX
              ? Buffer.from(buyerOrdinalPubkey, "hex")
              : Buffer.from(buyerOrdinalPubkey, "hex").slice(1, 33),
          sighashType: Bitcoin.Transaction.SIGHASH_ALL,
        });
      } else if (walletType === WalletTypes.HIRO) {
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            value: utxo.value,
            script: Buffer.from(utxo.scriptpubkey as string, "hex"),
          },
        });
      } else if (walletType === WalletTypes.XVERSE) {
        const txHex = await getTxHexById(utxo.txid);

        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          redeemScript: paymentoutput,
          nonWitnessUtxo: Buffer.from(txHex, "hex"),
          sighashType: Bitcoin.Transaction.SIGHASH_ALL,
        });
      }
    }
  }

  if (price > 0) {
    psbt.addOutput({
      address: sellerPaymentAddress,
      value: parseInt(
        (((price * (100 - SERVICE_FEE_PERCENT)) / 100)).toString()
      ),
    });
    psbt.addOutput({
      address: ADMIN_PAYMENT_ADDRESS,
      value: parseInt(
        (((price * SERVICE_FEE_PERCENT) / 100)).toString()
      ),
    });
  }

  const fee = calculateTxFee(psbt, feeRate);

  if (amount < price + fee)
    throw "You do not have enough bitcoin in your wallet";

  psbt.addOutput({
    address: paymentAddress as string,
    value: amount - parseInt((price).toString()) - fee,
  });

  console.log(psbt.toBase64());

  return {
    psbt: psbt,
    buyerPaymentsignIndexes,
  };
};



export const combinePsbt = async (
  hexedPsbt: string,
  signedHexedPsbt1: string,
  walletType: string,
  signedHexedPsbt2?: string,
) => {
  try {

    console.log('combinePsbt==============>', hexedPsbt, signedHexedPsbt1, signedHexedPsbt2);
    const psbt = Bitcoin.Psbt.fromHex(hexedPsbt);
    // const psbt1 = Bitcoin.Psbt.fromHex(hexedPsbt);
    // const keypair: ECPairInterface = ECPair.fromWIF("cUHme8DxnFPf1f9ZwXpo2yiyx8fYD3Yb7LAGxkTZsfGZxsdVoDPv", network);
    // console.log("keypair.publicKey ==> ", keypair.publicKey.toString("hex"))
    // psbt1.signInput(0, tweakSigner(keypair, {}));
    // // psbt1.signInput(1, tweakSigner(keypair, {}));
    // const signedPsbt1 = Bitcoin.Psbt.fromHex(signedHexedPsbt1)
    if (!signedHexedPsbt2) {
      psbt.combine(Bitcoin.Psbt.fromHex(signedHexedPsbt1));
    } else {
      psbt.combine(Bitcoin.Psbt.fromHex(signedHexedPsbt1), Bitcoin.Psbt.fromHex(signedHexedPsbt2));
    }

    // console.log("combine is finished!", walletType);
    // psbt.finalizeAllInputs();
    // psbt.finalizeInput(0)
    // const { address, output } = Bitcoin.payments.p2wpkh({ pubkey: Buffer.from("0253bfe28349946fce863754c5b8353377bf5f0ee1b4cc4c45b1bc26391e952d48", "hex"), network: network });
    // psbt.finalizeInput(1)
    // if (walletType === WalletTypes.XVERSE) {
    //   psbt.finalizeAllInputs();

    // }
    const tx = psbt.extractTransaction();
    const txHex = tx.toHex();
    const txid = await pushRawTx(txHex);
    console.log(txid);
    return txid;

  } catch (e) {
    console.log(e);
    throw e;
  }
}
export const combinePsbt1 = async (
  hexedPsbt: string,
  signedHexedPsbt1: string,
  walletType: string,
  signedHexedPsbt2?: string,
) => {
  try {

    console.log('combinePsbt==============>', hexedPsbt, signedHexedPsbt1, signedHexedPsbt2);
    const psbt = Bitcoin.Psbt.fromHex(hexedPsbt);
    // const psbt1 = Bitcoin.Psbt.fromHex(hexedPsbt);
    // const keypair: ECPairInterface = ECPair.fromWIF("cUHme8DxnFPf1f9ZwXpo2yiyx8fYD3Yb7LAGxkTZsfGZxsdVoDPv", network);
    // console.log("keypair.publicKey ==> ", keypair.publicKey.toString("hex"))
    // psbt1.signInput(0, tweakSigner(keypair, {}));
    // // psbt1.signInput(1, tweakSigner(keypair, {}));
    // const signedPsbt1 = Bitcoin.Psbt.fromHex(signedHexedPsbt1)
    if (!signedHexedPsbt2) {
      psbt.combine(Bitcoin.Psbt.fromHex(signedHexedPsbt1));
    } else {
      psbt.combine(Bitcoin.Psbt.fromHex(signedHexedPsbt1), Bitcoin.Psbt.fromHex(signedHexedPsbt2));
    }

    // console.log("combine is finished!", walletType);
    const tmpPsbt = await finalizePsbtInput(psbt.toHex(), [0, 1])
    // psbt.finalizeInput(0)
    // const { address, output } = Bitcoin.payments.p2wpkh({ pubkey: Buffer.from("0253bfe28349946fce863754c5b8353377bf5f0ee1b4cc4c45b1bc26391e952d48", "hex"), network: network });
    // psbt.finalizeInput(1)
    // if (walletType === WalletTypes.XVERSE) {
    //   psbt.finalizeAllInputs();

    // }
    const ppp = Bitcoin.Psbt.fromHex(tmpPsbt)
    const tx = ppp.extractTransaction();
    const txHex = tx.toHex();
    const txid = await pushRawTx(txHex);
    console.log(txid);
    return txid;

  } catch (e) {
    console.log(e);
    throw e;
  }
}

export const pushRawTx = async (rawTx: string) => {
  const txid = await postData(
    `https://mempool.space/${TEST_MODE ? "testnet/" : ""}api/tx`,
    rawTx
  );
  console.log("pushed txid", txid);
  return txid;
};

const postData = async (
  url: string,
  json: any,
  content_type = "text/plain",
  apikey = ""
) => {
  while (1) {
    try {
      const headers: any = {};

      if (content_type) headers["Content-Type"] = content_type;

      if (apikey) headers["X-Api-Key"] = apikey;
      const res = await axios.post(url, json, {
        headers,
      });

      return res.data;
    } catch (err: any) {
      const axiosErr = err;
      console.log("push tx error", axiosErr.response?.data);

      if (
        !(axiosErr.response?.data).includes(
          'sendrawtransaction RPC error: {"code":-26,"message":"too-long-mempool-chain,'
        )
      )
        throw new Error("Got an err when push tx");
    }
  }
};

export const finalizePsbtInput = (hexedPsbt: string, inputs: number[]) => {
  const psbt = Bitcoin.Psbt.fromHex(hexedPsbt);
  inputs.forEach((input) => psbt.finalizeInput(input));
  return psbt.toHex();
}
const getInscriptionWithUtxo = async (inscriptionId: string) => {
  try {
    const url = `${OPENAPI_UNISAT_URL}/v1/indexer/inscription/info/${inscriptionId}`;

    const config = {
      headers: {
        Authorization: `Bearer ${OPENAPI_UNISAT_TOKEN}`,
      },
    };

    const res = await axios.get(url, config);

    if (res.data.code === -1) throw "Invalid inscription id";

    return {
      address: res.data.data.address,
      contentType: res.data.data.contentType,
      inscriptionId: inscriptionId,
      inscriptionNumber: res.data.data.inscriptionNumber,
      txid: res.data.data.utxo.txid,
      value: res.data.data.utxo.satoshi,
      vout: res.data.data.utxo.vout,
      scriptpubkey: res.data.data.utxo.scriptPk,
    };
  } catch (error) {
    console.log(
      `Ordinal api is not working now, please try again later Or invalid inscription id ${inscriptionId}`
    );
    throw "Invalid inscription id";
  }
};
export const generateSendOrdinalPSBT = async (
  sellerWalletType: WalletTypes,
  buyerOrdinalAddress: string,
  inscriptionId: string,
  sellerPaymentPubKey: string,
  sellerPaymentAddress: string,
  sellerOrdinalPubkey: string,
  price: number
) => {
  console.log("inscription id", inscriptionId);
  console.log("pub", sellerWalletType);
  console.log("pub", buyerOrdinalAddress);
  console.log("pub", sellerPaymentAddress);
  console.log("pub", sellerPaymentPubKey);
  console.log("pub", sellerOrdinalPubkey);
  const sellerInscriptionsWithUtxo = await getInscriptionWithUtxo(
    inscriptionId
  );
  const sellerScriptpubkey = Buffer.from(
    sellerInscriptionsWithUtxo.scriptpubkey,
    "hex"
  );
  const psbt = new Bitcoin.Psbt({ network: network });

  // Add Inscription Input
  psbt.addInput({
    hash: sellerInscriptionsWithUtxo.txid,
    index: sellerInscriptionsWithUtxo.vout,
    witnessUtxo: {
      value: sellerInscriptionsWithUtxo.value,
      script: sellerScriptpubkey,
    },
    tapInternalKey:
      sellerWalletType === WalletTypes.XVERSE ||
        sellerWalletType === WalletTypes.OKX
        ? Buffer.from(sellerOrdinalPubkey, "hex")
        : Buffer.from(sellerOrdinalPubkey, "hex").slice(1, 33),
  });

  // Add Inscription Output to buyer's address
  psbt.addOutput({
    address: buyerOrdinalAddress,
    value: sellerInscriptionsWithUtxo.value,
  });

  const btcUtxos = await getBtcUtxoByAddress(sellerPaymentAddress as string);
  const feeRate = await getFeeRate(3);

  let amount = 0;

  const buyerPaymentsignIndexes: number[] = [];

  for (const utxo of btcUtxos) {
    let fee = calculateTxFee(psbt, feeRate);
    console.log

    if (amount < price + fee && utxo.value > 10000) {
      amount += utxo.value;

      buyerPaymentsignIndexes.push(psbt.inputCount);

      if (
        sellerWalletType === WalletTypes.UNISAT ||
        sellerWalletType === WalletTypes.OKX
      ) {
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            value: utxo.value,
            script: Buffer.from(utxo.scriptpubkey as string, "hex"),
          },
          tapInternalKey:
            sellerWalletType === WalletTypes.OKX
              ? Buffer.from(sellerPaymentPubKey, "hex")
              : Buffer.from(sellerPaymentPubKey, "hex").slice(1, 33),
          // sighashType: Bitcoin.Transaction.SIGHASH_ALL,
        });
      }
      // else if (sellerWalletType === WalletTypes.XVERSE) {
      //   const txHex = await getTxH2exById(utxo.txid);

      //   psbt.addInput({
      //     hash: utxo.txid,
      //     index: utxo.vout,
      //     redeemScript: paymentoutput,
      //     nonWitnessUtxo: Buffer.from(txHex, "hex"),
      //     sighashType: Bitcoin.Transaction.SIGHASH_ALL,
      //   });
      // }
    }
  }

  const fee = calculateTxFee(psbt, feeRate);
  console.log(fee, feeRate)
  if (amount < price + fee)
    throw "You do not have enough bitcoin in your wallet";

  psbt.addOutput({
    address: sellerPaymentAddress as string,
    value: amount - price - fee,
  });

  return {
    psbt: psbt,
    buyerPaymentsignIndexes,
  };
};