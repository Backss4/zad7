const express = require('express')
const app = express()
const cookieParser = require('cookie-parser')
const session = require('express-session')
const port =  (process.env.PORT || 5000)
const bodyParser = require('body-parser')

const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth2')
const FacebookStrategy = require('passport-facebook')

const { Pool } = require('pg')
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

//const google_data = require('./google.secret.json')
//const facebook_data = require('./facebook.secret.json')

const znaki_zodiaku = ['kot', 'mysz', 'dinozaur']

function get_random (list) {
  return list[Math.floor((Math.random()*list.length))];
}

pool.query('DELETE FROM users WHERE true').then(() => {
  console.log('Cleared users table')
}).catch((err) => {
  console.log(err)
})

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  pool.query("SELECT * FROM users WHERE id = $1", [id])
  .then((res) => {
    if(res.rowCount === 1) {
      done(null, res.rows[0]);
    } else {
      done(new Error(`User with the id ${id} does not exist`));
    }
  })
  .catch((err) => {
    console.log(err)
    done(new Error(`User with the id ${id} does not exist`));
  })
});

passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: "https://i228678.herokuapp.com/auth/google/callback",
    passReqToCallback: true
  },
  function(request, accessToken, refreshToken, profile, done) {
      //console.log(profile)
      pool.query('SELECT * FROM users WHERE external_id = $1 AND provider = \'google\'', [profile.sub])
      .then((res) => {
        if(res.rowCount === 1) {
          const user = res.rows[0]
          pool.query("UPDATE users SET lastvisit=CURRENT_TIMESTAMP, counter = $1 WHERE id = $2", [user.counter, user.id]).then(() => {
            done(null, user);
          }).catch((err) => {
            done(new Error(`Failed to update user!`));
          })
        } else {
          const values = [
            profile.displayName,
            profile.sub,
            get_random(znaki_zodiaku)
          ]
          pool.query('INSERT INTO users (name, external_id, provider, znak_zodiaku) VALUES ($1, $2, \'google\', $3) RETURNING *', values).then((ret) => {
            done(null, ret.rows[0])
          }).catch((err) => {
            done(new Error(`Failed to create user!`));
          })
        }
      })
      .catch((err) => {
        done(new Error('Failed to login!'));
      })
  }
));


passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: "https://i228678.herokuapp.com/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    pool.query('SELECT * FROM users WHERE external_id = $1 AND provider = \'facebook\'', [profile.id])
      .then((res) => {
        if(res.rowCount === 1) {
          const user = res.rows[0]
          pool.query("UPDATE users SET lastvisit=CURRENT_TIMESTAMP, counter = $1 WHERE id = $2", [user.counter, user.id]).then(() => {
            done(null, user);
          }).catch((err) => {
            done(new Error(`Failed to update user!`));
          })
        } else {
          const values = [
            profile.displayName,
            profile.id,
            get_random(znaki_zodiaku)
          ]
          pool.query('INSERT INTO users (name, external_id, provider, znak_zodiaku) VALUES ($1, $2, \'facebook\', $3) RETURNING *', values).then((ret) => {
            done(null, ret.rows[0])
          }).catch((err) => {
            done(new Error(`Failed to create user!`));
          })
        }
      })
      .catch((err) => {
        done(new Error('Failed to login!'));
      })
  }
))

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(session({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
    resave: false 
}))
app.use(bodyParser.urlencoded({
  extended: true
}))
app.use(bodyParser.json())
app.use(passport.initialize());
app.use(passport.session());


function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/login')
}

app.get('/', ensureAuthenticated, (req, res) => {
    console.log(req.user)
    pool.query('SELECT * FROM users WHERE external_id = $1 AND provider = \'facebook\'', [profile.id])
    .then((res) => {
      res.render('index', {
        user: req.user,
        users: res.rows
      })
    }).catch((err) => {
      console.log(err)
      res.render('index', {
        user: req.user,
        users: 'Coś poszło nie tak'
      })
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

app.get('/auth/failure', (req, res) => {
  res.redirect('/');
})


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})