const express = require('express'); // Express web server framework
const request = require('request'); // "Request" library
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const PORT = process.env.PORT || 8000;
const path = require('path');
require('dotenv').config();

const BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000';
const SERVER_URL = process.env.NODE_ENV === 'production' ? 'https://cc-spotifyvoice.herokuapp.com' : 'http://localhost:8000';
const ENVIRONMENT_URL = process.env.NODE_ENV === 'production' ? SERVER_URL : BASE_URL;

const client_id = process.env.CLIENT_ID; // Your client id
const client_secret = process.env.CLIENT_SECRET; // Your secret
const redirect_uri = `${SERVER_URL}/callback/`; // Your redirect uri
const stateKey = 'spotify_auth_state';

const app = express();


/*
  NOTE
  You will need to configure a .env file with 
  your client id and client secret like so:

  CLIENT_ID=XXXXXXX
  CLIENT_SECRET=XXXXXXX
*/

const randomStr = (length) => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// Mount the middleware at "/static" to serve static content only when their request path is prefixed with "/static".
app.use(express.static(path.resolve(__dirname, 'build'))).use(cookieParser());

app.get('/login', (req, res) => {
  const state = randomStr(16);
  res.cookie(stateKey, state);
  // your application requests authorization
  const scope = 'user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      /* this is where the redirect will take place when the 
      'code' is sent as a url param. This should always point
      to the server url */
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', (req, res) => {
  // your application requests refresh and access tokens after checking the state parameter

  // req.query returns all url params as a javascript object

  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;
  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        const {
          access_token,
          refresh_token
        } = body;
        const options = {
          url: 'https://api.spotify.com/v1/me',
          headers: {
            'Authorization': 'Bearer ' + access_token
          },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, (error, response, body) => {
          // body contains authenticated user's info
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect(`${ENVIRONMENT_URL}/#` +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));

      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});