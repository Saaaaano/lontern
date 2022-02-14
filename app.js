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

var db_config = {
    host: 'us-cdbr-east-05.cleardb.net',
    user: 'bba56b01de6ce8',
    password: '2bf43e78',
    database: 'heroku_28ad3d49484e5e8',
};

var connection;

function handleDisconnect() {
    console.log('INFO.CONNECTION_DB: ');
    connection = mysql.createConnection(db_config);

    //connection取得
    connection.connect(function (err) {
        if (err) {
            console.log('ERROR.CONNECTION_DB: ', err);
            setTimeout(handleDisconnect, 1000);
        }
    });

    //error('PROTOCOL_CONNECTION_LOST')時に再接続
    connection.on('error', function (err) {
        console.log('ERROR.DB: ', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.log('ERROR.CONNECTION_LOST: ', err);
            handleDisconnect();
        } else {
            throw err;
        }
    });
}

handleDisconnect();

/*
const connection = mysql.createConnection({
    host: 'us-cdbr-east-05.cleardb.net',
    user: 'bba56b01de6ce8',
    password: '2bf43e78',
    database: 'heroku_28ad3d49484e5e8',
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
*/

// IDとパスワードによる認証
passport.use(new LocalStrategy(
    (username, password, done) => {
        // ここでユーザーIDとPASSを確認して結果を返す。
        connection.query(
            'SELECT login_id, pass FROM members',
            (error, results) => {
                if (error) { return done(error); }
                for (let i = 0; i < results.length; i++) {
                    // console.log(results[i].login_id);
                    // console.log(results[i].pass);
                    if (results[i].login_id == username && results[i].pass == password) {
                        return done(null, username);
                    } else if (results[i].login_id == username) {
                        return done(null, false);
                    } else if (results[i].pass == password) {
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

passport.use('local-signup', new LocalStrategy(
    function (username, password, done) {
        connection.query(
            'SELECT login_id, pass FROM members',
            (error, results) => {
                if (error) { return done(error); }
                // usernameで検索
                for (let i = 0; i < results.length; i++) {
                    // console.log(results[i].login_id);
                    // console.log(results[i].pass);
                    // ユーザー登録済み
                    if (results[i].login_id == username) {
                        return done(null, false);
                    } 
                }
                console.log(username);
                var date = { "login_id": username, "pass": password};
                connection.query(
                    'INSERT INTO members SET ?', [date],
                    (error, results) => {
                        return done(null, username);
                })
                
            }
        );
    }
));

// ページのリクエストを貰ったとき認証済か確認する関数
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {  // 認証済
        return next();
    }
    else {  // 認証されていない
        res.redirect('/login');  // ログイン画面に遷移
    }
}



const http = require('http');


/*------------------------------------------------------------ */
// ログインページ
app.get('/login', (req, res) => {
    //console.log(req)
    res.render('login.pug');
});

app.get('/', (req, res) => {
    res.render('login.pug');
});

app.get('/signup', (req, res) => {
    res.render('signup.pug');
});

// ログインボタンを押したら
app.post('/login',  
    passport.authenticate('local', {
        successRedirect: '/index',
        failureRedirect: '/login',
        session: true
    })
);

// 会員登録
app.post('/signup', 
    passport.authenticate('local-signup', {
        successRedirect: '/nameset',
        failureRedirect: '/signup',
        session: true
    })
);

app.get('/nameset', isAuthenticated, (req,res)=> {
    res.render('namesetting.pug')
});

app.post('/nameset', (req,res)=> {
    var date = { "name": req.body.name };
    connection.query(
        'UPDATE members SET ? WHERE login_id = ?', [date, req.session.passport.user],
        (error, results) => {
            res.redirect('/index');
        })
});

app.post('/nameedit', (req, res) => {
    var date = { "name": req.body.name };
    connection.query(
        'UPDATE members SET ? WHERE login_id = ?', [date, req.session.passport.user],
        (error, results) => {
            res.redirect('/mypage');
        })
});

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

app.get('/mypage', isAuthenticated, (req,res)=>{
    connection.query(
        'SELECT id, name FROM members WHERE login_id = ?; ', [req.session.passport.user],
        (error, nameid) => {
            console.log(nameid);
            connection.query(
                'SELECT sessionmembers.character_name, sessionmembers.permission, sessionmembers.image, rooms.name, rooms.status, rooms.Owner, rooms.system ' +
                'FROM sessionmembers JOIN rooms ON sessionmembers.sessionname = rooms.name WHERE sessionmembers.memberId = ? AND sessionmembers.attribute = "character";'
                , [nameid[0].id],
                (error, results) => {
                    console.log(results);
                    res.render('mypage.pug', { rooms: results, you:nameid[0].name});
                }
            ) 
        }
    )
       
})

// ログアウト
app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/login');
});

const perPage = 20;
// セッションページのIndex
app.get('/sessionIndex', isAuthenticated,function(req, res){
    connection.query(
        'SELECT * FROM rooms WHERE name = (?); SELECT * FROM sessionmembers WHERE sessionname = (?); SELECT id FROM members WHERE login_id = ?;' +  
        'SELECT id FROM sessioncomment WHERE sessionname = (?)',
        [req.query.sessionname, req.query.sessionname, req.session.passport.user, req.query.sessionname],
        (error,results) => {
            //console.log(results[1][0]);
            
            pageNum = Math.ceil(results[3].length / perPage);
            if(pageNum == 0){
                pageNum = 1;
            }
            //console.log(pageNum);
            var passmatch = "ok";
            if (req.query.passmatch == "ng"){
                passmatch = "ng";
            }
            res.render('sessionIndex.pug', { rooms: results[0][0], members: results[1], you: results[2][0], page: pageNum, passmatch:passmatch });
        }
    )
    //console.log(req.query.sessionname);
})

// 参加フォームの情報を受取る
app.post('/apply', (req, res) => {
    
    connection.query("SELECT pass FROM rooms WHERE name = ?", [req.body.sessionname],
        (error, roompass) => {
            console.log(roompass[0].pass.length);
            if (roompass[0].pass != null && roompass[0].pass.length != 0 && req.body.pass != roompass[0].pass) {
                console.log('通った');
                //window.alert('入室パスワードが間違っています。');
                return res.redirect('/sessionIndex?sessionname=' + req.body.sessionname + '&passmatch=ng');
            }else{
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


                                var data = {
                                    'memberId': nameid[0].id, 'name': nameid[0].name, 'character_name': req.body.character_name, 'attribute': 'character',
                                    'permission': req.body.kansen, 'image': new_iconname, 'introduction': req.body.introduction, 'sessionname': req.body.sessionname
                                };
                                connection.query('INSERT INTO sessionmembers SET ?; SELECT id FROM sessioncomment WHERE sessionname = ?', [data, req.body.sessionname,],
                                    function (error, results, fields) {

                                        pageNum = Math.ceil(results[1].length / perPage);
                                        //console.log(all + " & " + pageNum)
                                        return res.redirect('/session/' + req.body.sessionname + '?pageNum=' + pageNum);
                                    }
                                );
                            });
                    }
                });
            }
        }
    )

   
});

