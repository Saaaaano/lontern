$(function () {
    if (window.matchMedia("(max-width: 768px)").matches) {
        /* ウィンドウサイズが 768px以下の場合のコードをここに */
        ;
    } else {
        /* ウィンドウサイズが 768px以上の場合のコードをここに */
        $("#ID").css({
            //opacity: "0.9",
            position: "absolute",
            display: "none"
        });
        $("a.onMouse").on('mouseover', function () {
            //レス番のname要素を取得
            var popupID = $(this).attr("name");
            //#IDにnameのhtmlをコピーする
            $("#ID").html($("#" + popupID).clone());
            //フェードインで表示
            $("#ID").fadeIn("fast");
        }).on('mouseout', function () {
            //フェードアウトで非表示
            $("#ID").fadeOut("fast");
        }).on('mousemove', function (e) {
            //マウスから以下の位置で表示する。
            $("#ID").css({
                "top": e.pageY + 5 + "px",
                "left": e.pageX + 5 + "px"
            });
        });
    }


    $("#glayLayer").on('click', function () {
        $(this).hide();
        $("#overLayer").hide();
    });
    $("a.onMouse").on('click', function () {
        //console.log("display_overview")
        var popupID = $(this).attr("name");
        $("#glayLayer").show();
        $("#overLayer").show().html($("#" + popupID).clone());
        return false;//aタグを無効にする
    })
    $(document).on('click', 'a.onMouse', function () {
        //console.log("display_overview")
        var popupID = $(this).attr("name");
        $("#glayLayer").show();
        $("#overLayer").show().html($("#" + popupID).clone());
        return false;//aタグを無効にする
    })

    //スマホホバー解除
    var touch = 'ontouchstart' in document.documentElement || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;

    if (touch) {
        try {
            for (var si in document.styleSheets) {
                var styleSheet = document.styleSheets[si];
                if (!styleSheet.rules) continue;

                for (var ri = styleSheet.rules.length - 1; ri >= 0; ri--) {
                    if (!styleSheet.rules[ri].selectorText) continue;

                    if (styleSheet.rules[ri].selectorText.match(':hover')) {
                        styleSheet.deleteRule(ri);
                    }
                }
            }
        } catch (ex) { }
    }


});
