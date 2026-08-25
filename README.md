# Board — Personal Kanban

React + Vite + Firebase Firestore kanban with three columns, categories, and recurring tasks.

## Develop

```bash
npm install
npm run dev
```

## Firebase

Project: `bigvig-kanban`

1. Enable **Cloud Firestore** in the [Firebase Console](https://console.firebase.google.com/project/bigvig-kanban/firestore).
2. Deploy rules:

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest deploy --only firestore:rules --project bigvig-kanban
```

Optional env overrides (otherwise defaults in `src/firebase.ts` are used):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Features

- Create / edit / delete tasks (name, description, due date, category, column)
- Drag between Not started → In progress → Completed
- Custom categories with colors
- Recurring tasks reset to Not started with the next due date when completed
