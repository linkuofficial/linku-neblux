// Trust-layer copy for the generated About / Methodology / Sources pages, in the
// three site languages. Content is hand-authored (not user input); the HTML here
// is emitted verbatim, so keep it CSP-safe: no <script>, no inline event handlers.
// zh is Traditional Chinese — run scripts/check_simplified.py after edits.
//
// The Sources framing is deliberately honest (decided with Riku): Neblux is an
// exploration entry point, NOT a primary or citation-grade source. Keep provenance
// light — don't over-detail the pipeline. Corrections go to a contact email.

const CONTACT = 'studio.linku@gmail.com';

export const TRUST = {
    about: {
        en: {
            title: 'About Neblux',
            desc: 'Neblux is an interactive science knowledge graph: concepts shown as connected nodes, with guided curiosity tours called Wonders.',
            html: `
<p>Neblux is an interactive science knowledge graph. Instead of presenting knowledge as isolated articles, it maps concepts, people, fields and events as connected nodes, and lets you follow the links between them across physics, biology, history, technology, mathematics and society.</p>
<h2>Why it exists</h2>
<p>Understanding is mostly about connections — how one idea leads to, builds on, or quietly reshapes another. Neblux is built to make those connections visible and walkable, so curiosity has somewhere to go.</p>
<h2>Wonders</h2>
<p>Wonders are hand-authored, step-by-step tours across the graph. Each step follows a small "curiosity loop" — a question, a reveal, an example, a twist, and a thread onward. There are 19 tours, each available in English, Traditional Chinese and Japanese.</p>
<h2>The knowledge graph</h2>
<p>The graph holds 687 nodes across four kinds — fields, concepts, people and events — tagged across 12 domains, connected by typed relationships (see <a href="/methodology.html">Methodology</a>).</p>
<h2>Who it's for</h2>
<p>Self-directed learners, students, teachers, and anyone who likes pulling one thread and seeing where it goes. Neblux is free for individuals.</p>`,
        },
        zh: {
            title: '關於 Neblux',
            desc: 'Neblux 是一個互動式科普知識圖譜：把概念畫成彼此相連的節點，並提供名為 Wonders 的好奇心導覽。',
            html: `
<p>Neblux 是一個互動式科普知識圖譜。它不把知識拆成一篇篇孤立的文章，而是把概念、人物、領域與事件畫成彼此相連的節點，讓你順著它們之間的連線，跨越物理、生物、歷史、科技、數學與社會來回穿梭。</p>
<h2>為什麼做這個</h2>
<p>理解，大多發生在連結之中——一個想法如何通往、奠基於、或悄悄改寫另一個想法。Neblux 想把這些連結變得看得見、走得通，讓好奇心有地方去。</p>
<h2>Wonders（驚奇之旅）</h2>
<p>Wonders 是人工撰寫、一步步走過圖譜的導覽。每一步遵循一個小小的「好奇迴圈」——一個提問、一次揭曉、一個例子、一個意外、再牽出下一條線索。共有 19 趟，各有英文、繁體中文與日文版本。</p>
<h2>這張知識圖譜</h2>
<p>圖譜有 687 個節點，分成四種——領域、概念、人物、事件——標記於 12 個學科領域，並以帶有類型的關係相連（見<a href="/zh/methodology.html">方法</a>）。</p>
<h2>寫給誰</h2>
<p>自主學習者、學生、老師，以及任何喜歡拉起一條線、看它通向何方的人。Neblux 對個人永久免費。</p>`,
        },
        ja: {
            title: 'Neblux について',
            desc: 'Neblux はインタラクティブな科学知識グラフです。概念をつながったノードとして示し、Wonders と呼ばれる好奇心の旅を用意しています。',
            html: `
<p>Neblux はインタラクティブな科学知識グラフです。知識をばらばらの記事として並べるのではなく、概念・人物・分野・出来事をつながったノードとして地図化し、物理・生物・歴史・技術・数学・社会を横断して、その間のつながりをたどれるようにします。</p>
<h2>なぜ存在するのか</h2>
<p>理解の多くは「つながり」の中で起こります——ある考えが別の考えへどう導き、その上に築かれ、あるいは静かに書き換えるのか。Neblux はそのつながりを見える化し、歩けるようにして、好奇心の行き先をつくります。</p>
<h2>Wonders</h2>
<p>Wonders は、グラフを一歩ずつたどる手作りのツアーです。各ステップは小さな「好奇心のループ」——問い、明かし、例、意外、そして次への糸——をたどります。全 19 本、いずれも英語・繁体字中国語・日本語で読めます。</p>
<h2>知識グラフ</h2>
<p>グラフには 4 種類（分野・概念・人物・出来事）の 687 ノードがあり、12 の分野にタグ付けされ、型付きの関係でつながっています（<a href="/ja/methodology.html">方法</a>を参照）。</p>
<h2>だれのためか</h2>
<p>自ら学ぶ人、学生、教師、そして一本の糸を引いてその行方を見るのが好きな人のために。Neblux は個人には無料です。</p>`,
        },
    },
    methodology: {
        en: {
            title: 'Methodology',
            desc: 'How Neblux builds its nodes and connections, what each relation type means, and how the tours and learning paths are made.',
            html: `
<h2>Nodes</h2>
<p>Nodes are concepts, people, fields and events chosen for how well they bridge disciplines. The set is deliberately curated — a map of how ideas connect, not an exhaustive encyclopedia.</p>
<h2>Connections and relation types</h2>
<p>Every connection carries one of five relation types:</p>
<ul class="links">
<li><b>logical</b> — linked by reasoning or formal / structural dependency.</li>
<li><b>applied</b> — one concept is used in the practice or application of another.</li>
<li><b>conceptual</b> — a meaningful idea-level connection between two concepts.</li>
<li><b>historical</b> — linked through historical development, chronology or influence.</li>
<li><b>causal</b> — one concept contributes to or causes another.</li>
</ul>
<p>Separately, a connection may be marked as a learning prerequisite — meaning the source concept helps a learner understand the target. This is a flag on a connection, not a sixth relation type; the "What it builds on" and "Where it leads" sections on each concept page are derived from it.</p>
<h2>Wonders and learning paths</h2>
<p>Wonders are hand-authored: an ordered sequence of steps, each anchored to a graph node, carrying a written curiosity loop. Suggested learning paths are derived from the prerequisite links between concepts.</p>
<h2>Languages</h2>
<p>English is the base content; Traditional Chinese and Japanese are localized alongside it. Machine-readable data is published as JSON (see <a href="/sources.html">Sources</a>).</p>`,
        },
        zh: {
            title: '方法',
            desc: 'Neblux 如何建立節點與連線、每種關係類型的意義，以及旅程與學習路徑如何產生。',
            html: `
<h2>節點</h2>
<p>節點是概念、人物、領域與事件，依它們跨越學科的橋接能力挑選。整組節點經過刻意策展——是一張呈現想法如何相連的地圖，而非鉅細靡遺的百科。</p>
<h2>連線與關係類型</h2>
<p>每條連線帶有五種關係類型之一：</p>
<ul class="links">
<li><b>邏輯</b>——以推理或形式／結構上的依存相連。</li>
<li><b>應用</b>——一個概念被用於另一個概念的實作或應用。</li>
<li><b>概念</b>——兩個概念在想法層次上的有意義關聯。</li>
<li><b>歷史</b>——透過歷史發展、時序或影響相連。</li>
<li><b>因果</b>——一個概念促成或造成另一個。</li>
</ul>
<p>此外，一條連線可另外標記為「學習前置」——意指來源概念有助於理解目標概念。這是連線上的一個旗標，並非第六種關係類型；每個概念頁的「建立在什麼之上」與「通往哪裡」即由它推導而來。</p>
<h2>Wonders 與學習路徑</h2>
<p>Wonders 由人工撰寫：一連串有序的步驟，每一步錨定在一個圖譜節點上，帶著一段寫好的好奇迴圈。建議的學習路徑，則由概念之間的前置關係推導而成。</p>
<h2>語言</h2>
<p>英文為基礎內容，繁體中文與日文與之並列在地化。機器可讀資料以 JSON 形式公開（見<a href="/zh/sources.html">來源</a>）。</p>`,
        },
        ja: {
            title: '方法',
            desc: 'Neblux がノードとつながりをどう作るか、各関係タイプの意味、ツアーと学習経路の作り方。',
            html: `
<h2>ノード</h2>
<p>ノードは、分野をまたぐ橋渡しの良さで選ばれた概念・人物・分野・出来事です。これは意図的にキュレーションされた——考えのつながりを示す地図であり、網羅的な百科事典ではありません。</p>
<h2>つながりと関係タイプ</h2>
<p>すべてのつながりは、次の五つの関係タイプのいずれかを持ちます：</p>
<ul class="links">
<li><b>論理</b>——推論または形式的・構造的な依存でつながる。</li>
<li><b>応用</b>——ある概念が別の概念の実践や応用に使われる。</li>
<li><b>概念</b>——二つの概念の、考えのレベルでの意味あるつながり。</li>
<li><b>歴史</b>——歴史的発展・時系列・影響でつながる。</li>
<li><b>因果</b>——ある概念が別の概念を促す、または引き起こす。</li>
</ul>
<p>さらに、つながりには「学習の前提」という印を付けることがあります——出発点の概念が対象の理解を助ける、という意味です。これはつながりに付く印であって、六つ目の関係タイプではありません。各概念ページの「何の上に築かれるか」「どこへ導くか」は、これをもとに導かれます。</p>
<h2>Wonders と学習経路</h2>
<p>Wonders は手作りです：順序づけられたステップの並びで、各ステップはグラフのノードに結び付き、書かれた好奇心のループを運びます。おすすめの学習経路は、概念間の前提のつながりから導かれます。</p>
<h2>言語</h2>
<p>英語が基礎コンテンツで、繁体字中国語と日本語がそれに並んでローカライズされています。機械可読データは JSON で公開しています（<a href="/ja/sources.html">出典</a>を参照）。</p>`,
        },
    },
    sources: {
        en: {
            title: 'Sources & Reliability',
            desc: 'Neblux is an AI-assisted, human-reviewed synthesis of established knowledge — a learning entry point, not a primary citation source.',
            html: `
<p>Neblux is a synthesis of widely established, general knowledge, compiled with AI assistance and human review. It draws on broadly accepted understanding rather than a single fixed source list.</p>
<h2>How to use it</h2>
<p>Neblux is best used as a place to explore and to find learning paths — a way to see how ideas connect and to decide what to read next. It is <b>not</b> a primary or citation-grade source. For a report, an exam, or any formal or academic work, confirm the details against original sources: textbooks, peer-reviewed literature, or the primary references themselves.</p>
<h2>Accuracy and corrections</h2>
<p>The content aims to be accurate and fair. If you spot something wrong, tell us at <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
<h2>Open data</h2>
<p>The graph is published as machine-readable JSON at <a href="/data/all_nodes.json">/data/all_nodes.json</a> (canonical) and <a href="/data/graph.json">/data/graph.json</a> (with schema metadata).</p>`,
        },
        zh: {
            title: '來源與可信度',
            desc: 'Neblux 是以 AI 協助、經人工審查的知識綜整——是學習與探索的入口，而非一手引用來源。',
            html: `
<p>Neblux 是對廣泛既定的一般知識所做的綜整，由 AI 協助整理、並經人工審查。它依據的是普遍被接受的理解，而非某一份固定的來源清單。</p>
<h2>該怎麼使用</h2>
<p>Neblux 最適合當作探索與尋找學習路徑的地方——用來看見想法如何相連、決定接下來讀什麼。它<b>不是</b>一手來源，也不具引用等級的權威。用於報告、考試或任何正式與學術工作時，請以原始來源核對細節：教科書、同行審查文獻，或一手參考資料本身。</p>
<h2>正確性與勘誤</h2>
<p>內容力求正確與持平。若你發現有誤，歡迎來信告訴我們：<a href="mailto:${CONTACT}">${CONTACT}</a>。</p>
<h2>開放資料</h2>
<p>圖譜以機器可讀的 JSON 公開於 <a href="/data/all_nodes.json">/data/all_nodes.json</a>（正式版）與 <a href="/data/graph.json">/data/graph.json</a>（附結構描述）。</p>`,
        },
        ja: {
            title: '出典と信頼性',
            desc: 'Neblux は AI 支援・人手確認による知識の統合です——学習の入口であり、一次的な引用元ではありません。',
            html: `
<p>Neblux は、広く確立された一般的な知識を、AI の支援と人手の確認によってまとめた統合です。特定の固定した出典リストではなく、広く受け入れられた理解に基づいています。</p>
<h2>使い方</h2>
<p>Neblux は、探索し、学習の経路を見つける場所として最も役立ちます——考えがどうつながるかを見て、次に何を読むかを決めるために。これは一次的な、引用に足る出典では<b>ありません</b>。レポート、試験、その他の正式・学術的な作業では、細部を原典で確認してください：教科書、査読付き文献、あるいは一次参考資料そのもの。</p>
<h2>正確性と訂正</h2>
<p>内容は正確で公平であることを目指しています。誤りを見つけたら、<a href="mailto:${CONTACT}">${CONTACT}</a> までお知らせください。</p>
<h2>オープンデータ</h2>
<p>グラフは機械可読の JSON として <a href="/data/all_nodes.json">/data/all_nodes.json</a>（正規）と <a href="/data/graph.json">/data/graph.json</a>（スキーマ情報つき）で公開しています。</p>`,
        },
    },
};