app.get('/editor', isAuthenticated, (req,res)=>{
    connection.query(
        'SELECT id, name FROM members WHERE login_id = ?; ', [req.session.passport.user],
        (error, nameid) => {
            connection.query(
                'SELECT * FROM rooms WHERE name = ?; SELECT * FROM sessionmembers WHERE sessionname = ? AND attribute = "npc";' + 
                'SELECT * FROM sessionmembers WHERE memberId = ?;  SELECT * FROM sessionmembers WHERE sessionname = ?', [req.query.name, req.query.name, nameid[0].id, req.query.name],
                (error, results) => {
                    res.render('editor.pug', { room: results[0][0], npcs: results[1], ownername: nameid[0].id, mydata:results[2][0], pcdata:results[3]});
                }
            )
        }
    )
})

app.post('/updateSession', isAuthenticated, (req, res)=>{
    connection.query(
        'SELECT id FROM rooms WHERE name = ?',
        [req.body.sessionname],
        (error, results) => {
            //console.log(req.body)
            var data = {
                'name': req.body.sessionName, 'personNum': Number(req.body.personNum), 
                'pass': req.body.password, 'anonymous': Number(req.body.anonymous), 'secret': Number(req.body.secret),
                'system': req.body.systemName, 'overview': req.body.sessionOverView, 'audience': Number(req.body.audience)
            };
            //console.log(data);
            connection.query(
                'UPDATE rooms SET ? WHERE id = ?', [data, results[0].id],
                (error, results) => {
                    res.redirect('/editor?name=' + req.body.sessionName);
                }
            )
        }
    )
})

