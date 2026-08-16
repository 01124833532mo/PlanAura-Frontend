# Planura — Frontend

The customer- and vendor-facing web client for **Planura**, an AI-powered event
planning and vendor booking marketplace. Built with [Angular](https://angular.dev)
and server-side rendering.

> Looking for the API? See [PlanAura-Backend](../../../PlanAura-Backend).

---

## What this app does

Planura connects people planning an event (weddings, engagements, birthdays,
corporate events) with verified vendors (wedding halls, photographers, DJs,
caterers, decorators, makeup artists). This repository is the client through
which:

- **Customers** search and filter vendors, compare prices and packages, get
  an AI-generated event plan and budget split, preview a setup with the AI
  visualizer, book a vendor, sign a digital contract, and pay online.
- **Vendors** manage their profile, availability calendar, incoming booking
  requests, payments and reviews from a dashboard.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [Angular 21](https://angular.dev) (standalone components) |
| Rendering | Angular SSR (`@angular/ssr`) on an Express server |
| Styling / UI | Bootstrap 5, Font Awesome |
| Charts | ApexCharts (`ng-apexcharts`) — vendor & admin analytics |
| Payments | Stripe.js (`@stripe/stripe-js`) |
| Alerts / dialogs | SweetAlert2 |
| Loading states | ngx-spinner |
| Testing | Vitest |
| Tooling | Angular CLI, Prettier, TypeScript |

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- npm 10+ (this project is pinned to `npm@10.8.2` via `packageManager`)
- The [Planura backend](../../../PlanAura-Backend) running locally, or a reachable API URL

### Install

```bash
git clone https://github.com/PlanAuraa/PlanAura-Frontend.git
cd PlanAura-Frontend
npm install
```

### Environment configuration

Create your local environment file(s) under `src/environments/` with the
values your setup needs, for example:

```ts
export const environment = {
  production: false,
  apiUrl: 'https://localhost:7000/api',
  stripePublishableKey: 'pk_test_...',
};
```

> Never commit real API keys or secrets. Use `pk_test_...` Stripe keys for
> local development.

### Run the dev server

```bash
npm start
# or: ng serve
```

Visit `http://localhost:4200/`. The app reloads automatically as you edit
source files.

### Build for production

```bash
ng build
```

Build artifacts are written to `dist/`. The production build is optimized
for performance by default.

### Run with SSR

```bash
npm run build
node dist/Planura-Client/server/server.mjs
```

### Run tests

```bash
npm test
```

Unit tests run with [Vitest](https://vitest.dev/).

---

## Code scaffolding

This project uses the Angular CLI for scaffolding:

```bash
ng generate component component-name
```

See all available schematics:

```bash
ng generate --help
```

---

## Project structure

```
PlanAura-Frontend/
├── public/            # Static assets served as-is
├── src/
│   ├── app/            # Application code (standalone components, routes, services)
│   ├── environments/    # Environment configuration (API URL, Stripe key, ...)
│   ├── index.html
│   ├── main.ts          # Browser bootstrap
│   └── main.server.ts   # SSR bootstrap
├── angular.json
├── package.json
└── tsconfig*.json
```

---

## Branching & contributing

- `develop` is the active integration branch — branch off it for new work.
- Run `npm test` and `ng build` locally before opening a pull request.
- This repo uses Prettier for formatting (`.prettierrc`) — run your editor's
  formatter or `npx prettier --write .` before committing.
- Keep commits scoped and use clear messages (e.g. `feat: vendor availability calendar`,
  `fix: booking form validation`).

---

## Team

| Role | Name |
|---|---|
| Team Lead | Mohamed Wahba |
| Team Member | Mohamed Hamdy |
| Team Member | Mahmoud Rehan |
| Team Member | Ibrahim Mohamed |
| Team Member | Doaa Ahmed |

---

## License

No license has been set for this project yet.
