import { useState } from 'react';
import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'docker', label: 'Docker 容器化' },
  { slug: 'cicd-pipeline', label: 'CI/CD 自動化部署' },
  { slug: 'self-host-vs-cloud', label: 'Self-host vs Cloud' },
  { slug: 'localhost-hosting', label: 'Localhost 分享到互聯網' },
];

function Accordion({ icon, iconBg, title, badge, desc, stats, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`accordion${open ? ' open' : ''}`}>
      <div className="accordion-summary" onClick={() => setOpen(!open)}>
        <span className="acc-icon" style={{ background: iconBg }}>{icon}</span>
        <div className="acc-info">
          <div className="acc-title">
            <h3>{title}</h3>
            {badge && <span className="tier-badge free">{badge}</span>}
          </div>
          <div className="acc-desc">{desc}</div>
        </div>
        <div className="acc-stats">
          {stats.map((s, i) => <span key={i} className="stat-chip">{s}</span>)}
        </div>
        <svg className="acc-chevron" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" /></svg>
      </div>
      <div className="accordion-body">
        <div className="accordion-inner">
          {children}
        </div>
      </div>
    </div>
  );
}

function FrontendTab() {
  return (
    <>
      <Accordion
        icon="&#128196;" iconBg="rgba(52,211,153,0.12)"
        title="GitHub Pages" badge="Free"
        desc="純靜態託管 — 1 GB repo、100 GB/月頻寬、零設定部署"
        stats={['100 GB/月', '靜態']}
      >
        <p><a className="acc-link" href="https://pages.github.com" target="_blank" rel="noopener noreferrer">pages.github.com &#8599;</a></p>
        <p>GitHub 內建嘅靜態網站託管服務。只要將 HTML/CSS/JS 推上 repo，就可以自動部署。支援 Jekyll 靜態網站生成器，亦都可以直接放純靜態檔案。</p>
        <table className="detail-table">
          <tbody>
            <tr><th>Free Tier</th><td>GitHub Free（所有帳號內建）</td></tr>
            <tr><th>儲存空間</th><td>每個 repo 上限 1 GB（建議保持細小）</td></tr>
            <tr><th>頻寬</th><td>100 GB / 月（soft limit）</td></tr>
            <tr><th>項目數量</th><td>1 個 user site + 無限 project sites</td></tr>
            <tr><th>自訂域名</th><td>支援（CNAME 記錄）+ 自動 SSL</td></tr>
            <tr><th>休眠</th><td>無 — 靜態資產長期可用</td></tr>
            <tr><th>主要限制</th><td>只支援靜態內容、無 server-side、repo 須 public（Free 帳號）</td></tr>
            <tr><th>下一級</th><td>GitHub Pro $4/月（private repo Pages）</td></tr>
          </tbody>
        </table>
        <div className="use-case">
          <h4>最適合...</h4>
          <p>個人作品集、開源文檔、靜態 blog。零設定、零費用、直接從 Git 部署。</p>
        </div>
      </Accordion>

      <Accordion
        icon="&#9650;" iconBg="rgba(99,102,241,0.12)"
        title="Vercel" badge="Free"
        desc="Next.js 官方平台 — 100 萬 function 調用、Preview Deploy、SSR"
        stats={['100 GB/月', 'SSR']}
      >
        <p><a className="acc-link" href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com &#8599;</a></p>
        <p>專為前端框架優化嘅部署平台。Next.js 嘅官方託管商，亦支援 React、Vue、Svelte。每次 Git push 自動觸發 Preview Deployment，開發體驗極佳。</p>
        <table className="detail-table">
          <tbody>
            <tr><th>Free Tier</th><td>Hobby Plan（只限非商業用途）</td></tr>
            <tr><th>頻寬</th><td>100 GB / 月</td></tr>
            <tr><th>Functions</th><td>每月 100 萬次調用、每次 10 秒限時</td></tr>
            <tr><th>項目數量</th><td>最多 200 個</td></tr>
            <tr><th>Build 時間</th><td>6,000 分鐘 / 月</td></tr>
            <tr><th>自訂域名</th><td>支援（每項目最多 50 個）+ 自動 SSL</td></tr>
            <tr><th>休眠</th><td>Serverless — cold start ~250ms</td></tr>
            <tr><th>主要限制</th><td>非商業限制、無 team 功能、1 個成員</td></tr>
            <tr><th>下一級</th><td>Pro $20/月/成員</td></tr>
          </tbody>
        </table>
        <div className="use-case">
          <h4>最適合...</h4>
          <p>Next.js / React 項目、SSR 網站。Preview deployment 對開發 workflow 幫助極大。</p>
        </div>
      </Accordion>
    </>
  );
}

