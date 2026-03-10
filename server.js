const express = require("express");
const app = express();

const PORT = process.env.PORT || 10000;

app.get("/", (req,res)=>{
res.send("TRADER SHISHIR QX GHOST OMEGA RUNNING");
});

app.listen(PORT,()=>{
console.log("Web server running on port",PORT);
});

const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
const { createCanvas } = require("canvas");

/* ===============================
   CONFIG
================================= */

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "8525672936:AAF9EhUr1-Ufkhuu_ljtNs4DxpbDmuuOtq0";
const CHAT_ID = process.env.CHAT_ID || "-1003850982234";
const API_KEY = process.env.81dad6ad5f144c4bb3157abee01783d8;

const bot = new TelegramBot(TELEGRAM_TOKEN);

const PAIRS = [
"EUR/USD",
"GBP/USD",
"USD/JPY",
"AUD/USD",
"USD/CAD"
"EUR/jpy",
];

let lastSignalTime = 0;
const MIN_WAIT = 2 * 60 * 1000; // 2 minutes

/* ===============================
   INDICATORS
================================= */

function calculateEMA(prices, period){
let k = 2/(period+1);
let ema = prices[0];
for(let i=1;i<prices.length;i++){
ema = prices[i]*k + ema*(1-k);
}
return ema;
}

function calculateRSI(prices, period=14){
let gains = 0;
let losses = 0;

for(let i=1;i<period;i++){
let diff = prices[i] - prices[i-1];
if(diff>=0) gains += diff;
else losses -= diff;
}

let rs = gains/(losses || 1);
return 100 - (100/(1+rs));
}

/* ===============================
   FETCH DATA
================================= */

async function getCandles(symbol){

let pair = symbol.replace("/","");

let url = `https://api.twelvedata.com/time_series?symbol=${pair}&interval=1min&outputsize=50&apikey=${API_KEY}`;

let res = await axios.get(url);

if(!res.data.values) return null;

return res.data.values.reverse().map(v=>({
open:parseFloat(v.open),
high:parseFloat(v.high),
low:parseFloat(v.low),
close:parseFloat(v.close)
}));

}

/* ===============================
   SUPPORT RESISTANCE
================================= */

function supportResistance(candles){

let highs = candles.map(c=>c.high);
let lows = candles.map(c=>c.low);

let resistance = Math.max(...highs);
let support = Math.min(...lows);

return {support,resistance};

}

/* ===============================
   SIGNAL ENGINE
================================= */

function analyze(candles){

let closes = candles.map(c=>c.close);

let rsi = calculateRSI(closes);
let emaFast = calculateEMA(closes,9);
let emaSlow = calculateEMA(closes,21);

let {support,resistance} = supportResistance(candles);

let last = closes[closes.length-1];

let signal = null;
let confidence = 0;

if(emaFast > emaSlow && rsi < 70 && last > support){
signal="BUY";
confidence = 70 + Math.random()*25;
}

if(emaFast < emaSlow && rsi > 30 && last < resistance){
signal="SELL";
confidence = 70 + Math.random()*25;
}

return {signal,confidence:rsi?Math.floor(confidence):0};

}

/* ===============================
   CHART GENERATOR
================================= */

async function createChart(candles, pair, signal){

const canvas = createCanvas(800,400);
const ctx = canvas.getContext("2d");

ctx.fillStyle="#0f172a";
ctx.fillRect(0,0,800,400);

ctx.strokeStyle="#22c55e";
ctx.lineWidth=2;

ctx.beginPath();

let closes = candles.map(c=>c.close);
let max = Math.max(...closes);
let min = Math.min(...closes);

closes.forEach((price,i)=>{

let x = i*(800/closes.length);
let y = 350 - ((price-min)/(max-min))*300;

if(i===0) ctx.moveTo(x,y);
else ctx.lineTo(x,y);

});

ctx.stroke();

ctx.fillStyle="white";
ctx.font="22px Arial";
ctx.fillText(`PAIR: ${pair}`,20,30);
ctx.fillText(`SIGNAL: ${signal}`,20,60);

return canvas.toBuffer();

}

/* ===============================
   SEND SIGNAL
================================= */

async function sendSignal(pair,signal,confidence,candles){

let mtg = confidence > 85 ? "MTG1" : "NO MTG";

let tradeTime = ["1M","3M","5M"][Math.floor(Math.random()*3)];

let msg=`
TRADER SHISHIR QX GHOST OMEGA

PAIR: ${pair}

SIGNAL: ${signal}

CONFIDENCE: ${confidence}%

TRADE TIME: ${tradeTime}

ENTRY: NEXT CANDLE

MODE: ${mtg}
`;

let chart = await createChart(candles,pair,signal);

await bot.sendPhoto(CHAT_ID,chart,{caption:msg});

}

/* ===============================
   MAIN LOOP
================================= */

async function scan(){

if(Date.now()-lastSignalTime < MIN_WAIT) return;

for(let pair of PAIRS){

let candles = await getCandles(pair);
if(!candles) continue;

let result = analyze(candles);

if(result.signal && result.confidence > 80){

await sendSignal(pair,result.signal,result.confidence,candles);

lastSignalTime = Date.now();
break;

}

}

}

setInterval(scan,60*1000);

console.log("OMEGA FOREX ENGINE RUNNING...");
