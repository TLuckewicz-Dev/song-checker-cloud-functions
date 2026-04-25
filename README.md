# Song Checker Cloud Functions

Simple Firebase Cloud Functions project with a starter HTTP function: `helloWorld`.

## Prerequisites

- Node.js installed
- Firebase CLI installed and authenticated (`firebase login`)

## Run Locally

1. Install dependencies:
   - `cd functions`
   - `npm install`
2. Start the emulator:
   - Make sure you are in the `functions` folder before running this command.
   - `npm run serve`

## Deploy

From the repository root:

- `firebase deploy --only functions`

## Call `helloWorld` From Postman

### Local emulator URL

- `http://127.0.0.1:5001/song-checker-5a454/us-central1/helloWorld`

Use this when `npm run serve` is running in the `functions` folder.

### Deployed (production) URL

- `https://us-central1-song-checker-5a454.cloudfunctions.net/helloWorld`

### Request setup in Postman

- Method: `GET`
- URL: use either the local emulator URL or deployed URL above
- Body: none
- Headers: none required

Expected response:

- `Hello from Firebase!`
