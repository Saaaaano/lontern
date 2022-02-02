$(function () {
    $("#ID").css({
        //opacity: "0.9",
        position: "absolute",
        display: "none"
    });
    $("a.onMouse").mouseover(function () {
        //レス番のname要素を取得
        var popupID = $(this).attr("name");
        //#IDにnameのhtmlをコピーする
        $("#ID").html($("#" + popupID).clone());
        //フェードインで表示
        $("#ID").fadeIn("fast");
    }).mouseout(function () {
        //フェードアウトで非表示
        $("#ID").fadeOut("fast");
    }).mousemove(function (e) {
        //マウスから以下の位置で表示する。
        $("#ID").css({
            "top": e.pageY + 5 + "px",
            "left": e.pageX + 5 + "px"
        });
    });
    /*
    $('a.onMouse').on('click', function () {
        //レス番のname要素を取得
        var popupID = $(this).attr("name");
        //#IDにnameのhtmlをコピーする
        $("#modal").html($("#" + popupID).clone());
        $("#modal").fadeIn("fast");
        //キーボード操作などにより、オーバーレイが多重起動するのを防止する
        $(this).blur();	//ボタンからフォーカスを外す
        if ($("#modal-overlay")[0]) return false;		//新しくモーダルウィンドウを起動しない [下とどちらか選択]
        //if($("#modal-overlay")[0]) $("#modal-overlay").remove() ;		//現在のモーダルウィンドウを削除して新しく起動する [上とどちらか選択]

        //オーバーレイ用のHTMLコードを、[body]内の最後に生成する
        $("body").append('<div id="modal-overlay"></div>');

        //[$modal-overlay]をフェードインさせる
        $("#modal-overlay").fadeIn("slow");
        $("#modal").css({
            "width": "50%",
            "margin": "1.5em auto 0",
            "padding": "10px 20px",
            "border": "2px solid #aaa",
            "background": "#fff",
            "z-index": "2",

        });
        $("#modal-overlay").css({
            "z-index": "1",
            "display": "none",
            "position": "fixed",
            "top": "0",
            "left": "0",
            "width": "100%",
            "height": "120%",
            "background-color": "rgba(0, 0, 0, 0.75)"
        });
    })

    function centeringModalSyncer() {

        //画面(ウィンドウ)の幅を取得し、変数[w]に格納
        var w = $(window).width();

        //画面(ウィンドウ)の高さを取得し、変数[h]に格納
        var h = $(window).height();

        //コンテンツ(#modal-content)の幅を取得し、変数[cw]に格納
        var cw = $("#modal-content").outerWidth({ margin: true });

        //コンテンツ(#modal-content)の高さを取得し、変数[ch]に格納
        var ch = $("#modal-content").outerHeight({ margin: true });

        //コンテンツ(#modal-content)を真ん中に配置するのに、左端から何ピクセル離せばいいか？を計算して、変数[pxleft]に格納
        var pxleft = ((w - cw) / 2);

        //コンテンツ(#modal-content)を真ん中に配置するのに、上部から何ピクセル離せばいいか？を計算して、変数[pxtop]に格納
        var pxtop = ((h - ch) / 2);

        //[#modal-content]のCSSに[left]の値(pxleft)を設定
        $("#modal-content").css({ "left": pxleft + "px" });

        //[#modal-content]のCSSに[top]の値(pxtop)を設定
        $("#modal-content").css({ "top": pxtop + "px" });

    }

    $("#modal-overlay,#modal-close").unbind().click(function () {
        //[#modal-overlay]、または[#modal-close]をクリックしたら起こる処理
        $("#modal-overlay").remove();
    });
    */
    
});