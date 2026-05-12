# Heads-Up Tournament

Fresh clean build for a 32-player heads-up poker tournament.

## Local start

```powershell
cd C:\projects\heads-up-tournament
npm install
npm run dev
```

## Build test

```powershell
npm run build
```

## GitHub push

Create an EMPTY GitHub repository named:

```text
heads-up-tournament
```

Do not add a README, .gitignore, or license on GitHub.

Then run:

```powershell
cd C:\projects\heads-up-tournament
git init
git branch -M main
git add .
git commit -m "Initial heads-up tournament app"
git remote add origin https://github.com/highhandpro/heads-up-tournament.git
git push -u origin main
```

## Vercel

Import `highhandpro/heads-up-tournament`.

- Framework: Vite
- Build command: npm run build
- Output directory: dist
