function previewFile(file) {
    // プレビュー画像を追加する要素
    const preview = document.getElementById('preview');

    // FileReaderオブジェクトを作成
    const reader = new FileReader();
    preview.innerHTML += '<img src="/images/Noimage.png" width="150" height="150">';

    // ファイルが読み込まれたときに実行する
    reader.onload = function (e) {
        preview.innerHTML = '<img src="' + e.target.result + '" width="150" height="150">';
    }
    // いざファイルを読み込む
    reader.readAsDataURL(file);
}


// <input>でファイルが選択されたときの処理
const sizeLimit = 1024 * 1024 * 1;  // 制限サイズ
const fileInput = document.getElementById('icon');
const handleFileSelect = () => {
    const files = fileInput.files;
    for (let i = 0; i < files.length; i++) {
        if (files[i].size > sizeLimit) {
            // ファイルサイズが制限以上
            alert('ファイルサイズは1MB以下にしてください'); // エラーメッセージを表示
            fileInput.value = ''; // inputの中身をリセット
            return; // この時点で処理を終了する
        }
        previewFile(files[i]);
        
    }
}
fileInput.addEventListener('change', handleFileSelect);