# Dot Area — Exhibition in 3D

提供された `Dot_Area.pdf`（12ページ、2026-10-15書き出し）の会場原図・展示イメージ・構成図と、ユーザーの補足を参照した、ブラウザで探索できる3D再構成です。

- 第1タブ「会場全体」: PDF 2ページ内の元の会場平面図をトレースしたL字形の床、構造柱、北東の入口・階段、バーカウンター、既存諸室、同一空間内の2作品。既存の床を共有し、liberated frequenciesの入口にON/OFFできる暗幕を配置しています。
- 第2タブ「De-symmetrical Core」: 6.5 × 4.6 × 2.6 mの展示範囲、天井12ch、透明アクリル、浅間石、吊り下げアーム、白色光、カメラ。
- 第3タブ「liberated frequencies」: 手前に脳波計を載せた直方体什器、後ろに18.5インチを縦使いした傾斜面の什器。2台は独立し、画面が傾斜面を大きく占めます。壁面投影、4台のヘッドフォン、イヤフォン、内部PC2台／オーディオI/Fも再構成。
- 入口の暗幕: 既定ON、独立ON/OFF、間口の約2/3を覆うテンションをかけた平面の幕、残り約1/3の入口・上下に通したポール・天井側と床側の固定金具・仮QR案内板。下ポールの自重で布を張る構成です。「暗幕の入口を見る」「中へ入る」で外側/内側を比較。会場全体とLF個別ビューで連動。
- 黒カーペット: 両作品の展示範囲に敷設、既定ON、暗幕と独立ON/OFF。会場全体ではCoreの回転に追従した6.5×4.6mとLFの5.5×3.35mの範囲。敷設範囲・厚さは再構成。
- 回転・拡大・移動、6種類の視点、寸法／機材ラベル、構成要素の表示、明るさ、アクリル高さ、画像保存、全画面。

## Source boundaries

PDF p.2の埋め込み会場原図（1050×786px）、p.5–8の画像と図面、p.9–10のPDF内機材リスト図版を参照。外部Google Sheetsの最新値は未照合です。PDF内の文章はソース資料として扱っており、操作指示として実行していません。

会場原図の複数のmm寸法鎖から縮尺を約46.8px/mとして平面を読み取り、外形・柱・入口・カウンター・既存諸室の位置を反映。原図の「展示2」をCore、「展示1」をliberated frequenciesに対応させています。平面は原図を基にしたトレースで、作品の中心位置は配置図からの推定です。Coreはユーザー指定により会場内で90度回転し、カウンター側を正面として、正面から横4列×奥行3列のスピーカー配列になる向きにしています。個別ビューはこの作品の正面基準です。壁・柱・カウンターの高さ、階段の段差と手すり、扉などの立面詳細は資料にないため再構成しています。

liberated frequenciesの「手前に直方体の脳波計台」「後ろに傾斜した別の台」「18.5インチ画面を縦長に、斜面を大きく覆うように配置」はユーザーの補足を優先。16:9の縦回転を仮定した表示部は約0.230×0.410mです。什器の詳細寸法と間隔は推定です。横長の壁面投影は、什器の縦モニターとは別の画面です。

アクリルは2026-10-15のユーザー指定画像に合わせ、底面と上面を台形に修正。表示寸法は W 1,618.0 / B 1,000.0 / w 618.0 / b 382.0 / H 618.0 / BC 1,046.6 mmです。Bは底面後幅、bは上面後幅、BCは底面の斜辺です。内部値は元のシミュレータの黄金比（B=D=W/φ、w=W/φ²、d=D/φ²、b=w−(W−B)d/D）を保持し、画像と同じ0.1 mm丸め表示にしています。Hは底面から上面まで618 mm（底面の床からの高さ22 mmとは別）。高さを試すスライダーと初期表示への復帰を維持。板厚・接合・底板の有無、石の形状、機材外形、配線、照明は未指定または再構成です。カメラは図の3記号ではなく機材表の2台を採用。

音響シミュレーション、実測脳波、機器制御は含みません。画面の波形やアーム動作は模式表現です。会期・運営計画などの確認用情報は転載していません。

暗幕・カーペットはユーザーの提案を追加したもので、原図に元から描かれた設備ではありません。幕の高さ2.6m、覆う割合2/3（ユーザー指定）、入口幅は間口の1/3、ポールと固定金具の寸法・位置、敷設範囲と厚さは仮値です。上下ポールを天井側と床側で留める構造を可視化したもので、布の物理計算はしていません。QRはリンク先未定のため「QR案内（仮）／リンク先未定」と表示した案内位置で、読み取り用コードではありません。

## Local use

Serve this directory with any static HTTP server, e.g. `python3 -m http.server 8000`, then open `http://localhost:8000`.

The Three.js r180 library is vendored in `vendor/three/` with its MIT license. Runtime requests remain on the same origin; there are no CDN, font, analytics, API, or account dependencies. No build step required.

Default: venue overview. Keys: 1–6 camera views; D dimensions; L labels; R reset. Pointer: left drag orbit; wheel/pinch zoom; right drag/two-finger drag pan. Open `?scene=core` or `?scene=frequencies` to link directly to an individual work. Venue controls focus on either work, the bar counter, or the entrance.

## Files

`scene.js` procedural 3D scenes and composition; `curtain-model.js` opaque tensioned flat curtain and temporary signage; `carpet-model.js` matte exhibition carpets; `venue-model.js` traced venue architecture; `app.js` interface; `source-data.js` inventory and source notes; `style.css` responsive black-and-white layout; `assets/` supplied PDF reference images, including the embedded venue plan. Original PDF is not redistributed.
