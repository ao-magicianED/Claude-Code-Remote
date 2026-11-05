# 購入済み電子書籍（Kindle / 楽天Kobo / ebookjapan）を Claude Code 等の AI に読み込ませる方法 — 調査結果と実装実現性

調査日: 2026-11-05
調査方法: 7 名のリサーチャー（サブエージェント）を並行稼働し、GitHub の README・ソース・Issue、MobileRead フォーラム、note / Zenn / X の投稿、e-Gov の法令原文、各ストアの利用規約原文を直接取得して検証。
表記: **【事実】** = 一次資料で確認、**【報告】** = 第三者の報告、**【推測】** = 根拠からの推論。
実現性: ◎ = 複数の成功実績あり・手順確立 / ○ = 動くが条件付き / △ = 理論上可能・未検証 / × = 不可・現実的でない

---

## 0. 結論（先に要点）

1. **できる。ただし「規約の範囲内で全文を取る」方法は存在しない。** 規約内で取れるのは「自分のハイライト（出版社設定の上限で本文の 10〜20% まで）＋自分のメモ（上限なし）＋書誌情報」まで。全文を AI に読ませるなら、どこかで規約グレーに踏み込む必要がある。
2. **2026 年 11 月時点の本命は「画面キャプチャ＋OCR」**。Kindle Cloud Reader（ブラウザ版）を Playwright で自動ページ送りし、本文画像を撮影 → 国会図書館製の無料 OCR「NDLOCR-Lite」で文字起こし → Markdown → Claude Code に読ませる。これが日本語圏で最も実績があり（404 冊処理した OSS あり）、法的にも最も安全（私的複製の範囲、DRM 回避に当たらない）で、アカウント停止の一次報告はゼロ。
3. **DRM 解除（Calibre + DeDRM）は品質最高だが現在かなり厳しい**。Windows 11 + TPM 2.0 必須、Mac は無料経路なし、Microsoft Store 版 Kindle アプリが月 1〜2 回更新されるたびにツールが壊れ、単独メンテナが数日〜3 週間で直す、の繰り返し。法的には刑事罰なしだが民事リスクあり、規約には明確に違反。
4. **楽天Kobo は Kobo 実機（Clara / Libra 等）＋ Calibre/Obok が最も確実**。ブラウザ版は日本ではコミック・雑誌のみで小説は不可。
5. **ebookjapan は漫画中心でテキスト OCR の意味が薄い**。ファイル単位の DRM 解除ツールは存在しないが、ブラウザビューアのページ画像を再構成するユーザースクリプト（2026-10 更新の現役もの）がある。アプリ版はスクショが真っ黒になる。
6. **法的リスク**: 全手法とも刑事罰なし（私的使用目的の複製は 119 条 1 項括弧書きで明文除外）。DRM 解除は民事責任があり得る（30 条 1 項 2 号）が、個人の自分用解除を権利者が提訴した例は見つからなかった。**ツールや鍵を公開・配布すると 120 条の 2 で刑事罰（非親告罪）** なので、作ったスクリプトは絶対に公開しない。
7. **規約・BAN リスク**: Kindle ストア利用規約（2026-10-21 版）は「DRM…を迂回、修正、無効化、回避してはならない」と明記。Cloud Reader の自動操作は Amazon.co.jp 利用規約の「ロボット等のデータ収集・抽出ツール」禁止に形式上抵触し得る。ただし **DRM 解除・スクショ自動化が原因と確認できるアカウント停止の実例は英語圏・日本語圏とも見つからなかった**。Amazon が実際に検知してロックしたのは「短時間の大量ダウンロード」（2024-12）のような量の異常。
8. **最大の実害リスクは AWS の巻き添え**。Amazon.co.jp 公式ヘルプはアカウント閉鎖時に「アマゾン ウェブ サービス (AWS) アカウントとアカウント内のリソース」も失うと明記。AWS・Prime・Audible と同じログインで実験しないこと。

---

## 1. ストア × 手法 実現性マトリクス

| 手法 | Kindle | 楽天Kobo | ebookjapan | 法的素性 | 規約 |
|---|---|---|---|---|---|
| **A. DRM 解除 → EPUB/テキスト** | ○（Win11+TPM のみ。Mac ×。毎月壊れる） | ◎（実機 + Obok）/ ○（デスクトップ + Obok、日本語 Windows でロケール問題） | ×（ツールが存在しない） | 刑事なし・民事あり得る | 明確に違反 |
| **B. 画面キャプチャ + OCR** | ◎（Cloud Reader + Playwright、最多実績） | ○（デスクトップアプリ/実機画面の撮影。Web 版は漫画のみ） | ○（ブラウザ版のみ。アプリは真っ黒） | 私的複製の範囲（最も安全） | 自動操作はグレー |
| **B'. ビューア内部データからページ画像再構成** | △（Antigraph 等、OCR 不要だが日本語未実証） | — | ◎技術 / 壊れやすい（dokuha-userscript） | B に準ずる | グレー〜濃いグレー |
| **C. アクセシビリティ層から本文テキスト取得** | △（Android TalkBack / Win 新アプリ + スクリーンリーダー。英語本は確実、日本語本は要検証） | ×（日本では全滅） | × | B に準ずる【推測】 | 「抽出」禁止に触れ得る |
| **D. ハイライト・メモの公式書き出し** | ◎（ただし本文の 10〜20% 上限） | ○（kobo.com の Export Annotations、日本アカウントでの表示は未確認） | ×（機能の存在自体が未確認） | 白 | 白 |
| **E. 公式 AI 機能（Recaps / Ask this Book）** | ×（米国・英語書籍限定、API なし） | — | — | — | — |

---

## 2. Kindle — 詳細

