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

    $("#glayLayer").on('click' ,function(){
        $(this).hide();
        $("#overLayer").hide();
    });
    $("a.onMouse").on('click',function(){
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
    


});
