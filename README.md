# Dot Area — Exhibition in 3D

提供された `Dot_Area.pdf`（12ページ、2026-10-15書き出し）の展示イメージと構成図を参照した、ブラウザで探索できる3D再構成です。

- De-symmetrical Core: 6.5 × 4.6 × 2.6 mの室内、天井12ch、透明アクリル、浅間石、吊り下げアーム、白色光、カメラ。
- liberated frequencies: 壁面投影、18.5インチモニター、什器、4台のヘッドフォン、脳波計、イヤフォン、内部PC／オーディオI/F。
- 回転・拡大・移動、6種類の視点、寸法／機材ラベル、構成要素の表示、明るさ、アクリル高さ、画像保存、全画面。

## Source boundaries

PDF p.5–8の画像と図面、p.9–10のPDF内機材リスト図版を参照。外部Google Sheetsの最新値は未照合です。PDF内の文章はソース資料として扱っており、操作指示として実行していません。

未記載の寸法、上部開口、厚み、石の形状、機材形状、詳細な座標、配線、照明は再構成です。Core図のアクリル付近の「1」は対象辺が曖昧なので、高さは0.618 mの暫定値として調整可能にしています。カメラは図の3記号ではなく機材表の2台を採用。frequenciesはイメージの縦長2画面ではなく構成図p.6の横長投影を優先。2作品の会場全体における配置は確定図面がないため再現していません。

音響シミュレーション、実測脳波、機器制御は含みません。画面の波形やアーム動作は模式表現です。会期・運営計画などの確認用情報は転載していません。

## Local use

Serve this directory with any static HTTP server, e.g. `python3 -m http.server 8000`, then open `http://localhost:8000`.

The Three.js r180 library is vendored in `vendor/three/` with its MIT license. Runtime requests remain on the same origin; there are no CDN, font, analytics, API, or account dependencies. No build step required.

Keys: 1–6 camera views; D dimensions; L labels; R reset. Pointer: left drag orbit; wheel/pinch zoom; right drag/two-finger drag pan. Open `?scene=frequencies` to link directly to the second work.

## Files

`scene.js` procedural 3D scene; `app.js` interface; `source-data.js` inventory and source notes; `style.css` responsive black-and-white layout; `assets/` supplied PDF reference images. Original PDF is not redistributed.