function BackendTab() {
  return (
    <>
      <Accordion
        icon="&#9889;" iconBg="rgba(52,211,153,0.12)"
        title="Render" badge="Free"
        desc="Heroku 替代品 — 512 MB RAM、750 hrs/月、15 分鐘休眠"
        stats={['512 MB', '休眠']}
      >
        <p><a className="acc-link" href="https://render.com" target="_blank" rel="noopener noreferrer">render.com &#8599;</a></p>
        <p>現代化嘅 PaaS 平台，支援 Node.js、Python、Go、Rust 等語言。提供 Web Service、Background Worker、Cron Job 等服務類型。</p>
        <table className="detail-table">
          <tbody>
            <tr><th>Free Tier</th><td>Free Instance（Individual plan 內建）</td></tr>
            <tr><th>CPU / RAM</th><td>0.1 CPU / 512 MB RAM</td></tr>
            <tr><th>頻寬</th><td>100 GB / 月</td></tr>
            <tr><th>運行時間</th><td>750 小時 / 月（所有 free services 共用）</td></tr>
            <tr><th>休眠</th><td>15 分鐘無流量休眠，cold start 30-60 秒</td></tr>
            <tr><th>自訂域名</th><td>支援 + 自動 SSL</td></tr>
            <tr><th>主要限制</th><td>Free PostgreSQL 30 天過期、ephemeral filesystem、無 SSH</td></tr>
            <tr><th>下一級</th><td>Starter $7/月</td></tr>
          </tbody>
        </table>
        <div className="highlight-box" style={{ background: 'rgba(52,211,153,0.08)', borderLeftColor: '#10B981' }}>
          <p style={{ color: '#34d399' }}>防止 Cold Start 技巧：用 <a className="acc-link" href="https://uptimerobot.com" target="_blank" rel="noopener noreferrer" style={{ color: '#34d399', textDecoration: 'underline' }}>UptimeRobot</a>（免費）每 5 分鐘 ping 一次 health endpoint，就可以避開 15 分鐘休眠。呢個係完全合法嘅做法，Render 無禁止外部 monitoring。但要留意 750 hrs/月上限 — 24/7 keep alive 大概用 720 hrs，淨係夠跑一個 service。如果有多個 free instance，需要計清楚總時數。</p>
        </div>
        <div className="use-case">
          <h4>最適合...</h4>
          <p>小型 REST API、demo 後端、Hackathon 項目。配合 UptimeRobot 可以解決 cold start 問題。</p>
        </div>
      </Accordion>

      <Accordion
        icon="&#128642;" iconBg="rgba(139,92,246,0.12)"
        title="Railway" badge="Free"
        desc="$5 credit/月、無休眠、一鍵部署 + DB、比 Render 更實用"
        stats={['$5/月', '無休眠']}
      >
        <p><a className="acc-link" href="https://railway.app" target="_blank" rel="noopener noreferrer">railway.app &#8599;</a></p>
        <p>現代化 PaaS 平台，主打簡潔嘅開發者體驗。最大優勢係 free tier 無休眠機制，$5 credit/月按用量扣費。可以一鍵部署 PostgreSQL、MySQL、Redis、MongoDB 等 database。</p>
        <table className="detail-table">
          <tbody>
            <tr><th>Free Tier</th><td>Trial Plan（$5 credit / 月，需驗證 GitHub 帳號）</td></tr>
            <tr><th>CPU / RAM</th><td>最高 8 vCPU / 8 GB RAM（按用量扣 credit）</td></tr>
            <tr><th>執行時間</th><td>500 小時 / 月（Trial 限制）</td></tr>
            <tr><th>儲存空間</th><td>按用量計費（credit 內包含）</td></tr>
            <tr><th>休眠</th><td>無休眠 — 服務持續運行直到 credit 用完</td></tr>
            <tr><th>自訂域名</th><td>支援 + 自動 SSL</td></tr>
            <tr><th>Database</th><td>一鍵部署 Postgres / MySQL / Redis / MongoDB</td></tr>
            <tr><th>主要限制</th><td>$5 credit 用完即停、Trial 有 500 hrs 上限、需 GitHub 驗證</td></tr>
            <tr><th>下一級</th><td>Hobby $5/月 + 用量（移除 500 hrs 限制）</td></tr>
          </tbody>
        </table>
        <div className="use-case">
          <h4>最適合...</h4>
          <p>需要持續運行嘅後端 API（無休眠）、Backend + DB 一站式部署。$5 credit 對低流量項目夠用一個月。</p>
        </div>
      </Accordion>
    </>
  );
}