app.post('/npcApply',(req,res)=>{
    
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
                    var data = {
                        'memberId': nameid[0].id, 'name': nameid[0].name, 'character_name': req.body.character_name, 'attribute': 'npc',
                        'image': new_iconname, 'introduction': req.body.introduction, 'sessionname': req.body.sessionname
                    };
                    connection.query('INSERT INTO sessionmembers SET ?', [data],
                        function (error, results, fields) {
                            res.redirect('/editor?name=' + req.body.sessionname);
                        }
                    );
                }
            );
        }
    });
})

app.post('/mydataEdit', isAuthenticated, (req, res) => {
    if (req.files){
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
            connection.query(
                'SELECT id, name FROM members WHERE login_id = ?; ', [req.session.passport.user],
                (error, nameid) => {
                    var data = {
                        'character_name': req.body.character_name,
                        'image': new_iconname, 'introduction': req.body.introduction
                    };
                    connection.query('UPDATE sessionmembers SET ? WHERE memberId = ?', [data, nameid[0].id],
                        function (error, results, fields) {
                            res.redirect('/editor?name=' + req.body.sessionname);
                        }
                    );
                }
            );
        });
    }else{
        connection.query(
            'SELECT id, name FROM members WHERE login_id = ?; ', [req.session.passport.user],
            (error, nameid) => {
                var data = {
                    'character_name': req.body.character_name,
                    'introduction': req.body.introduction
                };
                connection.query('UPDATE sessionmembers SET ? WHERE memberId = ? AND sessionname = ?', [data, nameid[0].id, req.body.sessionname],
                    function (error, results, fields) {
                        res.redirect('/editor?name=' + req.body.sessionname);
                    }
                );
            }
        );
    }
})

app.post('/sessionStatus/:sessionname/:status', (req, res)=>{
    var data = "";
    if(req.params.status == "end"){data = "終了"}
    else if (req.params.status == "bigin"){data = "進行中"}
    connection.query('UPDATE rooms SET status = ? WHERE name = ?', [data, req.params.sessionname],
    (error,results) => {
    })
})


