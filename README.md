# Song Checker Cloud Functions

Firebase Cloud Functions project with the following HTTP functions:

- `helloWorld` — starter function that returns a greeting.
- `getSpotifyToken` — returns a Spotify API access token using the Client Credentials flow.

## Prerequisites

- Node.js installed
- Firebase CLI installed and authenticated (`firebase login`)

## Run Locally

1. Install dependencies:
   - `cd functions`
   - `npm install`
2. Set up local secrets for `getSpotifyToken` (see [Spotify secrets setup](#spotify-secrets-setup) below).
3. Start the emulator:
   - Make sure you are in the `functions` folder before running this command.
   - `npm run serve`

## Deploy

From the repository root:

- `firebase deploy --only functions`

## Spotify secrets setup

`getSpotifyToken` reads two values from Google Cloud Secret Manager: `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`. Get these from your app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).

### Production (one-time setup)

From the repository root:

```bash
firebase functions:secrets:set SPOTIFY_CLIENT_ID
firebase functions:secrets:set SPOTIFY_CLIENT_SECRET
```

Each command opens a prompt to paste the value. Re-running creates a new secret version, which is what you do when rotating credentials. After setting (or rotating) values, redeploy so the function picks up the new version reference:

```bash
firebase deploy --only functions:getSpotifyToken
```

### Local emulator

Create `functions/.secret.local` (gitignored automatically) with the same values:

```bash
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

The emulator reads this file on startup and substitutes it for real Secret Manager calls.

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

## Call `getSpotifyToken` From Postman

### Local emulator URL

- `http://127.0.0.1:5001/song-checker-5a454/us-central1/getSpotifyToken`

### Deployed (production) URL

- `https://us-central1-song-checker-5a454.cloudfunctions.net/getSpotifyToken`

### Request setup in Postman

- Method: `GET`
- URL: use either the local emulator URL or deployed URL above
- Body: none
- Headers: none required

Expected response (JSON):

```json
{
  "access_token": "BQD...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

The token is valid for `expires_in` seconds (typically 3600) and can be used as a Bearer token against the Spotify Web API.
