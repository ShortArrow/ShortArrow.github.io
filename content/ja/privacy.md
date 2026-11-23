---
title: プライバシーポリシー
---

# プライバシーポリシー

このサイト（www.shortarrow.jp）は、どのページがどのくらい読まれているかを知るために、Cloudflare Web Analytics を使っています。

## 計測の仕組み

このサイトは Cloudflare を経由して配信しています。Cloudflare は配信するページに計測用のスクリプト（`https://static.cloudflareinsights.com/beacon.min.js`）を差し込み、このスクリプトがページの表示にかかった時間などを Cloudflare へ送ります。

## 集める情報

Cloudflare Web Analytics で私が見られるのは、次の項目の集計です。

- ページビュー数と訪問数
- 閲覧されたページのパス
- 参照元（リファラー）
- 国
- 端末の種類、ブラウザ、OS
- ページの読み込み時間と Core Web Vitals

## Cloudflare Web Analytics の Cookie と個人の追跡

Cloudflare の説明では、Cloudflare Web Analytics は次のとおりです。

- 計測に Cookie や localStorage などのブラウザ側の状態を使わない。
- Core Web Vitals の計測で、IP アドレスや User Agent などから個人を識別（フィンガープリント）しない。
- Cloudflare の利用者のサイトをまたいで、個々の閲覧者を追跡しない。

## Cloudflare のボット判定と cf_clearance

このサイトを配信する Cloudflare は、どのページにもボット判定（JavaScript Detections）のスクリプトを差し込みます。このスクリプトはブラウザ側の手がかりから、アクセスが自動化されたもの（ボット）かどうかを判定します。判定の結果は、Cloudflare が置く `cf_clearance` という Cookie に入ります。

Cloudflare の説明では、判定の結果だけではアクセスを止めません。止めるには、サイトの持ち主が判定の結果を使うルールを作る必要があります。このサイトにはそのルールがなく、判定の結果で止めているアクセスはありません。

## このサイト自身が保存する情報

このサイト自身は Cookie を置きません。

配色切り替えのボタンでライトとダークを切り替えると、選んだ配色をブラウザの localStorage に `colorscheme` という名前で保存します。この値はお使いのブラウザの中だけに残り、どこにも送りません。

## 出典

- [Data origin and collection · Cloudflare Web Analytics docs](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/)
- [Core Web Vitals · Cloudflare Web Analytics docs](https://developers.cloudflare.com/web-analytics/data-metrics/core-web-vitals/)
- [High-level metrics · Cloudflare Web Analytics docs](https://developers.cloudflare.com/web-analytics/data-metrics/high-level-metrics/)
- [Dimensions · Cloudflare Web Analytics docs](https://developers.cloudflare.com/web-analytics/data-metrics/dimensions/)
- [JavaScript detections · Cloudflare challenges docs](https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/)
