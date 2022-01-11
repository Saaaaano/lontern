
const pre = document.getElementById('pre');
pre.insertAdjacentHTML('beforeend', character.character_name);
const comment_set = () =>{
    
    /*
    preview.innerHTML += '<img src="/images/upload_icon/' + comment[i].image + '" width="110" height="110">';
    preview.innerHTML += '<div>';
    preview.innerHTML += '<div class="speech_data">';
    switch(comment.section){
        case "nomal":
            preview.innerHTML += i+1 + '. ' + comment[i].character_name;
        case "secret":
            preview.innerHTML += 'FROM: ' + comment[i].character_name;
            break;
        case "anonymous":
            preview.innerHTML += i+1 + ". 匿名"
            break;
        case  "solo":
            preview.innerHTML += "[独り言]" + comment[i].character_name;
            break;
    }
    
    preview.innerHTML += '<a class="date">' + comment[i].comment_at + '</a>';
    preview.innerHTML += '</div>';
    preview.innerHTML += '<div class="speech_' + comment[i].section + '">';
    switch (comment.comment_vol) {
        case "big":
            preview.innerHTML += '<big><strong>' + comment[i].comment + '</strong></big>';
            break;
        case "small":
            preview.innerHTML += '<small><font color="gray">' + comment[i].comment + '</font></small>';
            break;
        case "nomal":
            preview.innerHTML += comment[i].comment;
            break;

    }
    preview.innerHTML += '</div>';
    preview.innerHTML += '</div>';
    */
}
//test.addEventListener('load', comment_set);

var contentBlock = document.getElementById('preview');
contentBlock.insertAdjacentHTML('afterbegin', '<b>Test:</b>');