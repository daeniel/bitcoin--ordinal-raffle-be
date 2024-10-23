export interface IAddress {
    walletName: String,
    paymentAddress: string,
    paymentPubkey: string,
    ordinalsAddress: string,
    ordinalsPubkey: string,
}

export interface IProfile {
    username: string,
    avatar: string,
    address: IAddress[],
    points: Number
}

export interface IUtxo {
    txid: string;
    vout: number;
    value: number;
    scriptpubkey?: string;
}
export interface IRuneUtxo {
    txid: string;
    vout: number;
    value: number;
    scriptpubkey: string;
    amount: number;
    runeId: string;
}
export interface IInscriptionInfo {
    inscriptionId: string;
    amount: number;
    ownerPaymentAddress: string;
    ownerOrdinalAddress: string;
}