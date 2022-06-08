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
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized:true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
    resave: false 
}))
app.use(passport.initialize());
app.use(passport.session());


function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/login')
}

app.get('/', ensureAuthenticated, (req, res) => {
    const display_name = req.user.displayName
    const image = req.user.picture ? req.user.picture : null
    res.render('profile', {
        display_name: display_name,
        image: image
    })
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

app.get('/auth/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})