### 2-1. 最重要の技術的事実: Cloud Reader の本文は「画像」である

- **【事実】** read.amazon.co.jp のリーダーは、本文を DOM 上のテキストとして持っていない。1 ページ = 1 枚の `<img src="blob:...">` 画像（`div.kg-full-page-img > img`）。日本語縦書き本で実測: テキストノード合計 0 文字、`selectAll` で 0 文字選択。ライブラリ 405 冊中、開けた 342 冊すべてが画像レンダラ。（[kindle_shot Issue #26](https://github.com/ahalcyon/kindle_shot/issues/26)、[#29](https://github.com/ahalcyon/kindle_shot/issues/29)）
- **【事実】** 内部的には `/renderer/render` API が TAR アーカイブを返し、文字は Unicode ではなく「約 5 ページごとにシャッフルされるグリフ ID」で届く。canvas に描画 → PNG 化 → `<img>` に差し替え。（[noh.am 2025-10-19](https://noh.am/en/posts/kindle-web-reader-pages/)、[CastReader 解説](https://dev.to/vin_xu_e23f6af14388f72812/how-castreader-cracks-kindles-font-encryption-for-text-to-speech-4b5m)）
- **→ 結論: ブラウザの DOM からテキストを抜く古い手法（2019 年の Tampermonkey スクリプト等）は全滅。画面キャプチャ＋OCR が唯一の現実的経路。**
- 塞がれた経路（すべて【事実】）: Cloud Reader のオフライン機能/IndexedDB（2020-07 消失、WebSQL は Chromium 119 で削除）、Kindle 実機 USB（ファーム 5.18.5 以降 hardened DRM）、「USB 経由でダウンロードして転送」（amazon.co.jp も 2025-02-26 廃止、[GIGAZINE](https://gigazine.net/news/20250217-kindle-books-download-and-transfer-discontinued/)）、Android ローカルファイル（鍵なし不可）。

### 2-2. 手法 B: 画面キャプチャ＋OCR（本命）

#### 既存 OSS の比較

| ツール | 仕組み | 日本語/縦書き | メンテ状況 | 評価 |
|---|---|---|---|---|
| [ahalcyon/kindle_shot](https://github.com/ahalcyon/kindle_shot) | headless Playwright（永続プロファイル、UA 偽装、`AutomationControlled` 無効化）→ `.kg-full-page-img img` を要素撮影 → NDLOCR-Lite（CPU）→ PDF/Markdown。Windows 画面キャプチャ経路も同梱 | 縦書き・横書き実機検証済、漫画 153 冊取得済 | 96 コミット、最終 2026-09-21、Issue 67 件、実運用 404 冊 | **最有力** |
| [ishimikazuki/kindle-autosave-kit](https://github.com/ishimikazuki/kindle-autosave-kit) | Playwright（非 headless）→ viewport 撮影 → Google Cloud Vision → Markdown。Claude Code スキル `/kindle` 同梱 | read.amazon.co.jp 前提、縦書きは ArrowLeft | 3 コミット（2026-05-23）で放置 | 設計参考に |
| [tsunoda-s-ft/kindle-app](https://github.com/tsunoda-s-ft/kindle-app) | Playwright + Cloud Reader 内部 API `KindleRenderer.nextScreen()` 等 → PNG → PDF（OCR なし） | リフロー型のみ | 6 コミット、2025-12 で停止 | 内部 API は壊れやすい |
| [daishir0/kindle2ss](https://github.com/daishir0/kindle2ss) | Windows 前面ウィンドウを固定矩形キャプチャ → Yomitoku | 日本語前提 | 2026-06 まで散発更新 | デスクトップアプリ経路の参考 |
| [masterleopold/book-capture](https://github.com/masterleopold/book-capture) | Claude Code プラグイン。Mac Kindle / Apple Books / Cloud Reader → macOS Vision OCR、低信頼ページは Claude が再読 | 「Vision は縦書き不可、縦書き本は全ページエージェントが読む」 | 2026-03 v1.1.0 | Mac 向け |
| [imutaroh kindlesnap](https://github.com/imutaroh/kindle-screenshot-app/pull/4) | Kindle for Mac を CGEventPost でページ送り → **macOS 26 `RecognizeDocumentsRequest`** で縦書き OCR、柱・ルビ除去、段落結合 | 13 冊で実機検証 | 2026-10-12 | **Mac 向け最有力** |

#### 実測数値（【事実】、出典は上記各リポジトリ・記事）

- 速度: Cloud Reader headless 経路で **1 冊（300 ページ）14〜22 分**（kindle_shot 実測中央値 6.9 分/冊 ※ページ数混在、tsunoda SKILL「300 頁 20〜30 分」、リットン「200 頁 10 分」）。デスクトップアプリ + pyautogui なら 6〜10 分だが画面を占有。
- **30 冊（9,000 ページ）なら無人運転で 10〜15 時間、人手込みで 1〜2 日**。
- **日本語蔵書の約 15.6%（405 冊中 63 冊、技術書・ビジネス書中心）は Cloud Reader 非対応** → Kindle デスクトップアプリ経由のキャプチャで救済（kindle_shot #42, #127）。
- リットン氏の実測: 54 冊・12,221 枚を 27.6 時間で無人バッチ処理、運用は Claude Code に委任（[lyttonblog](https://lyttonblog.com/programming/ebook-pdf-ocr/)）。
- ディスク: PNG 約 193KB/頁 → 58MB/冊。

#### OCR エンジン比較（日本語縦書き）

| エンジン | 縦書き精度 | コスト | 備考 |
|---|---|---|---|
| **NDLOCR-Lite**（国会図書館、2026-02-24 公開） | 縦書きビジネス書 120 頁で **正解類似度 99.49%**（[Zenn](https://zenn.dev/phpmyadmin/articles/0dba6fef411e21)）。Kindle 実運用で信頼度中央値 0.931。弱点: 小書き仮名→大書き 15%、濁点/半濁点 | **無料・ローカル・CPU 可**（約 5.5 秒/頁） | CC BY 4.0。**2026 年の事実上の標準** |
| Yomitoku | 90〜95%【体感】、手書きに強い | 無料だが **CC BY-NC-SA（非商用）**、GPU 推奨 | Markdown 直接出力が便利 |
| Apple Vision（macOS 26 `RecognizeDocumentsRequest`） | 縦書き対応は macOS 26 から（それ以前の `VNRecognizeTextRequest` は縦書き不可）。横書きで 95〜98%、340 頁 6 分 | 無料・ローカル | Mac ユーザーの第一候補 |
| Google Cloud Vision | 95〜98%【体感】だが **縦書きで行順が崩れる報告** | 月 1,000 頁無料、以降 $1.50/1,000 頁（≒ 200 頁 40 円） | Gemini で後修正すると「ほぼ 99%」 |
| Gemini 2.5 Flash | 縦書き青空文庫で 0.91〜0.92（GPT-5-nano 0.09）と VLM 中では圧勝 | Flash-Lite が最安 | **長文で文章ごと脱落する**弱点 |
| Claude vision | 原稿用紙テストで Opus 4.1 70/100、Sonnet 4 65/100（Gemini 2.5 Pro 98）。縦書き定量評価なし | Haiku 5.5 で 1 冊 $0.2 程度 | 単体 OCR は非推奨。構造化・校正役に |
| 汎用 MLLM 全般 | **縦書きで CER が 10〜20 倍悪化**（ANLP 2026: GPT-4.1 横書き 1.88 → 縦書き 18.2〜38.7） | — | 学術評価で明確に劣化 |

**コミュニティの合意（2026 年半ば）**: 「文字精度は NDLOCR-Lite で十分。見出し・表などの構造化が欲しければ NDL の結果をヒントとして LLM に渡すハイブリッド。Claude 単体の縦書き OCR は信頼しない。Gemini は速いが脱落に注意。LLM に画像を直投げするとトークンが 3〜5 倍、上位モデルだと 1 冊 $7 級」。

#### 30 冊（9,000 頁）の OCR コスト試算【導出】

| OCR | 概算 |
|---|---|
| NDLOCR-Lite / Apple Vision / Yomitoku | **$0** |
| Google Cloud Vision | 約 $12（¥1,800） |
| Gemini 2.5 Flash-Lite | 約 $3.5 |
| Claude Haiku 5.5 | 約 $5（Batch で $2.5） |
| Claude Sonnet 5.5 | 約 $95 |
| Claude Opus 5.5 | 約 $190 |

#### 壊れやすいポイント（【事実】kindle_shot の Issue 履歴より）

1. Cloud Reader の DOM・文言依存（`.kg-full-page-img`、`.footer-label.position`、`ion-alert`、日英混在のボタン文言、フッター単位が「位置」→「ページ」に切替、非対応本が無言で `/kindle-library` に戻る、未ログインで `/landing` に飛ぶ）
2. 認証: 2FA / CAPTCHA / パスキーは全ツールで手動前提。**初回だけ headed で手動ログインし、以後プロファイルを絶対に消さない**。連続ログイン失敗はアカウントロックの原因
3. **巻き戻し操作が Whispersync の読書位置を動かす**（他端末に影響）
4. OCR 固有: 小書き仮名、濁点、縦書きの列順、ルビが本文に混入（ラノベで顕著）、漫画の OCR 層は「無い方がまし」
5. 4 候補とも個人開発・単独メンテナ

### 2-3. 手法 A: DRM 解除（Calibre + DeDRM）の 2026 年 11 月実態

**【事実】2026 年 11 月時点で無料で現実に動く経路は実質 1 本**:
**Windows 11（x64、TPM 2.0 必須）+ Microsoft Store 版「Amazon Kindle: Reading App」+ Satsuoni 版 DeDRM 同梱の `MSIXKFXArchiver` + Calibre の KFX Input プラグイン**

| OS / 経路 | 状態 | 根拠 |
|---|---|---|
| Win11 + Store 版 Kindle + Satsuoni v10.0.34（2026-11-03、Experimental）| ◎（ただし確認報告 2 件のみ） | [Satsuoni Releases](https://github.com/Satsuoni/DeDRM_tools/releases)、[Discussion #152](https://github.com/Satsuoni/DeDRM_tools/discussions/152)、[akitaonrails 106 冊成功](https://akitaonrails.com/en/2026/07/30/removing-drm-from-kindle-ebooks-in-2026/) |
| 旧 Kindle for PC 1.17 / 1.26 + 旧 DeDRM | × | 2026-06-30 サポート終了、ログイン不可 |
| Kindle for PC 2.9.1 | ?（既存セッション延命のみ、新規不可と見るべき） | — |
| Windows 10 / Windows on ARM | × | Store がブロック |
| Mac（Intel） | ×（Windows VM + 仮想 TPM で回避可） | MobileRead「basically dead」 |
| Mac（Apple Silicon） | × | 文書化された経路なし |
| Linux | ◎（Win11 VM + vTPM 内で実行） | akitaonrails が dockur/windows で実施 |
| Kindle 実機 + シリアル番号 | ×（Voyage 以外ほぼ全滅） | ファーム 5.12.2.2 / 5.16.2.1.1 / 5.18.x で hardened DRM |
| 脱獄済み Kindle 実機 | ○（脱獄可能ファーム限定） | [Discussion #74](https://github.com/Satsuoni/DeDRM_tools/discussions/74) |
| noDRM 版 DeDRM（v10.0.9） | × | 2024-11 以降コミットなし、現行 KFX 不可 |

- **amazon.co.jp アカウントでの動作報告あり【事実】**: Satsuoni 本人が日本在住で日本アカウントで検証。Store アプリの日本向けダウンロード対応は build 1.0.16118（2026-06-12）から。
- **日本語本の品質【事実】**: KFX Input は縦書き・ルビ・RTL・見開きを明示サポート、2026 年 5 月に日本語縦書き専用修正 2 回。未解決報告 1 件（縦書き小説の段組が極端に狭くなる、再現できず）。**漫画は Windows 版だと低解像度配信（1280×1920 vs Android 2037×3056）＋一部「Unsupported content」で開けない**。
- **保守性リスク【事実】**: 2026-06〜10 で Store アプリ更新 9 回以上、都度ツールが破損。修復は 1〜2 日〜18 日。v10.0.34 のリリースノートに「コードの多くは AI 支援で未テスト」と明記。**「今日やれば動く、半年後に同じ手順が動く保証はない」**。
- 実務的な被害最小化: アプリ自動更新を止めて対応版に固定 → 欲しい本をまとめて一気に処理 → kfx-zip と k4i を保管。

### 2-4. 手法 C: アクセシビリティ層（OCR 不要の第三経路）

- **【事実】** Windows 新 Kindle アプリ + NVDA の実測（[epubtest.org 2026-08-15](https://epubtest.org/results/509)）: Non-visual Reading 75%、**テキスト選択・コピーは動作、文字/単語/行単位の移動は動作** → 本文テキストがアクセシビリティ層に露出している。
- **【報告】** Android TalkBack / iOS VoiceOver で日本語 Kindle 本の読み上げ確認あり（2024-06）。→ `AccessibilityNodeInfo.text` に本文が入っている可能性が高い【推測】。
- **【未確認】** 日本語本の Windows 対応は資料が矛盾（2017・2022 は否定、2025 以降対応との未検証報告あり）。「Screen Reader: Supported / Enhanced Typesetting」の本に限られ、固定レイアウト・漫画は不可。
- 実装概略: Android エミュレータ + 自作 AccessibilityService（`com.amazon.kindle` の `TYPE_WINDOW_CONTENT_CHANGED` で `getText()` を段落順収集、`dispatchGesture` でページ送り）。簡易検証は `adb shell uiautomator dump` で XML に本文が出るか見るだけ。
- 評価: OCR 劣化ゼロ・DRM 非接触という利点は大きいが、**公開実装ゼロ・日本語本未検証**。実験として面白いが本命にはできない。

### 2-5. 手法 D: 公式ハイライト書き出し（規約内）

- **【事実】** 出版社設定の「エクスポート上限」は典型 10〜20%（[Readwise docs](https://docs.readwise.io/readwise/docs/importing-highlights/kindle)）。本を全部ハイライトしても上限以降は切断・非表示（1,211 箇所ハイライトした人の例: 283 件切断、180 件位置番号のみ）。
- **【報告】** メモ（ノート）には上限がない → 「本文を引用せず自分の言葉でメモを書く」のが唯一上限のないテキスト経路。
- 既製 MCP サーバー（[0xpili/kindle-notes](https://github.com/0xpili/kindle-notes)、[mayankbohradev/kindle-mcp](https://github.com/mayankbohradev/kindle-mcp)）は**すべて amazon.com 前提**。コードを読んだ限り、`src/config.ts:18` の `AMAZON_READ_URL` と `parse.ts` の英語ラベル正規表現の 2 箇所で `.co.jp` 化できそう（未検証）。kindle-mcp は `KINDLE_HOST=read.amazon.co.jp` の環境変数で切替可能。
- Readwise の Kindle 自動同期は amazon.co.jp 非対応（メール取り込みで回避可）。

---

## 3. 楽天Kobo — 詳細

| # | 経路 | 実現性 | 要点 |
|---|---|---|---|
| K1 | **Kobo 実機（Clara / Libra 等）→ USB → Calibre + Obok** | ◎ | 端末シリアル + KoboReader.sqlite から復号。設定不要で動作（2025-07 報告）。実機がなければ中古 Clara（1 万円前後）を買う方がデスクトップ経路のトラブルシュートより安い【推測】 |
| K2 | Kobo デスクトップアプリ（Win/Mac）→ Calibre + Obok | ○ | 楽天 ID でログイン可・Obok 動作の 2025-11〜2026-01 報告あり。**Win11 24H2+ の非英語ロケール（日本語 Windows 該当）で「No userkeys found」**（[noDRM #1065](https://github.com/noDRM/DeDRM_tools/issues/1065)、2026-10 未修正、パッチ案あり）。公式配布導線が Web Reader にリダイレクトされるようになった（2025-10） |
| K3 | [kobo-book-downloader](https://github.com/TnS-hun/kobo-book-downloader)（Kobo API 直叩き） | △ | アプリも実機も不要、2026-09 まで活発。**日本アカウントでの動作報告なし** |
| K4 | ブラウザ版「ブラウザで読む」の画面キャプチャ | △ | **日本ではコミック・雑誌（固定レイアウト）限定。小説は不可** |
| K5 | kobo.com の Export Annotations / KoboReader.sqlite から注釈抽出 | ○ | ハイライトのみ。日本アカウントでの表示は未確認 |
| K6 | アプリのスクリーンショット | 未確認 | FLAG_SECURE の一次情報なし |

- Obok を含む noDRM/DeDRM_tools は 2022-07 の v10.0.3 が最新安定版、メンテナ自身が 2026-10-25 に「非アクティブ」とコメント【事実】。
- Kobo 公式ヘルプが「日本の顧客は DRM ファイルとしてダウンロード不可」と明記 → ADE/ACSM 経路は×。
- **推奨: K1（実機 + Obok）。工数: Calibre + DeDRM_tools 導入 30 分、1 冊あたり数分。EPUB → `ebook-convert book.epub book.txt` で Claude Code へ。**

---

## 4. ebookjapan — 詳細

| # | 経路 | 実現性 | 要点 |
|---|---|---|---|
| E1 | ブラウザビューアで動くユーザースクリプト（[dokuha-userscript v3.1.0](https://github.com/GolyBidoof/dokuha-userscript)、2026-10-20 更新）でページ画像を再構成して ZIP 保存 | ◎技術 / 壊れやすい | ビューアの wasm を実行してタイル・スクランブルを復元。mokuro（manga-ocr）連携内蔵。**購入済み巻で動くか README に明記なし → 1 巻で要検証** |
| E2 | ブラウザビューアの画面キャプチャ自動化（Reader Capture / pyautogui / Playwright） | ○ | 2023-03 に ebookjapan で動作する設定例あり（[てけとーぶろぐ](https://kurima.hatenablog.com/entry/2023/03/05/162536)）。200 頁 10〜15 分【推測】 |
| E4 | iOS/Android アプリのスクリーンショット | × | 「完全に防がれ、Snipping Tool でも真っ黒」の報告 |
| E6 | ファイル単位の DRM 解除ツール | ×（存在しない） | DeDRM_tools 等に ebookjapan 対応なし |

- **【事実】** ビューアの技術構成: ページ画像はネットワーク経由で取得可能だがタイル・スクランブル済み、復元は wasm 内、表示は canvas、canvas からの書き出しメソッドは削除済み、CSP でループバック fetch をブロック。作者自身が「ビューアが変わるとアダプタ更新まで壊れる」と明記。
- **漫画のセリフ読み取り**: 学術ベンチマーク（[MangaVQA/MangaLMM, EACL 2026](https://arxiv.org/html/2505.20298v3)）で汎用 LLM の MangaOCR スコアは **GPT-4o 0.0、Gemini 2.5 Flash 0.0、Claude Sonnet 4.5 0.0**（専用モデル MangaLMM 71.5）。ただし内容理解 QA では Gemini 2.5 Flash 7.26/10 と意味は拾えている。**正確な台詞引用が必要なら mokuro（manga-ocr、切り出し済み吹き出しで 99.5%）経由、要約・質問応答ならビジョン直投入で可**。
- コスト感: 漫画 1 ページ ≒ Claude 標準ティアで約 1,560 トークン → 200 頁単行本 1 冊 ≒ 31 万トークン、Haiku なら $0.3〜2/冊。

---

## 5. 法的リスク・規約リスク・BAN 事例（日本在住ユーザー向け）

※法律助言ではなく公開情報の整理。条文は e-Gov 法令検索から 2026-11-05 に取得。

### 5-1. 著作権法

- **30 条 1 項 2 号【事実】**: 「技術的保護手段の回避…により可能となり…た複製を、その事実を知りながら行う場合」は私的複製の例外にならない → DRM 解除して作った複製は**民事上**複製権侵害になり得る。
- **119 条 1 項括弧書き【事実】**: 「第三十条第一項…に定める私的使用の目的をもつて自ら著作物…の複製を行つた者」は侵害罪から**明文で除外** → **自分用の DRM 解除に刑事罰はない**（文化庁 Q&A 問 6-1 も「刑事罰はありません」と明記）。
- **120 条の 2【事実】**: 回避プログラム・鍵（指令符号）を**公衆に譲渡・公衆送信**すると **3 年以下の拘禁刑 / 300 万円以下の罰金、非親告罪**。→ **作ったスクリプト・鍵ファイルを GitHub 等に公開しないこと**が最も重要。
- **画面キャプチャは「回避」か【推測・条文根拠】**: 条文上の「回避」は「信号の除去・改変」または「変換された著作物の復元」に限定。正規アプリが権利者の意思で復号・描画した画面を OS 機能で撮影する行為は、文言上は回避に当たらないと読むのが自然（アナログホール）。弁護士ドットコム（2022）「スクショ・PDF 化は私的複製で適法、ただし規約違反で契約解除リスク」、STORIA 法律事務所（2026-04）「業務利用には 30 条 1 項不適用」。**ただし Android アプリのスクショ禁止を root 化等で突破すると「保護手段の無効化」と評価される余地** → PC/ブラウザで撮れる環境を使えばこの論点を避けられる。
- **30 条の 4 / 文化庁「AI と著作権に関する考え方」（2024-03）【事実】**: プロンプト入力に伴う複製は 30 条の 4（情報解析）の適用が考えられ、享受目的が併存する場合も 30 条 1 項（私的使用）の適用があり得る。自分一人のアカウントから AI サーバーへ送るのは「公衆」送信ではない【推測】。**30 条 1 項で作ったファイルは第三者への譲渡・公衆送信には及ばない**（脚注 40）。

### 5-2. 利用規約（原文確認済み）

- **Kindle ストア利用規約（2026-10-21 更新）【事実】**: 「Kindle コンテンツは…ライセンスが提供されるものであり、販売されるものではありません」「本サービスの一環として使用されるデジタル権利管理システムまたはその他のコンテンツの保護もしくは機能を迂回、修正、無効化、回避してはならない」「違反した場合、本契約に基づくお客様の権利は、自動的に解除されます…料金の払戻しを行うことなく、本サービスへのお客様のアクセスを直ちに無効にすることができます」。また Amazon に送信される情報として「最後に読まれたページ…閲覧データ」が明記 → **ページ送り速度は原理的に Amazon から見える**【推測】。
- **Amazon.co.jp 利用規約（2026-11-02 更新）【事実】**: 「データマイニング、ロボットなどのデータ収集・抽出ツールの使用は、一切含まれません」「リバースエンジニアリング…セキュリティを回避しないものとします」。
- **LINE ヤフー共通利用規約（ebookjapan）【事実】**: 8.3「予定している利用態様を超えて利用（複製、送信、転載、改変を含みます。）をしてはなりません」、15(5)「BOT、チートツール、その他の技術的手段を利用して当社サービスを不正に操作する行為」、17.1「複数のアカウントを登録されている場合には、それらすべてのアカウントに対して措置」→ **Yahoo! JAPAN ID 全体に波及**。
- 楽天Kobo 規約: bot チャレンジで原文取得不能。二次情報では「personal and non-commercial use」「account termination or suspension」。

### 5-3. アカウント停止の実例

| 事例 | 原因 | 出典 |
|---|---|---|
| 2024-12-27「Stuff Your Kindle Day」で大量 DL → 「不審なアクティビティ」で一時ロック、約 24 時間で復旧 | **ダウンロード量の異常検知** | [Good e-Reader](https://goodereader.com/blog/?p=392831) |
| 2012-10 ノルウェー人ユーザーのアカウント閉鎖 + Kindle 遠隔消去 | 「関連アカウント」判定（DRM 無関係） | [Bekkelund](https://www.bekkelund.net/2012/10/22/outlawed-by-amazon-drm/) |
| **DRM 解除が原因の BAN** | **確認できず** | MobileRead、r/Calibre、GitHub |
| **Cloud Reader / アプリの自動化が原因の BAN** | **確認できず**。「SNS 上に BAN 報告は全く観測されていない」「Amazon に問い合わせて『問題ない』回答」の投稿複数。SEO 系記事の「停止事例」は出典なし | [Strawberry note 2025-12](https://note.com/strawberry_soft/n/n459ea362634f)、[@zoknd 2026-01-07](https://x.com/zoknd/status/2008878110532587980) |

- **Amazon は DRM 解除を検知できるか【推測】**: 解除はローカルで行われ Amazon と通信しないため直接検知は困難。検知され得るのは周辺挙動（短時間の大量 DL、非人間的なページ送り、端末登録・解除の多発）。
- **閉鎖時に失うもの（[Amazon.co.jp 公式](https://www.amazon.co.jp/gp/help/customer/display.html?nodeId=GBDB29JHRPFBDVYV)）【事実】**: Kindle 本・メモ、Prime Video 購入分、Audible、Music、Photos、ギフト券残高、**「アマゾン ウェブ サービス (AWS) アカウントとアカウント内のリソース」**。

### 5-4. AI サービス側の規約

- **Anthropic 消費者向け規約（2025-10-08）【事実】**: 入力の権利はユーザーが保証。**「API キー経由以外で、bot・スクリプト等の自動化手段で Services にアクセスすること」を禁止 → claude.ai をスクリプトで叩くのは規約違反、API 経由なら可**。学習利用は消費者版でデフォルト ON（設定でオプトアウト可）、API / Commercial Terms は対象外。
- **Google（Gemini）【事実】**: 人間のレビュアーが入力を見る可能性を明記、アクティビティ 18 か月保持。
- 両社とも「著作権のある全文を入れるな」とは書いておらず、侵害にならない入力であることの責任をユーザーに置く構造。

### 5-5. 2026 年の世論・業界動向

- 2026-01-05 [@FXWOLF2](https://x.com/FXWOLF2/status/2008114192038175195)「Kindle を自動ページ送りしてスクショ→PDF にする Chrome 拡張を Claude Code が作った」（134 万 view、6,266 ブクマ）→ Kindle 情報サイト「きんどう」@zoknd「規約違反の可能性…出版社が怒るまでダメなんでしょうかねぇ」（123 万 view）→「スクショは私的複製で可、**外部サービスへのアップロードは規約違反**」と整理。
- 2026-02-12 ソースネクスト「0 秒読書」（自動ページ送り → OCR 付き PDF、月 4,980 円）発売 → **2026-10-20 日経「出版業界がソースネクストに抗議」**。X でトレンド入り。業界の争点は「海賊版化」。
- → 個人が自分用に使う分には実例ベースのリスクは低いが、**商用化・公開・共有は業界が明確に敵視する段階に入った**。

---

## 6. 推奨アーキテクチャ（実装案）

### 6-1. 基本方針

```
[入手層]  Kindle: Cloud Reader + headless Playwright → 本文画像（要素撮影）
          Kobo:   実機 + Calibre/Obok → EPUB → テキスト
          ebookjapan: dokuha-userscript → ページ画像 ZIP
              ↓
[OCR 層]  テキスト本: NDLOCR-Lite（Win/Linux）/ Apple Vision RecognizeDocumentsRequest（macOS 26）
          漫画:     mokuro（manga-ocr）or ビジョン LLM 直投入（要約用途）
              ↓
[整形層]  Markdown 化（章ごとにファイル分割、ページ跨ぎ段落結合、ルビ除去、meta.json）
              ↓
[接続層]  books/<slug>/ch01.md … + CLAUDE.md の索引 → Claude Code が Read/Grep
          （任意）ローカル Markdown を全文検索する読み取り専用 MCP サーバー
          （任意）Claude Projects / NotebookLM に 1 冊 1 ソースでアップロード
```

### 6-2. OS 別の最短ルート

| OS | Kindle テキスト本 | Kindle 非対応本（約 15%） | DRM 解除（任意） |
|---|---|---|---|
| **Windows 11** | kindle_shot をそのまま導入（最短） | kindle_shot の Windows 画面キャプチャ経路 | Store 版 Kindle + Satsuoni + KFX Input（TPM 2.0 必須、月次で壊れる覚悟） |
| **macOS** | kindle_shot の `core/headless_capture.py` + `headless_browser.py` を移植、OCR は NDLOCR-Lite（CPU）or macOS 26 Vision | kindlesnap / book-capture（Kindle for Mac アプリ） | **不可**（Intel なら Win11 VM + vTPM） |
| **Linux** | kindle_shot 移植 + NDLOCR-Lite | — | Win11 VM（dockur/windows, TPM: Y） |

### 6-3. Claude Code への「つなぎ方」（初心者向け補足）

1. **一番簡単な方法**: OCR で作った Markdown を `~/books/<本の名前>/` に章ごとに置き、そのフォルダで Claude Code を起動して「この本について…」と聞くだけ。Claude Code はローカルファイルを自分で開いて読める（Read / Grep ツール）。300 ページ ≒ 16 万字 ≒ 15〜25 万トークンなので 1M コンテキストの Claude Code には丸ごと入るが、1 ファイル 2〜3 万字に分割して索引（CLAUDE.md）を置く方が実用的。
2. **スキル化**: `/book <ASIN>` と打つと Claude Code がキャプチャ → OCR → Markdown まで走らせるスキルを作る（kindle-autosave-kit の `/kindle` スキル、リットン氏の運用が前例）。**長時間ループは Claude in Chrome / MCP ではなくスクリプトに逃がす**のが複数の実践者の結論（タイムアウト多発のため）。
3. **MCP サーバー**: 複数冊を横断検索したいなら、ローカル Markdown を SQLite FTS5 に入れて `search_books` / `get_chapter` を返す読み取り専用 MCP を自作（kindle-notes の `src/mcp/server.ts` が雛形）。Amazon には一切接続しない設計にする。
4. **他ツール**: Claude Projects（30MB/ファイル、RAG）、NotebookLM（50 万語/ソース、2026-07 に「Gemini Notebook」へ改名、ePub 直接アップロード対応）には Markdown をそのままアップロード。**画像 PDF のままアップロードすると「著者名すら間違う」レベルで読めない**ので OCR 必須。

### 6-4. 工数見積もり

| フェーズ | 内容 | 工数 |
|---|---|---|
| 1 | Kindle キャプチャ + OCR パイプライン（kindle_shot 導入 or 移植、1 冊で検証） | Windows: 半日 / Mac: 1〜2 日 |
| 2 | Markdown 整形 + Claude Code 連携（フォルダ構成、CLAUDE.md、スキル） | 数時間 |
| 3 | 30 冊のバッチ処理 | 無人 10〜15 時間 + 検品 |
| 4 | 楽天Kobo（実機 + Obok） | 1 時間 + 1 冊数分 |
| 5 | ebookjapan（dokuha-userscript + mokuro、購入済み巻で要検証） | 半日 |
| 6 | （任意）横断検索 MCP | 半日〜1 日 |

---

## 7. リスクを下げる実務上の工夫

1. **「外に出さない」を最優先**: 無 DRM ファイル / OCR テキスト / スクリプト（特に鍵・指令符号入り）を GitHub・共有ドライブ・SNS に置かない。ツール公開は 120 条の 2 の刑事リスク。
2. **法的素性の良い入力を使う**: DRM 解除（A）より画面キャプチャ（B）・公式書き出し（D）由来のテキストの方が「30 条 1 項 2 号で免責が外れた複製物」問題を抱えない。
3. **AI 側は API / 学習オプトアウトで**: claude.ai への bot アクセスは規約違反なので**自動投入は API キー経由**。ローカル OCR + ローカル保存が最も露出が少ない。
4. **Amazon の異常検知に引っかからない運用**: ページ送りは人間的な速度（kindle_shot 既定 2.5 秒/頁）、同一アカウントで複数ブラウザ並列しない、短時間の大量ダウンロードを避ける、端末登録・解除を繰り返さない。
5. **巻き添え資産を切り離す**: **AWS・Prime・Audible と同じログインで実験しない**。ただし Amazon は「関連アカウント」を紐づけて連鎖閉鎖し得るので、別垢は完全な防壁ではない。
6. **Android でのスクショ禁止突破はしない**: 技術的保護手段の無効化と評価されるグレーを自ら作らない。
7. **ハイライトは公式書き出しを先に**: 上限で切れる分だけ手法 B で補う順序が、規約上の「迂回」色を最小化。

---

## 8. 未確認事項・この調査の限界

- 本コンテナからは Amazon / Kobo / ebookjapan にログインできないため、**実機検証は一切していない**。すべて公開情報ベース。
- 各リサーチャーが Web 検索回数の上限に達したため、Amazon 公式ヘルプ（503）、楽天Kobo 規約（bot チャレンジ）、Reddit（ブロック）は本文未取得。
- Apple Vision / Claude / Gemini の縦書き OCR 精度は学術評価がなく、**各 10 頁のサンプルで測ってから採用判断**すべき。
- kindle-notes 等の MCP の `.co.jp` 化、kobo-book-downloader の日本アカウント動作、dokuha-userscript の購入済み巻対応、Android アクセシビリティ経路の日本語本対応は未検証。
- DRM 解除経路は「2026-11-05 時点」の情報。Store 版 Kindle アプリの次回更新で壊れている可能性が高い。

---

## 9. 主要出典（抜粋、取得日 2026-11-05）

**Kindle キャプチャ系**: [kindle_shot](https://github.com/ahalcyon/kindle_shot) / [kindle-autosave-kit](https://github.com/ishimikazuki/kindle-autosave-kit) / [tsunoda-s-ft/kindle-app](https://github.com/tsunoda-s-ft/kindle-app) / [kindle2ss](https://github.com/daishir0/kindle2ss) / [book-capture](https://github.com/masterleopold/book-capture) / [kindlesnap](https://github.com/imutaroh/kindle-screenshot-app/pull/4) / [リットン lyttonblog](https://lyttonblog.com/programming/ebook-pdf-ocr/) / [リットン note](https://note.com/lytton_life/n/n2e93d544074c) / [f2t.jp](https://f2t.jp/blog/fk1wzzr0r) / [noh.am Kindle Web Reader 解析](https://noh.am/en/posts/kindle-web-reader-pages/) / [NDLOCR-Lite](https://github.com/ndl-lab/ndlocr-lite) / [NDLOCR-Lite 精度検証 Zenn](https://zenn.dev/phpmyadmin/articles/0dba6fef411e21) / [ANLP 2026 縦書き OCR 評価](https://www.anlp.jp/proceedings/annual_meeting/2026/pdf_dir/C2-3.pdf) / [Claude vision 仕様](https://platform.claude.com/docs/en/build-with-claude/vision)

**Kindle DRM 系**: [Satsuoni/DeDRM_tools Releases](https://github.com/Satsuoni/DeDRM_tools/releases) / [Discussions #152](https://github.com/Satsuoni/DeDRM_tools/discussions/152) / [#82](https://github.com/Satsuoni/DeDRM_tools/discussions/82) / [#116](https://github.com/Satsuoni/DeDRM_tools/discussions/116) / [akitaonrails 2026-07-30](https://akitaonrails.com/en/2026/07/30/removing-drm-from-kindle-ebooks-in-2026/) / [MobileRead KFX Input](https://www.mobileread.com/forums/showthread.php?t=291290) / [MobileRead Dealing with Kindle ebooks](https://www.mobileread.com/forums/showthread.php?t=361503) / [TechTimes Kindle for PC 終了](https://www.techtimes.com/articles/319377/20260630/kindle-pc-shuts-down-today-which-windows-app-replaces-it-who-cannot-upgrade.htm)

**Kobo / ebookjapan**: [noDRM #1065](https://github.com/noDRM/DeDRM_tools/issues/1065) / [MobileRead 楽天Kobo DRM](https://www.mobileread.com/forums/showthread.php?p=4556084) / [Kobo Web Reader 公式](https://help.kobo.com/hc/en-us/articles/4408228476567) / [kobo-book-downloader](https://github.com/TnS-hun/kobo-book-downloader) / [dokuha-userscript](https://github.com/GolyBidoof/dokuha-userscript) / [Reader Capture ebookjapan 設定](https://kurima.hatenablog.com/entry/2023/03/05/162536) / [mokuro](https://github.com/kha-white/mokuro) / [MangaVQA/MangaLMM](https://arxiv.org/html/2505.20298v3)

**公式経路 / MCP**: [0xpili/kindle-notes](https://github.com/0xpili/kindle-notes) / [mayankbohradev/kindle-mcp](https://github.com/mayankbohradev/kindle-mcp) / [Readwise Kindle 上限](https://docs.readwise.io/readwise/docs/importing-highlights/kindle) / [Kobo Export Annotations](https://help.kobo.com/hc/en-us/articles/29991333812631) / [Google Expert Intelligence](https://blog.google/innovation-and-ai/products/gemini-notebook/expert-intelligence-leading-sources/)

**法的・規約**: [e-Gov 著作権法](https://laws.e-gov.go.jp/law/345AC0000000048) / [文化庁 平成 24 年改正 Q&A](https://www.bunka.go.jp/seisaku/chosakuken/hokaisei/h24_hokaisei/) / [文化庁 AI と著作権に関する考え方](https://www.bunka.go.jp/seisaku/bunkashingikai/chosakuken/pdf/94037901_01.pdf) / [Kindle ストア利用規約](https://www.amazon.co.jp/gp/help/customer/display.html?nodeId=201014950) / [Amazon.co.jp 利用規約](https://www.amazon.co.jp/gp/help/customer/display.html?nodeId=201909000) / [Amazon アカウント閉鎖時の影響](https://www.amazon.co.jp/gp/help/customer/display.html?nodeId=GBDB29JHRPFBDVYV) / [LINE ヤフー共通利用規約](https://www.lycorp.co.jp/ja/company/terms/) / [弁護士ドットコム 2022](https://www.bengo4.com/c_18/n_14168/) / [STORIA 法律事務所 2026-04](https://storialaw.jp/blog/12980) / [Anthropic Consumer Terms](https://www.anthropic.com/legal/consumer-terms) / [Good e-Reader 2024-12 ロック事例](https://goodereader.com/blog/?p=392831)

**トレンド**: [@FXWOLF2 2026-01-05](https://x.com/FXWOLF2/status/2008114192038175195) / [@zoknd 2026-01-07](https://x.com/zoknd/status/2008878110532587980) / [0 秒読書 プレスリリース](https://sourcenext.co.jp/pressrelease_html/JS/2026/2026021201) / [日経 出版業界抗議 2026-10-20](https://www.nikkei.com/article/DGXZQOUC153DJ0V11C26A0000000/) / [hon.jp まとめ](https://hon.jp/news/1.0/0/59841) / [Strawberry BAN 報告調査](https://note.com/strawberry_soft/n/n459ea362634f) / [eurekapu yomitoku-kindle](https://log.eurekapu.com/kindle-ocr-batch-pipeline/)