function PythonTab() {
  return (
    <Accordion
      icon="&#128013;" iconBg="rgba(59,130,246,0.12)"
      title="PythonAnywhere" badge="Free"
      desc="Python 專用 — 512 MB 磁碟、100 CPU 秒/日、1 個 web app"
      stats={['512 MB', '100 CPU-s/日']}
    >
      <p><a className="acc-link" href="https://www.pythonanywhere.com" target="_blank" rel="noopener noreferrer">pythonanywhere.com &#8599;</a></p>
      <p>專為 Python 設計嘅雲端託管平台。提供瀏覽器內嘅 Python console 同 web app 託管。Flask / Django 初學者嘅極低門檻起步平台，但 free tier 限制多。</p>
      <table className="detail-table">
        <tbody>
          <tr><th>Free Tier</th><td>Beginner Account</td></tr>
          <tr><th>儲存空間</th><td>512 MB 磁碟空間</td></tr>
          <tr><th>CPU</th><td>100 CPU 秒 / 日（daily reset）</td></tr>
          <tr><th>Web App</th><td>只限 1 個 web app</td></tr>
          <tr><th>自訂域名</th><td>不支援（只有 username.pythonanywhere.com）</td></tr>
          <tr><th>外部網絡</th><td>只能連接白名單內嘅外部 API（嚴格限制）</td></tr>
          <tr><th>休眠</th><td>3 個月無活動停用（需手動重啟）</td></tr>
          <tr><th>主要限制</th><td>無自訂域名、外部網絡白名單、100 CPU 秒極低、無 WebSocket</td></tr>
          <tr><th>下一級</th><td>Developer $10/月（自訂域名 + 外部網絡）</td></tr>
        </tbody>
      </table>
      <div className="highlight-box">
        <p>外部網絡白名單係最大限制：只能存取特定 API（Google、GitHub 等）。如果需要連接自訂 API 或數據庫，必須升級。</p>
      </div>
      <div className="use-case">
        <h4>最適合...</h4>
        <p>Python / Flask / Django 學習同練習、課堂作業展示。唔適合正式項目或者需要外部 API 嘅應用。</p>
      </div>
    </Accordion>
  );
}

