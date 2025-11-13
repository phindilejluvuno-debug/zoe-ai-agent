import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import axios from "axios";
import cron from "node-cron";
import OpenAI from "openai";
import fs from "fs";

dotenv.config();
const app = express();
app.use(bodyParser.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Branding defaults
const BRAND_NAME = process.env.BRAND_NAME || "Zoe Digital Media";
const DEFAULT_TONE = process.env.DEFAULT_TONE || "luxury lifestyle";

/* 1) Generate Ad Copy */
async function generateAdCopy({ productName = 'your product', audience = 'general', tone = DEFAULT_TONE, goal = 'conversion' } = {}) {
  const prompt = `You are an expert advertising copywriter for a luxury lifestyle brand named ${BRAND_NAME}.\nWrite a persuasive, high-converting advertisement for "${productName}". Audience: ${audience}. Tone: ${tone}. Goal: ${goal}. Include a short headline (<=30 chars), primary text (<=125 chars), and a clear CTA. Provide one short image concept on a single line.`;
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [{ role: "system", content: `You are Zoe, a luxury-lifestyle ad assistant for ${BRAND_NAME}.` }, { role: "user", content: prompt }],
    max_tokens: 400,
    temperature: 0.7
  });
  return response.choices[0].message.content.trim();
}

/* 2) Image generation (DALL·E / OpenAI Images) */
async function generateAdImage(promptText) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('No OPENAI_API_KEY set — skipping image generation.');
    return null;
  }
  try {
    const resp = await openai.images.generate({
      model: "gpt-image-1",
      prompt: promptText,
      size: "1024x1024",
    });
    const base64 = resp.data[0].b64_json;
    const fileName = `zoe_ad_${Date.now()}.png`;
    fs.writeFileSync(fileName, Buffer.from(base64, "base64"));
    console.log("Ad image saved:", fileName);
    return fileName;
  } catch (err) {
    console.error("Image generation error:", err?.message || err);
    return null;
  }
}

/* 3) Facebook posting (Page post) */
async function postToFacebook(text) {
  const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
  const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
  if (!PAGE_ID || !ACCESS_TOKEN) {
    console.warn('Facebook credentials missing, skipping Facebook post.');
    return { ok: false, reason: 'no_credentials' };
  }
  try {
    const resp = await axios.post(`https://graph.facebook.com/${PAGE_ID}/feed`, null, {
      params: { message: text, access_token: ACCESS_TOKEN }
    });
    console.log('Posted to Facebook:', resp.data.id || resp.data);
    return { ok: true, id: resp.data.id || null };
  } catch (err) {
    console.error('Facebook publish error', err?.response?.data || err?.message || err);
    return { ok: false, error: err?.response?.data || err?.message };
  }
}

/* 4) Send email via SendGrid */
async function sendEmail(subject, content) {
  const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
  const FROM = process.env.EMAIL_FROM;
  const TO_LIST = (process.env.EMAIL_TO_LIST || '').split(',').map(s=>s.trim()).filter(Boolean);
  if (!SENDGRID_KEY || !FROM || TO_LIST.length === 0) {
    console.warn('SendGrid config incomplete — skipping email send.');
    return { ok: false, reason: 'no_credentials_or_recipients' };
  }
  const payload = {
    personalizations: [{ to: TO_LIST.map(email => ({ email })) }],
    from: { email: FROM },
    subject,
    content: [{ type: 'text/plain', value: content }]
  };
  try {
    const resp = await axios.post('https://api.sendgrid.com/v3/mail/send', payload, {
      headers: { Authorization: `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json' }
    });
    console.log('Email sent, status', resp.status);
    return { ok: true, status: resp.status };
  } catch (err) {
    console.error('SendGrid error', err?.response?.data || err?.message || err);
    return { ok: false, error: err?.response?.data || err?.message };
  }
}

/* 5) Google Ads stub (placeholder) */
async function createGoogleAd(copy) {
  console.log('Google Ads stub — integrate google-ads-api and OAuth for full automation.');
  return { ok: false, reason: 'not_implemented' };
}

/* 6) The core ad cycle (generate -> image -> publish) */
async function runAdCycle({ productName='Your Product' } = {}) {
  try {
    const ad = await generateAdCopy({ productName });
    console.log('Ad copy generated:\n', ad);
    const img = await generateAdImage(ad);
    const fb = await postToFacebook(ad);
    const mail = await sendEmail(`${productName} — ${BRAND_NAME}`, ad);
    const ga = await createGoogleAd(ad);
    return { ad, img, fb, mail, ga };
  } catch (err) {
    console.error('runAdCycle error', err?.message || err);
    return { error: err?.message || err };
  }
}

// Scheduler: every 4 hours
cron.schedule('0 */4 * * *', () => {
  console.log('Scheduled run at', new Date().toISOString());
  runAdCycle();
});

// Manual trigger endpoint (POST /generate-ad) accepts optional JSON { "productName": "..." }
app.post('/generate-ad', async (req, res) => {
  const productName = req.body?.productName || process.env.DEFAULT_PRODUCT || 'Your Product';
  const result = await runAdCycle({ productName });
  res.json({ status: 'ok', result });
});

// Basic health check
app.get('/status', (req, res) => res.json({ status: 'zoe-ai-online', time: new Date().toISOString() }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Zoe AI running on port ${PORT}`));
