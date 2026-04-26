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

const spotifyClientId = defineSecret("SPOTIFY_CLIENT_ID");
const spotifyClientSecret = defineSecret("SPOTIFY_CLIENT_SECRET");

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
  logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");
});

export const getSpotifyToken = onRequest(
  { secrets: [spotifyClientId, spotifyClientSecret] },
  async (request, response) => {
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
  },
);