function FullStackTab() {
  return (
    <Accordion
      icon="&#9729;&#65039;" iconBg="rgba(245,158,11,0.12)"
      title="Cloudflare" badge="Free"
      desc="最慷慨 Free Tier — Workers 100K/日 + Pages 無限頻寬 + D1 5GB + R2 10GB"
      stats={['100K req/日', 'Edge']}
    >
      <p><a className="acc-link" href="https://www.cloudflare.com" target="_blank" rel="noopener noreferrer">cloudflare.com &#8599;</a></p>
      <p>免費產品線非常豐富：Workers（edge serverless）、Pages（靜態 + SSR）、D1（SQLite）、R2（物件存儲）、KV（鍵值存儲）。組合起來可以搭建完整嘅 full-stack 應用。</p>
      <table className="detail-table">
        <tbody>
          <tr><th>Workers</th><td>100,000 次請求/日、10ms CPU/次、1 MB script</td></tr>
          <tr><th>Pages</th><td>無限頻寬、500 次 build/月</td></tr>
          <tr><th>D1 Database</th><td>5 GB 儲存、500 萬行讀取/日、10 萬行寫入/日</td></tr>
          <tr><th>R2 Storage</th><td>10 GB 儲存、100 萬 Class A ops/月</td></tr>
          <tr><th>KV</th><td>1 GB 儲存、10 萬次讀取/日</td></tr>
          <tr><th>休眠</th><td>無休眠 — edge serverless，cold start ~0ms</td></tr>
          <tr><th>主要限制</th><td>Workers 10ms CPU 限制、D1 仍係 beta、KV 最終一致性</td></tr>
          <tr><th>下一級</th><td>Workers Paid $5/月（1000 萬次 + 30ms CPU）</td></tr>
        </tbody>
      </table>
      <div className="use-case">
        <h4>最適合...</h4>
        <p>Edge-first 應用、API proxy、全棧 side project。目前最慷慨嘅 free tier 組合，特別適合需要全球低延遲嘅場景。</p>
      </div>
    </Accordion>
  );
}

