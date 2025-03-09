// @ts-types="npm:@types/express@5.0.0"
import express from "npm:express@4.21.2";
import cors from "npm:cors";
import bodyParser from "npm:body-parser";
// @ts-types="npm:@types/axios"
import axios from "npm:axios";
import { Buffer } from "node:buffer";
import jose from "npm:jose"

const app = express();

app.use(cors());
app.use(bodyParser.json());

const redirectUri = Deno.env.get("DEV_STATE") === "dev"
  ? Deno.env.get("DEV_REDIRECT_URI")
  : Deno.env.get("PROD_REDIRECT_URI");
const clientId = Deno.env.get("CLIENT_ID");
const clientSecret = Deno.env.get("CLIENT_SECRET");

if (!redirectUri || !clientId || !clientSecret) {
  console.error("Missing environment variables.");
  Deno.exit(1);
}

app.get("/api/health", (_, res) => {
  res.send("OK");
});

app.get("/api/spotify-authenticate", (_, res) => {
  const params = new URLSearchParams({
    scope:
      "user-read-playback-state user-modify-playback-state user-read-currently-playing",
    response_type: "code",
    redirect_uri: redirectUri,
    client_id: clientId,
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  res.redirect(authUrl);
});

app.get("/api/auth-callback", async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      console.error("No auth code provided.");
      res.status(400).send("No auth code provided.");
    }

    const data = new URLSearchParams();
    data.append("grant_type", "authorization_code");
    data.append("code", code as string);
    data.append("redirect_uri", redirectUri);

    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      data,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${
            Buffer.from(clientId + ":" + clientSecret).toString("base64")
          }`,
        },
      },
    );

    const userdata = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${response.data.access_token}`,
      },
    });

    res.redirect(
      `displaything://auth-success?access_token=${response.data.access_token}&refresh_token=${response.data.refresh_token}&expires_in=${response.data.expires_in}&user_id=${userdata.data.id}`,
    );
    // deno-lint-ignore no-explicit-any
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      res.status(error.response?.status || 500).send(error.response?.data);
    } else {
      console.error(error);
      res.status(500).send("An error occurred from the server.");
    }
  }
});

app.listen(8080, () => {
  console.log("Server running on port 8080");
});
