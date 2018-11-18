require('dotenv').config()
const express = require('express')
const session = require('express-session')
const socketio = require('socket.io')
const http = require('http')
const morgan = require('morgan')
const fetch = require('node-fetch')

const passport = require('passport')
const SpotifyStrategy = require('passport-spotify').Strategy

const PORT = process.env.PORT || 8000
const CLIENT_URL = process.env.NODE_ENV === "production" ? "https://cc-instafeed.herokuapp.com" : "http://localhost:3000"
const SERVER_URL = process.env.NODE_ENV === "production" ? "https://cc-instafeed.herokuapp.com" : "http://localhost:8000"

const SPOTIFY_CONFIG = {
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: `${SERVER_URL}/auth/spotify/callback/`
}

const app = express()
const server = http.createServer(app)
const io = socketio(server)

/**************
 * MIDDLEWARE *
 **************/

app.use(express.static('public'))
// app.use(morgan('dev'))
/**
 * saveUnitialized: true allows us to attach the socket id
 * to the session before we have authenticated with twitter
 */
app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true,
}))
app.use(passport.initialize())
app.use(passport.session())

/**
 * Extracts query parameter set on the React client request 
 * to /auth/instagram and attaches it to variable on session
 */
addSocketIdToSession = (req, res, next) => {
  req.session.socketId = req.query.socketId
  next()
}

passport.use(
  new SpotifyStrategy(SPOTIFY_CONFIG, (accessToken, refreshToken, expires_in, profile, done) => {
    let user = { ...profile, accessToken, refreshToken }
    return done(null, user)
  }
  )
)

passport.serializeUser((user, done) => { done(null, user.id) })
passport.deserializeUser((id, done) => { done(null, id) })

app.get('/auth/spotify', addSocketIdToSession, passport.authenticate('spotify'), (req, res) => {
  // The request will be redirected to spotify for authentication, so this
  // function will not be called.
})

app.get(
  '/auth/spotify/callback',
  passport.authenticate('spotify', {
    failureRedirect: '/login',
    scope: ['user-read-email', 'user-read-private'],
    showDialog: true
  }), (req, res) => {
    io.in(req.session.socketId).emit('user', req.user)
  }
)

app.get('/user/:accessToken', (req, res) => {
  getUser(req.params.accessToken)
    .then((response) => {
      console.log(response)
      res.send(response)
    })
})

/**
 * returns a promise that resolves user data
 */
const getUser = (accessToken) => {
  return fetch(`https://api.spotify.com/v1/me`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
    .then((response) => response.json())
    .then((response) => {
      return { ...response, accessToken, username: response.id }
    })
    .catch((err) => { console.log(err) })
}
server.listen(PORT, () => {
  console.log(`Listening on ${PORT}`)
})