function DatabaseTab() {
  return (
    <>
      <Accordion
        icon="&#9889;" iconBg="rgba(52,211,153,0.12)"
        title="Supabase" badge="Free"
        desc="開源 Firebase — PostgreSQL 500MB + Auth 50K MAU + Storage 1GB"
        stats={['500 MB', 'PostgreSQL']}
      >
        <p><a className="acc-link" href="https://supabase.com" target="_blank" rel="noopener noreferrer">supabase.com &#8599;</a></p>
        <p>開源嘅 Firebase 替代品，底層係 PostgreSQL。提供數據庫、Auth、Storage、Edge Functions、Realtime 等功能。</p>
        <table className="detail-table">
          <tbody>
            <tr><th>Free Tier</th><td>Free Plan</td></tr>
            <tr><th>數據庫</th><td>500 MB PostgreSQL + 1 GB 檔案存儲</td></tr>
            <tr><th>項目數量</th><td>最多 2 個活躍項目</td></tr>
            <tr><th>Auth</th><td>50,000 MAU（月活躍用戶）</td></tr>
            <tr><th>Edge Functions</th><td>500,000 次調用 / 月</td></tr>
            <tr><th>Realtime</th><td>200 個同時連接</td></tr>
            <tr><th>休眠</th><td>7 天無活動自動暫停（每月最多 2 次恢復）</td></tr>
            <tr><th>主要限制</th><td>7 天暫停、只有 2 個項目、無 daily backup</td></tr>
            <tr><th>下一級</th><td>Pro $25/月（8 GB DB + 無暫停）</td></tr>
          </tbody>
        </table>
        <div className="highlight-box">
          <p>7 天暫停機制最需要留意。無流量超過 7 天就自動暫停，恢復需幾分鐘，每月只能恢復 2 次。</p>
        </div>
        <div className="use-case">
          <h4>最適合...</h4>
          <p>需要 PostgreSQL + Auth + Storage 嘅全棧項目。DX 非常好，dashboard 直接管理數據庫。</p>
        </div>
      </Accordion>

      <Accordion
        icon="&#128024;" iconBg="rgba(99,102,241,0.12)"
        title="Neon" badge="Free"
        desc="Serverless PostgreSQL — 0.5 GB 儲存、自動擴縮、branching 功能"
        stats={['0.5 GB', 'Serverless PG']}
      >
        <p><a className="acc-link" href="https://neon.tech" target="_blank" rel="noopener noreferrer">neon.tech &#8599;</a></p>
        <p>Serverless PostgreSQL 平台，特色係 database branching（好似 Git branch 咁開分支數據庫）。自動 scale-to-zero 慳成本，啟動延遲極低。</p>
        <table className="detail-table">
          <tbody>
            <tr><th>Free Tier</th><td>Free Plan（永久免費）</td></tr>
            <tr><th>儲存空間</th><td>0.5 GB</td></tr>
            <tr><th>Compute</th><td>最多 0.25 vCPU，共 191.9 compute hours/月</td></tr>
            <tr><th>Branches</th><td>10 個 database branches</td></tr>
            <tr><th>項目數量</th><td>1 個項目</td></tr>
            <tr><th>休眠</th><td>5 分鐘無活動 scale-to-zero，cold start ~500ms</td></tr>
            <tr><th>主要限制</th><td>0.5 GB 容量細、1 個項目、無 point-in-time restore</td></tr>
            <tr><th>下一級</th><td>Launch $19/月（10 GB + 300 compute hrs）</td></tr>
          </tbody>
        </table>
        <div className="use-case">
          <h4>最適合...</h4>
          <p>純 PostgreSQL 需求（唔需要 Auth/Storage 全套）。Branching 功能對開發同測試 workflow 幫助極大。</p>
        </div>
      </Accordion>

      <Accordion
        icon="&#128293;" iconBg="rgba(245,158,11,0.12)"
        title="Firebase" badge="Free"
        desc="Google 全家桶 — Firestore 1GB + Auth 免費 + Hosting 10GB + Functions 200萬/月"
        stats={['1 GB', 'NoSQL']}
      >
        <p><a className="acc-link" href="https://firebase.google.com" target="_blank" rel="noopener noreferrer">firebase.google.com &#8599;</a></p>
        <p>Google 嘅 BaaS（Backend as a Service）平台。Spark Plan 免費額度相當慷慨，包含 Firestore、Authentication、Hosting、Cloud Functions、Storage 等服務。特別適合 mobile app 同 SPA 後端。</p>
        <table className="detail-table">
          <tbody>
            <tr><th>Free Tier</th><td>Spark Plan（永久免費）</td></tr>
            <tr><th>Firestore</th><td>1 GB 儲存 + 50K 讀取 / 20K 寫入 / 20K 刪除 / 日</td></tr>
            <tr><th>Authentication</th><td>免費（無限用戶、Email/Google/GitHub 等 provider）</td></tr>
            <tr><th>Hosting</th><td>10 GB 儲存 + 360 MB/日 頻寬</td></tr>
            <tr><th>Functions</th><td>200 萬次調用/月 + 400K GB-seconds</td></tr>
            <tr><th>Storage</th><td>5 GB 儲存 + 1 GB/日 下載</td></tr>
            <tr><th>休眠</th><td>無休眠 — serverless 按需</td></tr>
            <tr><th>主要限制</th><td>NoSQL only（無 SQL）、vendor lock-in、Functions 需 Blaze 先用 Node.js 以外語言</td></tr>
            <tr><th>下一級</th><td>Blaze Plan（pay-as-you-go，超過免費額度先收費）</td></tr>
          </tbody>
        </table>
        <div className="use-case">
          <h4>最適合...</h4>
          <p>Mobile app 後端、SPA + Auth 場景、需要 realtime sync 嘅應用。Auth 完全免費呢點非常吸引。</p>
        </div>
      </Accordion>

      <Accordion
        icon="&#127811;" iconBg="rgba(52,211,153,0.12)"
        title="MongoDB Atlas" badge="Free"
        desc="Document DB — M0 512 MB、100 連接、無休眠、Atlas Search"
        stats={['512 MB', 'NoSQL']}
      >
        <p><a className="acc-link" href="https://www.mongodb.com/atlas" target="_blank" rel="noopener noreferrer">mongodb.com/atlas &#8599;</a></p>
        <p>MongoDB 官方雲端數據庫。M0 Free Cluster 提供 512 MB 儲存，支援 Atlas Search、Charts 等附加功能嘅基本版本。</p>
        <table className="detail-table">
          <tbody>
            <tr><th>Free Tier</th><td>M0 Shared Cluster</td></tr>
            <tr><th>儲存空間</th><td>512 MB</td></tr>
            <tr><th>連接數</th><td>最多 100 個同時連接</td></tr>
            <tr><th>Operations</th><td>100 ops / 秒（讀寫合計）</td></tr>
            <tr><th>備份</th><td>不支援（M0 無 backup）</td></tr>
            <tr><th>休眠</th><td>無休眠 — cluster 持續運行</td></tr>
            <tr><th>主要限制</th><td>512 MB 容量細、無 backup、100 ops/sec、無 VPC peering</td></tr>
            <tr><th>下一級</th><td>M2 ~$9/月（2 GB + backup）</td></tr>
          </tbody>
        </table>
        <div className="use-case">
          <h4>最適合...</h4>
          <p>MongoDB 學習、小型 CRUD 應用。512 MB 對文字數據可以存幾萬條記錄。</p>
        </div>
      </Accordion>

      <Accordion
        icon="&#128311;" iconBg="rgba(59,130,246,0.12)"
        title="Microsoft Azure" badge="Free"
        desc="企業級 — Cosmos DB 25GB + Functions 100萬/月 + Students $100 credit"
        stats={['25 GB', 'Enterprise']}
      >
        <p><a className="acc-link" href="https://azure.microsoft.com" target="_blank" rel="noopener noreferrer">azure.microsoft.com &#8599;</a></p>
        <p>Always Free 產品線包含多項永久免費服務。Students 計劃提供 $100 credit 無需信用卡。</p>
        <table className="detail-table">
          <tbody>
            <tr><th>Cosmos DB</th><td>1,000 RU/s + 25 GB 儲存（永久免費）</td></tr>
            <tr><th>Functions</th><td>100 萬次調用/月（永久免費）</td></tr>
            <tr><th>App Service</th><td>10 apps、1 GB 磁碟、60 分鐘 CPU/日（F1）</td></tr>
            <tr><th>Students</th><td>$100 credit/年（無需信用卡，.edu 驗證）</td></tr>
            <tr><th>休眠</th><td>App Service F1：20 分鐘休眠；Functions：按需</td></tr>
            <tr><th>主要限制</th><td>Always Free 產品有限、部分 12 個月後收費、介面複雜</td></tr>
          </tbody>
        </table>
        <div className="use-case">
          <h4>最適合...</h4>
          <p>學生（$100 credit）、企業級 Cosmos DB 項目、.NET / C# 用戶。</p>
        </div>
      </Accordion>
    </>
  );
}

