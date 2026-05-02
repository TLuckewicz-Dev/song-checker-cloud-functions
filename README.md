# Song Checker Cloud Functions

Firebase Cloud Functions project with the following HTTP functions:

- `helloWorld` — starter function that returns a greeting.
- `getSpotifyToken` — returns a Spotify API access token using the Client Credentials flow.
- `duplicateCheck` — looks up previous submissions of a Spotify track in the `songs` Firestore collection.

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

---

# Endpoint Reference

The sections below cover each HTTP endpoint individually: URLs, request setup in Postman, and example responses. Production URLs follow the pattern `https://us-central1-song-checker-5a454.cloudfunctions.net/<functionName>`; local emulator URLs follow the pattern `http://127.0.0.1:5001/song-checker-5a454/us-central1/<functionName>`.

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

## Call `duplicateCheck` From Postman

`duplicateCheck` queries the `songs` Firestore collection for documents whose `spotifyUri` matches the value in the request body, and returns the `created`, `roundName`, and `submitterName` for each match. Results are sorted with the most recently created submission first. An empty `matches` array means the song has not been submitted before.

### Local emulator URL

- `http://127.0.0.1:5001/song-checker-5a454/us-central1/duplicateCheck`

> Note: when running only the functions emulator (without the Firestore emulator), this function reads from your **production** Firestore database.

### Deployed (production) URL

- `https://us-central1-song-checker-5a454.cloudfunctions.net/duplicateCheck`

### Request setup in Postman

- Method: `POST` (any other method returns `405 Method Not Allowed`)
- URL: use either the local emulator URL or deployed URL above
- Headers:
  - `Content-Type: application/json`
- Body — select **raw** + **JSON** and paste:

```json
{
  "spotifyUri": "spotify:track:4cOdK2wGLETKBW3PvgPWqT"
}
```

Expected response (JSON):

```json
{
  "matches": [
    {
      "created": "2024-11-02T18:12:04Z",
      "roundName": "Round 14",
      "submitterName": "Tyler"
    },
    {
      "created": "2023-07-26T15:33:28Z",
      "roundName": "Round 3",
      "submitterName": "Sam"
    }
  ]
}
```

If `spotifyUri` is missing or empty, the response is `400` with `{"error": "spotifyUri is required"}`.
