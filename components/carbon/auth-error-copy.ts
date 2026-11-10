export const authErrorCopy: Record<string, string> = {
  access_denied: "Strava connection was canceled.",
  invalid_state: "The Strava login session expired. Try connecting again.",
  missing_activity_scope: "Activity read permission is required to import rides.",
  missing_athlete: "Strava did not return an athlete profile.",
  token_exchange_failed: "Strava token exchange failed. Check your app settings.",
  missing_strava_config: "Add your Strava OAuth values to .env before connecting.",
  invalid_strava_client_id:
    "STRAVA_CLIENT_ID must be the numeric Client ID from your Strava API app, not the placeholder text.",
  invalid_strava_secret_config:
    "Replace STRAVA_CLIENT_SECRET and TOKEN_ENCRYPTION_KEY placeholder values in .env before connecting."
};