function AIViberTab() {
  return (
    <div className="card">
      <h2>AI Viber</h2>
      <div className="subtitle">複製 Prompt，貼去 AI 工具，即刻開始 Build</div>

      <div className="prompt-card">
        <h4>Prompt 1 — 設計完整 Deployment Pipeline</h4>
        <div className="prompt-text">
          {'幫手設計一個完整嘅 deployment pipeline，適用於 [框架，例如 Next.js / Express / Django / Spring Boot] 項目，部署到 [平台，例如 Vercel / Render / Railway / AWS]。\n\n要求：\n1. 定義完整嘅 CI/CD 流程（Code Push → Build → Test → Deploy）\n2. 設定 staging 同 production 兩個環境，staging 用 PR preview\n3. 生成所有需要嘅配置檔（Dockerfile / docker-compose / GitHub Actions workflow）\n4. 設定 environment variables 管理（唔好 hardcode secrets）\n5. 加入 health check endpoint 確保部署成功\n6. 設定 rollback 策略——部署失敗時自動回退到上一個版本\n7. 如果用免費平台，加入防止 cold start 嘅策略（例如 UptimeRobot ping）'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 實作 Blue-Green / Canary 部署策略</h4>
        <div className="prompt-text">
          {'幫手實作一個 [策略，例如 Blue-Green / Canary / Rolling Update] 部署策略，用 [工具，例如 Docker + Nginx / Kubernetes / AWS ECS]。\n\n要求：\n1. 設計部署架構圖，標明流量點樣喺新舊版本之間切換\n2. 實作 zero-downtime deployment——用戶喺部署過程中完全唔受影響\n3. 如果係 Blue-Green：設定兩組完全相同嘅環境，用 load balancer 切換流量\n4. 如果係 Canary：先將 10% 流量導去新版本，觀察 metrics 後逐步增加\n5. 設定自動化 health check——新版本健康先切換流量\n6. 實作自動 rollback 機制——error rate 超過 [閾值，例如 5%] 即刻回退\n7. 生成所有需要嘅配置檔同部署 scripts'}
        </div>
      </div>
    </div>
  );
}

function FlowchartSVG() {
  return (
    <div className="diagram-container">
      <svg viewBox="0 0 780 420" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" /></filter>
          <filter id="glowGreen">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feFlood floodColor="#34d399" floodOpacity="0.25" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glowIndigo">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feFlood floodColor="#6366f1" floodOpacity="0.25" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="gradCenter" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3730a3" /><stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="gradFront" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#065f46" /><stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="gradBack" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7c2d12" /><stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="gradPy" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="gradFull" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#581c87" /><stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="gradDBDep" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#713f12" /><stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
          <marker id="arrAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
          <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
          <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
          <marker id="arrRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
        </defs>

        {/* Center node */}
        <g transform="translate(310,170)" filter="url(#glowIndigo)">
          <rect width="160" height="70" rx="14" fill="url(#gradCenter)" stroke="#6366f1" strokeWidth="2" filter="url(#shadow)" />
          <text x="80" y="30" textAnchor="middle" fill="#a5b4fc" fontSize="14" fontWeight="700">部署咩？</text>
          <text x="80" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">What are you deploying?</text>
        </g>

        {/* Frontend */}
        <g transform="translate(30,20)" filter="url(#glowGreen)">
          <rect width="150" height="65" rx="14" fill="url(#gradFront)" stroke="#10B981" strokeWidth="1.5" filter="url(#shadow)" />
          <text x="75" y="25" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">Frontend 前端</text>
          <text x="75" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">GitHub Pages / Vercel</text>
        </g>

        {/* Backend */}
        <g transform="translate(600,20)">
          <rect width="150" height="65" rx="14" fill="url(#gradBack)" stroke="#f87171" strokeWidth="1.5" filter="url(#shadow)" />
          <text x="75" y="25" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="700">Backend 後端</text>
          <text x="75" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">Render / Railway</text>
        </g>

        {/* Python */}
        <g transform="translate(30,330)">
          <rect width="150" height="65" rx="14" fill="url(#gradPy)" stroke="#3B82F6" strokeWidth="1.5" filter="url(#shadow)" />
          <text x="75" y="25" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Python 專用</text>
          <text x="75" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">PythonAnywhere</text>
        </g>

        {/* Full Stack */}
        <g transform="translate(600,330)">
          <rect width="150" height="65" rx="14" fill="url(#gradFull)" stroke="#8B5CF6" strokeWidth="1.5" filter="url(#shadow)" />
          <text x="75" y="25" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="700">Full Stack 全棧</text>
          <text x="75" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">Cloudflare</text>
        </g>

        {/* Database */}
        <g transform="translate(315,340)">
          <rect width="150" height="65" rx="14" fill="url(#gradDBDep)" stroke="#fbbf24" strokeWidth="1.5" filter="url(#shadow)" />
          <text x="75" y="25" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">Database</text>
          <text x="75" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">Supabase / Neon / Firebase</text>
        </g>

        {/* Arrows */}
        <path d="M 310 195 Q 220 120 180 87" fill="none" stroke="#10B981" strokeWidth="2" markerEnd="url(#arrGreen)" />
        <path d="M 470 195 Q 560 120 600 87" fill="none" stroke="#f87171" strokeWidth="2" markerEnd="url(#arrRed)" />
        <path d="M 310 240 Q 220 300 180 330" fill="none" stroke="#3B82F6" strokeWidth="2" markerEnd="url(#arrBlue)" />
        <path d="M 470 240 Q 560 300 600 330" fill="none" stroke="#8B5CF6" strokeWidth="2" markerEnd="url(#arrPurple)" />
        <path d="M 390 240 Q 390 290 390 338" fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrAmber)" />
      </svg>
    </div>
  );
}

