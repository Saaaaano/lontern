const express = require('express');
const app = express();
const mysql = require('mysql'); // mysql読み込み
// ログイン認証用モジュール
const passport = require('passport')
    , LocalStrategy = require('passport-local').Strategy;
app.use(passport.initialize()); //passportの初期化
// セッションの有効化
const session = require('express-session');
// /login に POST されたら、その情報を受取って認証処理に渡すようにする。
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
// fileUpload
const fileUpload = require('express-fileupload');
app.use(fileUpload());
require('date-utils');
const path = require('path');
var fs = require('fs');
const res = require('express/lib/response');


// mysqlへの接続情報
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
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
    //console.log(req)
    res.render('login.pug');
});

app.get('/', (req, res) => {
    res.render('login.pug');
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
            res.render('index.pug', { rooms: results[0], sessionmembers: results[1], members: results[2][0]});
        }
    )    
});

// ログアウト
app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/login');
});

// セッションページのIndex
app.get('/sessionIndex', isAuthenticated,function(req, res){
    connection.query(
        'SELECT * FROM rooms WHERE name = (?); SELECT * FROM sessionmembers WHERE sessionname = (?); SELECT id FROM members WHERE login_id = ?; SELECT id FROM sessioncomment WHERE sessionname = (?)', [req.query.sessionname, req.query.sessionname, req.session.passport.user, req.query.sessionname],
        (error,results) => {
            //console.log(results[1][0]);
            res.render('sessionIndex.pug', { rooms: results[0][0], members: results[1], you: results[2][0], page: Math.ceil(results[3].length / 20)});
        }
    )
    //console.log(req.query.sessionname);
})

// 参加フォームの情報を受取る
app.post('/apply', (req, res) => {
    //画像の保存
    var now = new Date();
    var time = now.toFormat('YYYYMMDDHH24MISS');
    //画像ファイル（アイコン）の拡張子を取り出し、時間とsession変数で名前をつけ直す。これによりuserが全く同じ名前のファイルをアップしてきても大丈夫
    var icon_ext = path.extname(req.files.icon.name);
    var new_iconname = time + req.files.icon.md5 + icon_ext;
    
    //画像ファイルを保存するパスを設定
    var target_path_i = './public/images/upload_icon/' + new_iconname;
    //ファイルをサーバーに保存した後、ファイル名をDBの保存、今後ファイルを取り出す際はDBから名前を取ってきてサーバーに保存してある画像ファイルとひもづける
    fs.writeFile(target_path_i, req.files.icon.data, (err) => {
        if (err) {
            throw err
        } else {
            connection.query(
                'SELECT id, name FROM members WHERE login_id = ?; ', [req.session.passport.user],
                (error, nameid) => {
                    var data = { 'memberId': nameid[0].id, 'name': nameid[0].name, 'character_name': req.body.character_name, 'attribute': 'character', 'permission': req.body.kansen, 'image': new_iconname, 'introduction': req.body.introduction, 'sessionname': req.body.sessionname};
                    connection.query('INSERT INTO sessionmembers SET ?; SELECT id FROM sessioncomment WHERE sessionname = ?', [data, req.body.sessionname],
                        function (error, results, fields) {
                            var pageNum = Math.ceil(results[1].length / 20 );
                            //console.log(results[1].length);
                            //console.log(pageNum);
                            if(pageNum == 0){
                                pageNum = 1;
                            }
                            res.redirect('/session/' + req.body.sessionname + '/' + pageNum);
                        }
                    );
            });
        }
    });
});

// セッションページ
app.get('/session/:session/:articleNum', isAuthenticated, (req, res) => {
    connection.query(
        'SELECT id FROM members WHERE login_id = ?', [req.session.passport.user],
        (error, nameid)=>{
            connection.query(
                'SELECT * FROM sessionmembers JOIN sessioncomment ON  sessionmembers.memberId = sessioncomment.memberId WHERE sessionmembers.sessionname = ? AND sessioncomment.sessionname = ?; SELECT * FROM sessionmembers WHERE memberId = ? AND sessionname = ?; SELECT * FROM sessionmembers WHERE sessionname = ?; SELECT * FROM rooms WHERE name = ?', [req.params.session, req.params.session, nameid[0].id, req.params.session, req.params.session, req.params.session],
                (error, results) => {
                    var comments = results[0];
                    //console.log(comments[53]);
                    var nomalNum = 0;
                    var chat = [];
                    var articleNum = String(req.params.articleNum)
                    //console.log(comments.length);
                    for (var i = 0; i < comments.length; i++){
                        //console.log("i: " + i)
                        if (nomalNum >= (articleNum * 20 - 1)) {
                            break;
                        }
                        if (comments[i].section == "nomal") {
                            //console.log("nomal")
                            nomalNum++;
                        }
                        if (articleNum == 1 || (articleNum * 20 - 19) < nomalNum) {
                            //console.log("chat");
                            chat.push(comments[i]);
                        }
                        
                    }
                   // console.log("chat:"+chat);
                    //console.log("articleNum:" +articleNum);
                    res.render('session.ejs', { comment: chat, character: results[1][0], members: results[2], room: results[3][0], articleNum: [articleNum, comments.length,]});
                }
            )
        }
    )
    
    //console.log(req.params.session);
    
})

app.post('/say/:session/:articleNum', (req, res) => {
    connection.query(
        'SELECT id FROM members WHERE login_id = ?', [req.session.passport.user],
        (error, nameid) => {
            connection.query(
                'SELECT * FROM sessionmembers WHERE memberId = ? AND sessionname = ?', [nameid[0].id, req.params.session],
                (error,results) => {
                    
                    var now = new Date();   //発言日時の出力
                    var time = now.toFormat('YYYY/MM/DD HH24:MI:SS');
                    var comment = req.body.comment;
                    var regexp = new RegExp(/#+[^  ]+\s+/, 'g');
                    var regexp2 = new RegExp(/\r\n|\r|\n/g);
                    //console.log(regexp.multiline);
                    var tag = "";
                    if (regexp.test(comment)){
                        var bar = comment.match(regexp);
                        //console.log(bar);
                        var tagAllay = [];
                        bar.forEach((s) => {
                            if (regexp2.test(s)){
                                s2 = s.replace(/\r?\n/g, ' ');
                                var bar2 = s2.match(regexp);
                                bar2.forEach((s3) => {
                                    tagAllay.push(s3)
                                });
                            }else{
                                tagAllay.push(s)
                            }
                        });
                        tag = tagAllay[0].replace(' ', '');
                        for (let i = 1; i < tagAllay.length; i++) {
                            tag = tag + ',' + tagAllay[i].replace(' ', '');
                        }
                    }
                    if (req.body.say == "action"){
                        comment = results[0].character_name + "は、" + comment;
                    }
                    //console.log(tagAllay);
                    
                    
                    var data = { 'name': results[0].name, 'character_name': results[0].character_name, 'section': req.body.say, 'send_to': req.body.to, 'comment': comment, 'comment_vol': req.body.vol_size, 'tag': tag, 'comment_at': time, 'memberId': results[0].memberId, 'sessionname': req.params.session };
                    connection.query(
                        'INSERT INTO sessioncomment SET ?', data,
                        (error, result)=> {
                            //console.log(data);
                            res.redirect('/session/' + req.params.session + '/' + req.params.articleNum);
                        }
                    );
                }
            )
        }
    )
    
    
})
/*
// 発言前のプレビューページ
app.get('/sessionPreview', function (req, res) {
    res.render('session_preview.ejs');
})
*/
// サーバーを起動するコードを貼り付けてください
app.listen(3000);