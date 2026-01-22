import WxPay from 'wechatpay-node-v3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Load certificates from path or env
// In production (Cloud Hosting), it's better to mount secrets or use base64 env vars
// For simplicity, we assume they are provided as strings or paths in env
const APPID = process.env.WX_APP_ID || '';
const MCHID = process.env.WX_MCH_ID || '';
const APIV3_KEY = process.env.WX_API_V3_KEY || ''; // API V3 Key
const CERT_PATH = process.env.WX_CERT_PATH || ''; // Path to apiclient_cert.pem
const KEY_PATH = process.env.WX_KEY_PATH || '';   // Path to apiclient_key.pem

// Initialize WxPay
let wxPay: WxPay | null = null;
let privateKeyContent: Buffer | string = '';

try {
    if (APPID && MCHID && APIV3_KEY && CERT_PATH && KEY_PATH) {
        // Read cert/key files if they are paths
        const publicKey = fs.readFileSync(CERT_PATH);
        privateKeyContent = fs.readFileSync(KEY_PATH);

        wxPay = new WxPay({
            appid: APPID,
            mchid: MCHID,
            publicKey: publicKey,
            privateKey: privateKeyContent,
            key: APIV3_KEY,
        });
        console.log('WeChat Pay initialized successfully');
    } else {
        console.warn('WeChat Pay not initialized: Missing environment variables');
    }
} catch (error) {
    console.error('Failed to initialize WeChat Pay:', error);
}

export const getWxPay = () => wxPay;

export const generatePaymentParams = async (description: string, outTradeNo: string, amount: number, openid: string) => {
    if (!wxPay) throw new Error('WeChat Pay not initialized');

    // Amount is in cents (CNY)
    const params = {
        description,
        out_trade_no: outTradeNo,
        notify_url: process.env.WX_PAY_NOTIFY_URL || 'https://your-domain.com/api/orders/notify', // Must be configured
        amount: {
            total: Math.round(amount * 100), // Convert Yuan to Cents
            currency: 'CNY',
        },
        payer: {
            openid,
        },
    };

    const result: any = await wxPay.transactions_jsapi(params);
    return result; // Contains prepay_id
};

export const getJsApiSignature = (prepayId: string) => {
    if (!wxPay || !privateKeyContent) throw new Error('WeChat Pay not initialized');
    
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const packageStr = `prepay_id=${prepayId}`;
    
    // V3 Signing:
    // message = appId + "\n" + timeStamp + "\n" + nonceStr + "\n" + packageStr + "\n"
    const message = `${APPID}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`;
    
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    const paySign = sign.sign(privateKeyContent, 'base64');
    
    return {
        appId: APPID,
        timeStamp,
        nonceStr,
        package: packageStr,
        signType: 'RSA',
        paySign,
    };
};

export const verifyNotification = async (headers: any, body: any) => {
    if (!wxPay) throw new Error('WeChat Pay not initialized');
    
    // Use library to verify
    // Note: The library expects raw req or specific structure. 
    // wxPay.verifySign(params)
    // params needs: timestamp, nonce, body, serial, signature
    
    const params = {
        timestamp: headers['wechatpay-timestamp'],
        nonce: headers['wechatpay-nonce'],
        body: typeof body === 'string' ? body : JSON.stringify(body),
        serial: headers['wechatpay-serial'],
        signature: headers['wechatpay-signature'],
    };
    
    const result = await wxPay.verifySign(params);
    if (!result) throw new Error('Invalid Signature');
    
    // Decrypt resource
    const resource = body.resource;
    const decrypted = wxPay.decipher_gcm(resource.ciphertext, resource.associated_data, resource.nonce, APIV3_KEY);
    
    return decrypted; // Contains out_trade_no, trade_state, etc.
};
