const express = require('express');
require('express-async-errors');
require('dotenv').config(); // to load the .env file into the process.env object

const app = express();

const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

let mongoURL = process.env.MONGO_URI;
if (process.env.NODE_ENV === 'test') {
  mongoURL = process.env.MONGO_URI_TEST;
}

const store = new MongoDBStore({
  // may throw an error, which won't be caught
  uri: mongoURL,
  collection: 'mySessions',
});

store.on('error', function (error) {
  console.log(error);
});

const sessionParms = {
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  store: store,
  cookie: { secure: false, sameSite: 'strict' },
};

if (app.get('env') === 'production') {
  app.set('trust proxy', 1); // trust first proxy
  sessionParms.cookie.secure = true; // serve secure cookies
}

app.use(session(sessionParms));
const passport = require('passport');
const passportInit = require('./passport/passportInit');

passportInit();
app.use(passport.initialize());
app.use(passport.session());

app.use(require('connect-flash')());
app.use(require('./middleware/storeLocals'));
app.use((req, res, next) => {
  if (req.path === '/multiply') {
    res.set('Content-Type', 'application/json');
  } else {
    res.set('Content-Type', 'text/html');
  }
  next();
});

app.get('/', (req, res) => {
  res.render('index');
});
app.use('/sessions', require('./routes/sessionRoutes'));

app.set('view engine', 'ejs');
app.use(require('body-parser').urlencoded({ extended: true }));

// secret word handling
const secretWordRouter = require('./routes/secretWord');
const auth = require('./middleware/auth');
app.use('/secretWord', auth, secretWordRouter);

app.get('/multiply', (req, res) => {
  let result = req.query.first * req.query.second;
  if (result.isNaN) {
    result = 'NaN';
  } else if (result == null) {
    result = 'null';
  }
  res.json({ result: result });
});

app.use((req, res) => {
  res.status(404).send(`That page (${ req.url }) was not found.`);
});

app.use((err, req, res, next) => {
  res.status(500).send(err.message);
  console.log(err);
});

const port = process.env.PORT || 3000;

const start = async () => {
  try {
    await require('./db/connect')(mongoURL);
    app.listen(port, () =>
      console.log(`Server is listening on port ${ port }...`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();

module.exports = { app };