// セッションページ
app.get('/session/:session/', isAuthenticated, (req, res) => {
    connection.query(
        'SELECT id FROM members WHERE login_id = ?', [req.session.passport.user],
        (error, nameid)=>{
            connection.query(
                'SELECT * FROM sessioncomment JOIN sessionmembers ON sessionmembers.character_name = sessioncomment.character_name WHERE sessionmembers.sessionname = ? AND sessioncomment.sessionname = ?;' +
                'SELECT * FROM sessionmembers WHERE memberId = ? AND sessionname = ?; SELECT * FROM sessionmembers WHERE sessionname = ?; SELECT * FROM rooms WHERE name = ?',
                [req.params.session, req.params.session, nameid[0].id, req.params.session, req.params.session, req.params.session],
                (error, results) => {
                    console.log(req.query.search);
                    var saynum = 0;
                    if (req.query.id != null){
                        saynum = req.query.id;
                    }
                    res.render('session.pug', { comments: results[0], character: results[1][0], members: results[2], room: results[3][0], pageNum: req.query.pageNum, you: nameid[0].id, preArticleId: req.query.articleId, search: req.query.search, searchtag: req.query.tag, saynum: saynum});
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
                'SELECT * FROM sessionmembers WHERE memberId = ? AND sessionname = ?; SELECT * FROM rooms WHERE name = ?', [nameid[0].id, req.params.session, req.params.session],
                (error,results) => {
                    var now = new Date();   //発言日時の出力
                    var time = now.toFormat('YYYY/MM/DD HH24:MI:SS');
                    var comment = req.body.comment;
                    
                    if (req.body.say == "action" && req.body.saycharacter != "GM"){
                        if (req.body.saycharacter){
                            comment = req.body.saycharacter + "は、" + comment;
                        }else{
                            comment = results[0].character_name + "は、" + comment;
                        }
                    }
                    
                    var dice = comment.match(/\[[0-9]+d[0-9]+\]/g);
                    if(dice){
                        dice.forEach((dd) => {
                            dd = dd.replace(/\[/, '');
                            dd = dd.replace(/\]/, '');
                            //console.log("DD = "+dd);
                            var times = dd.split(/d/);
                            var dice1 = 0;
                            for (let i = 0; i < times[0]; i++) {
                                dice1 += (Math.floor(Math.random() * times[1]) + 1);
                                //console.log(dice1);
                            }
                            comment = comment.replace(/\[[0-9]+d[0-9]+\]/, "[" + dd + ":" + dice1 + "]");
                        });
                    };
                    //1d100<=10 (1D100<=10) ＞ 14 ＞ 失敗

                    var choice = comment.match(/\[c(\S+)\]/g);
                    if (choice) {
                        choice.forEach((cc) => {
                            cc = String(cc.replace(/\[c\(/, ''));
                            cc = cc.replace(/\)\]/, '');
                            var choices = cc.split(/,/);
                            var index = (Math.floor(Math.random() * choices.length));
                            comment = comment.replace(/\[c(\S+)\]/, "[" + cc + ":" + choices[index] + "]");
                        });
                    }


                    //console.log(tagAllay);
                    var character_name = "";
                    if (nameid[0].id == results[1][0].ownerId){
                        character_name = req.body.saycharacter;
                        var data = {
                            'name': results[0][0].name, 'character_name': character_name, 'section': req.body.say, 'send_to': req.body.to,
                            'comment': comment, 'comment_vol': req.body.vol_size, 'comment_at': time, 'memberId': results[0][0].memberId, 'sessionname': req.params.session
                        };

                    }else{
                        character_name = results[0].character_name;
                        var data = {
                            'name': results[0].name, 'character_name': character_name, 'section': req.body.say, 'send_to': req.body.to,
                            'comment': comment, 'comment_vol': req.body.vol_size, 'tag': tag, 'comment_at': time, 'memberId': results[0].memberId, 'sessionname': req.params.session
                        };
                    }
                    
                    //var data = {'name': results[0].name, 'character_name': character_name, 'section': req.body.say, 'send_to': req.body.to,
                    //            'comment': comment, 'comment_vol': req.body.vol_size, 'tag': tag, 'comment_at': time, 'memberId': results[0].memberId, 'sessionname': req.params.session };
                    connection.query(
                        'INSERT INTO sessioncomment SET ?', data,
                        (error, result)=> {
                            //console.log(data);
                            res.redirect('/session/' + req.params.session + '?pageNum=' + req.params.articleNum);
                        }
                    );
                }
            )
        }
    )
})

//セッション作成ページ
app.get('/sessionCreate', isAuthenticated,  (req, res) =>{
    res.render('sessionCreate.pug')
})

app.post('/createSession', (req, res) => {
    connection.query(
        'SELECT id, name FROM members WHERE login_id = ?',
        [req.session.passport.user],
        (error, nameid) => {
            var GMdata = { 'name': nameid[0].name, 'character_name': 'GM', 'attribute': "npc", 'image': 'GM.png', 'sessionname': req.body.sessionName, 'memberId': nameid[0].id};
            //console.log(req.body)
            var data = { 'name': req.body.sessionName, 'status': '募集中', 'personNum': Number(req.body.personNum), 'Owner': nameid[0].name,
                        'OwnerId': nameid[0].id, 'pass': req.body.password, 'anonymous': Number(req.body.anonymous), 'secret': Number(req.body.secret), 
                        'system': req.body.systemName, 'overview': req.body.sessionOverView, 'audience': Number(req.body.audience) };
            console.log(data);
            connection.query(
                'INSERT INTO rooms SET ?; INSERT INTO sessionmembers SET ?;', [data, GMdata],
                (error, results) => {
                    res.redirect('/index');
                }
            )
        }
    )
})

// サーバーを起動するコードを貼り付けてください
app.listen(process.env.PORT || 5000);