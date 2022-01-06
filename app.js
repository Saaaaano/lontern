const express = require('express');
const app = express();
const mysql = require('mysql'); // mysql読み込み
// ログイン認証用モジュール
var passport = require('passport')
    , LocalStrategy = require('passport-local').Strategy;
app.use(passport.initialize()); //passportの初期化
// セッションの有効化
var session = require('express-session');
// /login に POST されたら、その情報を受取って認証処理に渡すようにする。
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));


// mysqlへの接続情報
app.use(express.static('public'));
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '2wffBxQjNHa9',
    database: 'lontern',
    multipleStatements: true
});
// mysqlへ接続ができていないときにエラーを表示する。
connection.connect((err) => {
    if (err) {
        console.log('error connecting: ' + err.stack);
        return;
    }
    console.log('success');
});


// IDとパスワードによる認証
passport.use(new LocalStrategy(
    (username, password, done) => {
        // ここでユーザーIDとPASSを確認して結果を返す。
        connection.query(
            'SELECT login_id, pass FROM members',
            (error, results) => {
                if (error) { return done(error); }
                for (let i = 0; i < results.length; i++){
                    // console.log(results[i].login_id);
                    // console.log(results[i].pass);
                    if(results[i].login_id == username && results[i].pass == password){
                        return done(null, username);
                    } else if (results[i].login_id == username){
                        return done(null, false);
                    } else if (results[i].pass == password){
                        return done(null, false);
                    } 
                }
                return done(null, false);
            }
        );
    }
));

// セッションの設定
app.use(session({
    secret: 'keyboard cat',
}));
app.use(passport.session());

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

// ページのリクエストを貰ったとき認証済か確認する関数
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {  // 認証済
        return next();
    }
    else {  // 認証されていない
        res.redirect('/login');  // ログイン画面に遷移
    }
}

/*------------------------------------------------------------ */
// ログインページ
app.get('/login', (req, res) => {
    res.render('login.ejs');
});

// ログインボタンを押したら
app.post('/login',
    passport.authenticate('local', {
        failureRedirect:'/login', //認証に失敗した場合
    }),
    (req, res) => {
        res.redirect('/index');
    }
);

/*------------------------------------------------------------ */
// トップページ
app.get('/index', isAuthenticated, (req, res) => {
    connection.query(
        'SELECT * FROM rooms; SELECT * FROM sessionmembers; SELECT name FROM members WHERE login_id = ?', [req.session.passport.user],
        (error, results) => {
            //console.log(results[2], req.session.passport);
            res.render('index.ejs', { rooms: results[0], sessionmembers: results[1], members: results[2][0]});
        }
    )    
});

// ログアウト
app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/login');
});

// セッションページのIndex
app.get('/sessionIndex', function(req, res){
    connection.query(
        'SELECT * FROM rooms WHERE name = ?', [req.query.sessionname],
        (error,results) => {
            //console.log(results[0]);
            res.render('session_index.ejs', {rooms: results[0]});
        }
    )
    //console.log(req.query.sessionname);
})

// セッションページ
app.get('/session', function (req, res) {
    res.render('session.ejs');
})

// 発言前のプレビューページ
app.get('/sessionPreview', function (req, res) {
    res.render('session_preview.ejs');
})

// サーバーを起動するコードを貼り付けてください
app.listen(3000);