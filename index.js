const express = require('express')
const app = express()
const cookieParser = require('cookie-parser')
const session = require('express-session')
const port =  (process.env.PORT || 5000)

const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth2')
const FacebookStrategy = require('passport-facebook')

//const google_data = require('./google.secret.json')
//const facebook_data = require('./facebook.secret.json')

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: "https://i228678.herokuapp.com/auth/google/callback",
    passReqToCallback: true
  },
  function(request, accessToken, refreshToken, profile, done) {
      process.nextTick(() => {
        return done(null, profile)
      })
  }
));


passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: "https://i228678.herokuapp.com/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      return done(null, profile);
    });
  }
))

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(session({
    secret: 'sdadasdsa',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
}))
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/public'));


function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/login')
}


app.get('/', ensureAuthenticated, (req, res) => {
    res.render('profile')
})

app.get('/login', (req, res) => {
    res.render('login')
})

app.get('/auth/google', 
    passport.authenticate('google', { 
        scope: [ 'email', 'profile' ] 
    })
)

app.get('/auth/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/auth/failure'
    }),
    (req, res) => {
        res.redirect('/');
})

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/auth/failure' }),
  (req, res) => {
    res.redirect('/');
});


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})