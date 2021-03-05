const express = require('express');
const app = express();
const port = 3000;
const { Pool } = require('pg');
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: 'session',
  keys: ['key1']
}));

const pool = new Pool ({
  host: 'localhost',
  user: 'connormackay',
  database: 'speer_api'
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('error acquiring client', err.stack);
  }
  client.query('SELECT NOW()', (err, result) => {
    release()
    if (err) { 
      return console.error('error executing query', err.stack)
    }
    console.log(result.rows);
  })
});

app.set('view engine', 'ejs');

app.get('/home', (req, res) => {
  if (req.session) {
    console.log(req.session);
  }
  res.render('home');
})

app.post('/register', (req, res) => {
  const name = req.body.name
  const password = req.body.password
  pool.query('SELECT * FROM users where name = $1', [req.body.name])
  .then(data => { 
    if (data.rows.length > 0 && data.rows[0].name == req.body.name) {
      return res.json('<div>Error, user already exists </div>');
    } else if (password.length === 0 || name.length === 0) {
     return res.json('<div>Error, fields cannot be left blank </div>');
    } else {
      pool.query(`INSERT INTO users (name, password) VALUES ($1, $2)`, [req.body.name, req.body.password]);
      req.session.user = req.body.name;
      res.redirect('/home');
    }
  })
  .catch(err => {
    console.log(err);
  })
});

app.post('/logout', (req, res) => {
  res.clearCookie('name');
  req.session = null;
  res.redirect('/home');
});

app.post('/login', (req, res) => {
  pool.query(`SELECT * FROM users where name = $1`, [req.body.name])
  .then(data => {
    if (data.rows[0].password == req.body.password) {
      req.session.user = req.body.name;
      res.redirect('/home');
    } else {
      res.json('<div>Error, invalid password </div>');
    }
  })
});


app.post('/tweets', (req, res) => {
  console.log("posted tweet = ", req.body);
  const content = req.body.content;
  const author = req.session.user;
  pool.query(`INSERT INTO tweets(content, author) VALUES ($1, $2)`, [content, author])
  .then(() => {
    res.redirect('/home');
  })
  .catch(err => {
    console.log("Tweeting error: ", err);
  })
});

app.get('/tweets', (req, res) => {
  pool.query('SELECT * FROM tweets')
  .then(data => {
    res.json(data.rows);
  })
  .catch(err => {
    console.log(err);
  })
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});