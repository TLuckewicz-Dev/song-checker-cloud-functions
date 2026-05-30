# Song Checker Cloud Functions

Firebase Cloud Functions project with the following HTTP functions:

- `helloWorld` — starter function that returns a greeting.
- `getSpotifyToken` — returns a Spotify API access token using the Client Credentials flow.
- `duplicateCheck` — looks up previous submissions of a Spotify track in the `songs` Firestore collection.
- `askOpenAI` — answers natural-language questions about the Music League submission history by sending every document in the `songs` Firestore collection to OpenAI (`gpt-5-mini`) as context alongside the user's prompt.

## Prerequisites

- Node.js installed
- Firebase CLI installed and authenticated (`firebase login`)

## Run Locally

1. Install dependencies:
   - `cd functions`
   - `npm install`
2. Set up local secrets:
   - `getSpotifyToken` — see [Spotify secrets setup](#spotify-secrets-setup) below.
   - `askOpenAI` — see [OpenAI secret setup](#openai-secret-setup) below.
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

## OpenAI secret setup

`askOpenAI` reads one value from Google Cloud Secret Manager: `OPENAI_API_KEY`. Create one from the [OpenAI API Keys page](https://platform.openai.com/api-keys).

### Production (one-time setup)

From the repository root:

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

The command opens a prompt to paste the value. Re-running creates a new secret version, which is what you do when rotating credentials. After setting (or rotating) the value, redeploy so the function picks up the new version reference:

```bash
firebase deploy --only functions:askOpenAI
```

### Local emulator

Add the key to `functions/.secret.local`:

```bash
OPENAI_API_KEY=sk-your_key_here
```

If this entry is missing, the emulator transparently falls back to Secret Manager using your `firebase login` credentials, so calls still succeed locally as long as the production secret has been set. Note that the OpenAI call always hits the real OpenAI API and bills your account, even when running in the emulator.

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

`getSpotifyToken` exchanges this app's Spotify client credentials for a short-lived API access token using Spotify's Client Credentials flow. The returned token can be used as a Bearer token against the public Spotify Web API.

Calls must include a `group` field matching the expected group value (currently `908beanbagboys`). This is a lightweight shared-secret gate — not a real authorization mechanism — intended to discourage incidental hits on the public URL.

### Local emulator URL

- `http://127.0.0.1:5001/song-checker-5a454/us-central1/getSpotifyToken`

### Deployed (production) URL

- `https://us-central1-song-checker-5a454.cloudfunctions.net/getSpotifyToken`

### Request setup in Postman

- Method: `POST` (any other method returns `405 Method Not Allowed`)
- URL: use either the local emulator URL or deployed URL above
- Headers:
  - `Content-Type: application/json`
- Body — select **raw** + **JSON** and paste:

```json
{
  "group": "908beanbagboys"
}
```

Expected response (JSON):

```json
{
  "access_token": "BQD...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

The token is valid for `expires_in` seconds (typically 3600) and can be used as a Bearer token against the Spotify Web API.

Error responses:

- `403` with `{"error": "Forbidden"}` if `group` does not match.
- `502` with `Failed to obtain Spotify token` if the upstream Spotify call returns an error.

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

## Call `askOpenAI` From Postman

`askOpenAI` answers natural-language questions about the friend group's Music League by forwarding the user's prompt to OpenAI (`gpt-5-mini`) along with a pipe-delimited dump of every document in the `songs` Firestore collection — including title, artist, album, submitter, round, date, total points, the submitter's comment, and each individual vote and voter comment. The corpus is rebuilt at most every 5 minutes per warm container and cached in memory, so back-to-back calls do not re-read Firestore. Each call is one-shot; the model has no memory of previous requests.

Calls must include a `group` field matching the expected group value (currently `908beanbagboys`). This is a lightweight shared-secret gate — not a real authorization mechanism — intended to discourage incidental hits on the public URL. Prompts must be 500 characters or fewer.

### Local emulator URL

- `http://127.0.0.1:5001/song-checker-5a454/us-central1/askOpenAI`

> Note: same as `duplicateCheck`, running only the functions emulator reads from your **production** Firestore database. The OpenAI call also always hits the real OpenAI API and bills your account.

### Deployed (production) URL

- `https://us-central1-song-checker-5a454.cloudfunctions.net/askOpenAI`

### Request setup in Postman

- Method: `POST` (any other method returns `405 Method Not Allowed`)
- URL: use either the local emulator URL or deployed URL above
- Headers:
  - `Content-Type: application/json`
- Body — select **raw** + **JSON** and paste:

```json
{
  "group": "908beanbagboys",
  "prompt": "What genre does Rik tend to submit?"
}
```

Expected response (JSON):

```json
{
  "reply": "Based on the submissions, Rik leans heavily toward pop and hip-hop...",
  "model": "gpt-5-mini"
}
```

Error responses:

- `400` with `{"error": "prompt is required"}` if `prompt` is missing or not a string.
- `400` with `{"error": "prompt must be 500 characters or fewer"}` if the prompt exceeds the length cap.
- `403` with `{"error": "Forbidden"}` if `group` does not match.
- `502` with `{"error": "OpenAI request failed"}` if the upstream OpenAI call returns an error.

Off-topic questions (anything not about Music League or music in general) still return a `200` response, but the `reply` is a single sentence: `"This is not a relevant question to Music League."`
