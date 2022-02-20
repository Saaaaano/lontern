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
const AWS = require('aws-sdk');
AWS.config.apiVersions = {
    rekognition: '2016-06-27',
};
const credentials = new AWS.Credentials({ accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY })
AWS.config.credentials = credentials


// mysqlへの接続情報
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

var connection;

function handleDisconnect() {
    console.log('INFO.CONNECTION_DB: ');
    connection = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

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



// mysqlへ接続ができていないときにエラーを表示する。
/*connection.connect((err) => {
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


const s3 = new AWS.S3({
    params: {
        Region: "ap-northeast-1"
    }
});

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

app.post('/nameset', isAuthenticated, (req,res)=> {
    var date = { "name": req.body.name };
    connection.query(
        'UPDATE members SET ? WHERE login_id = ?', [date, req.session.passport.user],
        (error, results) => {
            res.redirect('/index');
        })
});

app.post('/nameedit', isAuthenticated, (req, res) => {
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
        'SELECT rooms.*, members.name as owner FROM rooms JOIN members ON rooms.ownerId = members.id;' + 
        'SELECT * FROM sessionmembers; SELECT name FROM members WHERE login_id = ?', [req.session.passport.user],
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
                'SELECT sessionmembers.character_name, sessionmembers.permission, sessionmembers.image, rooms.sessionname, rooms.status, rooms.system, members.name as owner ' +
                'FROM sessionmembers JOIN rooms ON sessionmembers.sessionId = rooms.id JOIN members ON rooms.ownerId =  members.id WHERE sessionmembers.memberId = ? AND (sessionmembers.attribute = "character" OR rooms.ownerId = ?);'
                , [nameid[0].id, nameid[0].id],
                (error, results) => {
                    //console.log(results);
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

const perPage = 50;
// セッションページのIndex
app.get('/sessionIndex', isAuthenticated,function(req, res){
    connection.query(
        'SELECT rooms.* , members.name as owner FROM rooms JOIN members ON members.id = rooms.ownerId WHERE rooms.id = ?; SELECT * FROM sessionmembers WHERE sessionid = ?;' + 
        'SELECT id FROM members WHERE login_id = ?; SELECT id FROM sessioncomment WHERE sessionid = ?;',
        [req.query.sid, req.query.sid, req.session.passport.user, req.query.sid],
        (error,results) => {
            //console.log(results);  
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
app.post('/apply', isAuthenticated, (req, res) => {
    connection.query("SELECT pass FROM rooms WHERE id = ?", [req.body.sid],
        (error, roompass) => {
            console.log(roompass[0].pass.length);
            if (roompass[0].pass != null && roompass[0].pass.length != 0 && req.body.pass != roompass[0].pass) {
                console.log('通った');
                //window.alert('入室パスワードが間違っています。');
                return res.redirect('/sessionIndex?sid=' + req.body.sid + '&passmatch=ng');
            }else{
                //画像の保存
                var now = new Date();
                var time = now.toFormat('YYYYMMDDHH24MISS');
                //画像ファイル（アイコン）の拡張子を取り出し、時間とsession変数で名前をつけ直す。これによりuserが全く同じ名前のファイルをアップしてきても大丈夫
                var icon_ext = path.extname(req.files.icon.name);
                var new_iconname = time + req.files.icon.md5 + icon_ext;
                
                //画像のアップロード 
                var s3file = req.files.icon.data;
                console.log(new_iconname);
                console.log(process.env.S3_BUCKET_NAME);
                if(s3file){
                    s3.putObject({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: new_iconname,
                        ContentType: "image/png",
                        Body: s3file,
                        ACL: "public-read"
                    }, function (err, data) {
                        if (data !== null) {
                            console.log("upload completed");
                        }
                        if(err){
                            console.log("upload error");
                            console.log(err, err.stack);
                        }
                    });
                }
            }
            connection.query(
                'SELECT id, name FROM members WHERE login_id = ?; ', [req.session.passport.user],
                (error, nameid) => {
                    var data = {
                        'memberId': nameid[0].id, 'name': nameid[0].name, 'character_name': req.body.character_name, 'attribute': 'character',
                        'permission': req.body.kansen, 'image': new_iconname, 'introduction': req.body.introduction, 'sessionId': req.body.sid
                    };
                    connection.query('INSERT INTO sessionmembers SET ?; SELECT id FROM sessioncomment WHERE sessionId = ?', [data, req.body.sid,],
                        function (error, results, fields) {

                            pageNum = Math.ceil(results[1].length / perPage);
                            if (pageNum == 0) {
                                pageNum = 1;
                            }
                            //console.log(all + " & " + pageNum)
                            return res.redirect('/session/' + req.body.sid + '?pageNum=' + pageNum);
                        }
                    );
                }
            );
        }
    );
});

app.get('/editor', isAuthenticated, (req,res)=>{
    connection.query(
        'SELECT id, name FROM members WHERE login_id = ?; ', [req.session.passport.user],
        (error, nameid) => {
            connection.query(
                'SELECT rooms.*, members.name as owner FROM rooms JOIN members ON rooms.ownerId = members.id WHERE rooms.id = ?; SELECT * FROM sessionmembers WHERE sessionid = ? AND attribute = "npc";' + 
                'SELECT * FROM sessionmembers WHERE memberId = ? AND sessionid = ?; SELECT sessionmembers.*, members.name FROM sessionmembers JOIN members ON sessionmembers.memberId = members.id WHERE sessionId = ?;'
                , [req.query.sid, req.query.sid, nameid[0].id, req.query.sid, req.query.sid],
                (error, results) => {
                    res.render('editor.pug', { room: results[0][0], npcs: results[1], ownername: nameid[0].id, mydata:results[2][0], pcdata:results[3]});
                }
            )
        }
    )
})

app.post('/updateSession', isAuthenticated, (req, res)=>{
   
        //console.log(req.body)
        var data = {
            'sessionname': req.body.sessionName, 'personNum': Number(req.body.personNum), 
            'pass': req.body.password, 'anonymous': Number(req.body.anonymous), 'secret': Number(req.body.secret),
            'system': req.body.systemName, 'overview': req.body.sessionOverView, 'audience': Number(req.body.audience)
        };
        //console.log(data);
        connection.query(
            'UPDATE rooms SET ? WHERE id = ?', [data, req.body.sid],
            (error, results) => {
                res.redirect('/editor?sid=' + req.body.sid);
            }
        )
    }
)


app.post('/npcApply', isAuthenticated,(req,res)=>{
    
    //画像の保存
    var now = new Date();
    var time = now.toFormat('YYYYMMDDHH24MISS');
    //画像ファイル（アイコン）の拡張子を取り出し、時間とsession変数で名前をつけ直す。これによりuserが全く同じ名前のファイルをアップしてきても大丈夫
    var icon_ext = path.extname(req.files.icon.name);
    var new_iconname = time + req.files.icon.md5 + icon_ext;

    //画像のアップロード 
    var s3file = req.files.icon.data;
    console.log(new_iconname);
    console.log(process.env.S3_BUCKET_NAME);
    if (s3file) {
        s3.putObject({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: new_iconname,
            ContentType: "image/png",
            Body: s3file,
            ACL: "public-read"
        }, function (err, data) {
            if (data !== null) {
                console.log("upload completed");
            }
            if (err) {
                console.log("upload error");
                console.log(err, err.stack);
            }
        });
    }
    connection.query(
        'SELECT id, name FROM members WHERE login_id = ?; ', [req.session.passport.user],
        (error, nameid) => {
            var data = {
                'memberId': nameid[0].id, 'character_name': req.body.character_name, 'attribute': 'npc',
                'image': new_iconname, 'introduction': req.body.introduction, 'sessionId': req.body.sid
            };
            connection.query('INSERT INTO sessionmembers SET ?', [data],
                function (error, results, fields) {
                    res.redirect('/editor?sid=' + req.body.sid);
                }
            )
        }
    )

})

app.post('/mydataEdit', isAuthenticated, (req, res) => {
    if (req.files){
        //画像の保存
        var now = new Date();
        var time = now.toFormat('YYYYMMDDHH24MISS');
        //画像ファイル（アイコン）の拡張子を取り出し、時間とsession変数で名前をつけ直す。これによりuserが全く同じ名前のファイルをアップしてきても大丈夫
        var icon_ext = path.extname(req.files.icon.name);
        var new_iconname = time + req.files.icon.md5 + icon_ext;

        //ファイルをサーバーに保存した後、ファイル名をDBの保存、今後ファイルを取り出す際はDBから名前を取ってきてサーバーに保存してある画像ファイルとひもづける
        
        //画像のアップロード 
        var s3file = req.files.icon.data;
        if (s3file){
            console.log(new_iconname);
            console.log(process.env.S3_BUCKET_NAME);
            if(s3file){
                s3.putObject({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: new_iconname,
                    ContentType: "image/png",
                    Body: s3file,
                    ACL: "public-read"
                }, function (err, data) {
                    if (data !== null) {
                        console.log("upload completed");
                    }
                    if(err){
                        console.log("upload error");
                        console.log(err, err.stack);
                    }
                });
            }
        }
    }
    connection.query(
        'SELECT id, name FROM members WHERE login_id = ?; ', [req.session.passport.user],
        (error, nameid) => {
            if (req.files){
                var data = {
                    'character_name': req.body.character_name,
                    'introduction': req.body.introduction,
                    'image': new_iconname
                };
            }else{
                var data = {
                    'character_name': req.body.character_name,
                    'introduction': req.body.introduction
                };
            }
            var character_name = { 'character_name': req.body.character_name}
            
            connection.query('UPDATE sessionmembers SET ? WHERE memberId = ? AND sessionId = ?;UPDATE sessioncomment SET ? WHERE memberId = ? AND sessionId = ?', [data, nameid[0].id, req.body.sid, character_name, nameid[0].id, req.body.sid],
                function (error, results, fields) {
                    res.redirect('/editor?sid=' + req.body.sid);
                }
            );
        }
    );
})

app.post('/sessionStatus/:sid/:status', isAuthenticated,(req, res)=>{
    var data = "";
    if(req.params.status == "end"){data = "終了"}
    else if (req.params.status == "bigin"){data = "進行中"}
    connection.query('UPDATE rooms SET status = ? WHERE id = ?', [data, req.params.sid],
    (error,results) => {
        res.redirect('/editor?sid=' + req.params.sid);
    })
})

// セッションページ
app.get('/session/:sid', isAuthenticated, async(req, res) => {
    connection.query(
        'SELECT id FROM members WHERE login_id = ?', [req.session.passport.user],
        async(error, nameid)=>{
            connection.query(
                'SELECT * FROM sessioncomment JOIN sessionmembers ON sessionmembers.id = sessioncomment.charaId WHERE sessionmembers.sessionId = ? AND sessioncomment.sessionId = ?;' +
                'SELECT * FROM sessionmembers WHERE memberId = ? AND sessionId = ?; SELECT * FROM sessionmembers WHERE sessionId = ?; SELECT * FROM rooms WHERE id = ?',
                [req.params.sid, req.params.sid, nameid[0].id, req.params.sid, req.params.sid, req.params.sid],
                async (error, results) => {
                    //console.log(results[3][0]);
                    
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

app.post('/say/:sid', isAuthenticated,(req, res) => {
    connection.query(
        'SELECT id FROM members WHERE login_id = ?', [req.session.passport.user],
        (error, nameid) => {
            connection.query(
                'SELECT * FROM sessionmembers WHERE memberId = ? AND sessionId = ?; SELECT * FROM rooms WHERE id = ?;' + 
                'SELECT id FROM sessioncomment WHERE sessionid = ?;', [nameid[0].id, req.params.sid, req.params.sid, req.params.sid],
                (error,results) => {
                    console.log("say post");
                    var pageNum = Math.ceil(results[2].length / perPage);
                    if (pageNum == 0) {
                        pageNum = 1;
                    }
                    var now = new Date();   //発言日時の出力
                    var time = now.toFormat('YYYY/MM/DD HH24:MI:SS');
                    var comment = req.body.comment;
                    
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

                    var choice = comment.match(/\[c\([^\]]+/g);
                    -console.log(choice);
                    if (choice) {
                        choice.forEach((cc) => {
                            cc = String(cc.replace(/\[c\(/, ''));
                            cc = cc.replace(/\)/, '');
                            var choices = cc.split(/,/);
                            var index = (Math.floor(Math.random() * choices.length));
                            comment = comment.replace(/\[c\([^\]]+\]/, "[" + cc + ":" + choices[index] + "]");
                        });
                    }


                    //console.log(tagAllay);
                    var character= "";
                    console.log(req.body.saycharacter);
                    console.log(results[0][0].id);
                    console.log(results[1][0].ownerId);
                    if (nameid[0].id == results[1][0].ownerId){
                        character = req.body.saycharacter;
                    }else{
                        character = results[0][0].id;   
                    }
                    var send_to
                    if (req.body.to){
                        send_to = Number(req.body.to);
                    }

                    var data = {
                        'charaId': character, 'section': req.body.say, 'send_to': send_to,
                        'comment': comment, 'comment_vol': req.body.vol_size, 'comment_at': time, 'memberId': results[0][0].memberId, 'sessionId': req.params.sid
                    };
                    //var data = {'name': results[0].name, 'character_name': character_name, 'section': req.body.say, 'send_to': req.body.to,
                    //            'comment': comment, 'comment_vol': req.body.vol_size, 'tag': tag, 'comment_at': time, 'memberId': results[0].memberId, 'sessionname': req.params.session };
                    console.log(data);
                    connection.query(
                        'INSERT INTO sessioncomment SET ?', data,
                        (error, result)=> {
                            //console.log(data);
                            res.redirect('/session/' + req.params.sid + '?pageNum=' + pageNum);
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

app.post('/createSession', isAuthenticated,(req, res) => {
    connection.query(
        'SELECT id, name FROM members WHERE login_id = ?',
        [req.session.passport.user],
        (error, nameid) => {
            
            //console.log(req.body)
            var data = {'sessionname': req.body.sessionName, 'status': '募集中', 'personNum': Number(req.body.personNum), 
                        'ownerId': nameid[0].id, 'pass': req.body.password, 'anonymous': Number(req.body.anonymous), 'secret': Number(req.body.secret), 
                        'system': req.body.systemName, 'overview': req.body.sessionOverView, 'audience': Number(req.body.audience) };
            console.log(data);
            connection.query(
                'INSERT INTO rooms SET ?; SELECT id FROM rooms WHERE sessionname = ?', [data, req.body.sessionName],
                (error, results) => {
                    var GMdata = { 'character_name': 'GM', 'attribute': "npc", 'image': 'GM.png', 'sessionId': results[1][0].id, 'memberId': nameid[0].id };
                    connection.query(
                        'INSERT INTO sessionmembers SET ?;', [GMdata],
                        (error,results) => {
                            res.redirect('/index');
                        }
                    )
                }
            )
        }
    )
})

// サーバーを起動するコードを貼り付けてください
app.listen(process.env.PORT || 5000);