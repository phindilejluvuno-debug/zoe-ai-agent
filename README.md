# Zoe AI — 24/7 Luxury-Lifestyle Advertising Assistant

Zoe Digital Media's deploy-ready project. This package creates an AI agent that:
- Generates ad copy (OpenAI)
- Creates visuals (OpenAI Images)
- Posts to a Facebook Page
- Sends email campaigns via SendGrid
- Schedules ad creation every 4 hours

## Quick steps to deploy on Render (free)

1. Create a new **public** GitHub repository (e.g. `zoe-ai-agent`) and push the contents of this package.
2. Rename `.env.example` to `.env` and fill in your keys, OR add the environment variables in Render dashboard.
3. Go to: `https://render.com/deploy?repo=https://github.com/YOUR-USERNAME/zoe-ai-agent`
4. Render will prompt for environment variables — paste your keys (OPENAI_API_KEY, SENDGRID_API_KEY, FACEBOOK_ACCESS_TOKEN, etc.).
5. Click **Deploy**.

## Manual test
After deployment, visit:
- `https://<your-render-url>/status` to check status
- `POST https://<your-render-url>/generate-ad` to trigger an ad generation immediately (optional JSON body: { "productName": "Example" })

## Notes & Security
- Do NOT commit secrets to GitHub. Use Render's environment variables UI.
- Facebook posting requires a Page access token with publish permissions.
- OpenAI image generation uses model `gpt-image-1` (charges may apply).

## Need help?
If you want, I can:
- Walk you through pushing this repo to GitHub
- Walk you through the Render deploy UI and pasting the .env values
