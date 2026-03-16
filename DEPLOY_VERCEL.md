# Deploy to Vercel

## 1) Prerequisites
- Install Node.js LTS (includes `npm`)
- Install Vercel CLI:

```bash
npm i -g vercel
```

## 2) Deploy from this folder
Run in `d:\PINPOINT\WEBAPP`:

```bash
vercel
```

Then choose:
- `Set up and deploy` = `Y`
- Scope = your account/team
- Project name = `pinpoint` (or `Pinpoint`)
- Directory = `./`

For production deployment:

```bash
vercel --prod
```

## 3) Alias/domain notes
- If `pinpoint.vercel.app` is already used by another account, Vercel auto-assigns another alias (for this project it is `pinpoint-ten.vercel.app`).
- You can set another available alias by CLI:

```bash
vercel alias set <deployment-url> pinpoint-accounting-service.vercel.app
```

## 4) Verify after deploy
- Open: `https://pinpoint-ten.vercel.app`
- Test language switch `TH/EN`
- Test AI SEO form output
- Check mobile CTA call button `0927497442`
