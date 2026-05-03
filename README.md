# Çağrı Bilginer — Portfolio

Personal portfolio (Next.js, TypeScript, Tailwind). Forked and adapted from a friend’s template.

## Highlights

- Hero with interactive 3D scene (React Three Fiber)
- About, Experience, Skills, Work, and contact (FormSubmit)
- Static export for GitHub Pages

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
```

## Deployment

GitHub Actions: [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

- Branch: `main`
- Output: static export (`out/`)
- Live site: [https://cago8.github.io/](https://cago8.github.io/)

## Site content

Name, email, social links, and FormSubmit target live in [`config/site.ts`](config/site.ts). Update that file (and replace assets under `public/`) when your details change.

## Contact

- GitHub: [cago8](https://github.com/cago8)
- LinkedIn: [cagribilginer](https://www.linkedin.com/in/cagribilginer)
