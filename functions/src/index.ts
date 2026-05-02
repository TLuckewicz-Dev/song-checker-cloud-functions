/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import cors from "cors";

initializeApp();
const db = getFirestore();

const spotifyClientId = defineSecret("SPOTIFY_CLIENT_ID");
const spotifyClientSecret = defineSecret("SPOTIFY_CLIENT_SECRET");

// Origins allowed to call these functions from a browser. Update this list
// when adding new frontend domains (production, preview channels, custom
// domains, etc.). Same-origin / non-browser callers are unaffected.
const corsHandler = cors({
  origin: [
    "https://song-checker-5a454.web.app",
    "https://song-checker-5a454.firebaseapp.com",
    "http://localhost:5173",
  ],
});

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

export const helloWorld = onRequest((request, response) => {
  corsHandler(request, response, () => {
    logger.info("Hello logs!", { structuredData: true });
    response.send("Hello from Firebase!");
  });
});

/**
 * Public HTTPS endpoint that exchanges this app's Spotify client credentials
 * for a short-lived API access token using Spotify's Client Credentials flow.
 * The client ID and secret are stored as Firebase secrets and injected at
 * runtime; the token returned is suitable for calling public Spotify Web API
 * endpoints (search, track lookup, etc.) that don't require user-level auth.
 *
 * Request:
 *   GET /getSpotifyToken
 *   (no parameters or body required)
 *
 * Response (200):
 *   {
 *     "access_token": "BQDx...redacted...",
 *     "token_type": "Bearer",
 *     "expires_in": 3600
 *   }
 *
 * Returns 502 if Spotify rejects the credentials request, and 500 for any
 * other unexpected error.
 */
export const getSpotifyToken = onRequest(
  { secrets: [spotifyClientId, spotifyClientSecret] },
  (request, response) => {
    corsHandler(request, response, async () => {
      try {
        const credentials = Buffer.from(
          `${spotifyClientId.value()}:${spotifyClientSecret.value()}`,
        ).toString("base64");

        const tokenResponse = await fetch(
          "https://accounts.spotify.com/api/token",
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${credentials}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
          },
        );

        if (!tokenResponse.ok) {
          const errorBody = await tokenResponse.text();
          logger.error("Spotify token request failed", {
            status: tokenResponse.status,
            body: errorBody,
          });
          response.status(502).send("Failed to obtain Spotify token");
          return;
        }

        const data = (await tokenResponse.json()) as {
          access_token: string;
          token_type: string;
          expires_in: number;
        };

        response.json(data);
      } catch (error) {
        logger.error("Unexpected error fetching Spotify token", error);
        response.status(500).send("Internal error");
      }
    });
  },
);

type DuplicateMatch = {
  created: string;
  roundName: string;
  submitterName: string;
};

/**
 * Public HTTPS endpoint (POST only) that checks whether a given Spotify track
 * has already been submitted in a previous round. It queries the `songs`
 * collection for documents whose `spotifyUri` matches the request payload and
 * returns the `created`, `roundName`, and `submitterName` for each match,
 * sorted with the most recently created submission first.
 *
 * Request:
 *   POST /duplicateCheck
 *   Content-Type: application/json
 *   {
 *     "spotifyUri": "spotify:track:4cOdK2wGLETKBW3PvgPWqT"
 *   }
 *
 * Response (200):
 *   {
 *     "matches": [
 *       {
 *         "created": "2024-11-02T18:12:04Z",
 *         "roundName": "Round 14",
 *         "submitterName": "Tyler"
 *       },
 *       {
 *         "created": "2023-07-26T15:33:28Z",
 *         "roundName": "Round 3",
 *         "submitterName": "Sam"
 *       }
 *     ]
 *   }
 *
 * Returns an empty `matches` array when the song has not been submitted before.
 * Returns 400 if `spotifyUri` is missing, and 405 for any non-POST method.
 */
export const duplicateCheck = onRequest((request, response) => {
  corsHandler(request, response, async () => {
    try {
      if (request.method !== "POST") {
        response.set("Allow", "POST");
        response.status(405).json({ error: "Method not allowed" });
        return;
      }

      const spotifyUri = request.body?.spotifyUri as string | undefined;

      if (!spotifyUri || typeof spotifyUri !== "string") {
        response.status(400).json({ error: "spotifyUri is required" });
        return;
      }

      const snapshot = await db
        .collection("songs")
        .where("spotifyUri", "==", spotifyUri)
        .get();

      const matches: DuplicateMatch[] = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            created: data.created as string,
            roundName: data.roundName as string,
            submitterName: data.submitterName as string,
          };
        })
        .sort((a, b) => b.created.localeCompare(a.created));

      response.json({ matches });
    } catch (error) {
      logger.error("duplicateCheck failed", error);
      response.status(500).send("Internal error");
    }
  });
});