function QuickSelectionGuide() {
  return (
    <div className="card" style={{ marginTop: 32 }}>
      <h2>快速選擇指南</h2>
      <div className="subtitle">根據需求揀平台</div>
      <div className="key-points">
        <div className="key-point" style={{ borderLeftColor: '#10B981' }}>
          <h4>純靜態網站</h4>
          <p>GitHub Pages — 零設定、100 GB/月、直接從 Git 部署</p>
        </div>
        <div className="key-point" style={{ borderLeftColor: '#6366f1' }}>
          <h4>React / Next.js</h4>
          <p>Vercel — SSR 支援、Preview Deploy、最佳前端 DX</p>
        </div>
        <div className="key-point" style={{ borderLeftColor: '#8B5CF6' }}>
          <h4>Backend API（無休眠）</h4>
          <p>Railway — $5 credit/月、持續運行、一鍵部署 DB</p>
        </div>
        <div className="key-point" style={{ borderLeftColor: '#f87171' }}>
          <h4>Edge + 全棧</h4>
          <p>Cloudflare — 最慷慨 free tier（Workers + Pages + D1 + R2）</p>
        </div>
        <div className="key-point" style={{ borderLeftColor: '#fbbf24' }}>
          <h4>PostgreSQL + Auth</h4>
          <p>Supabase — 開源 Firebase 替代、500 MB DB + 50K MAU</p>
        </div>
        <div className="key-point" style={{ borderLeftColor: '#3B82F6' }}>
          <h4>Mobile App 後端</h4>
          <p>Firebase — Auth 完全免費、Firestore 1 GB、realtime sync</p>
        </div>
      </div>
    </div>
  );
}

export default function Deployment() {
  return (
    <>
      <FlowchartSVG />
      <TopicTabs
        title="免費部署平台"
        subtitle="Free Tier 部署指南 — Frontend / Backend / Database"
        tabs={[
          { id: 'frontend', label: '① Frontend', content: <FrontendTab /> },
          { id: 'backend', label: '② Backend', content: <BackendTab /> },
          { id: 'python', label: '③ Python', premium: true, content: <PythonTab /> },
          { id: 'fullstack', label: '④ Full Stack', premium: true, content: <FullStackTab /> },
          { id: 'database', label: '⑤ Database', premium: true, content: <DatabaseTab /> },
          { id: 'ai-viber', label: '⑥ AI Viber', premium: true, content: <AIViberTab /> },
        ]}
      />
      <QuickSelectionGuide />
      <div className="topic-container">
        <QuizRenderer data={quizData} />
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
