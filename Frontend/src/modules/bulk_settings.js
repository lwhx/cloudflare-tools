export class BulkSettingsModule {
  static async render(container, state) {
    const res = await fetch('/api/accounts', { headers: { 'Authorization': state.token || localStorage.getItem('token') } });
    if (!res.ok) {
      window.logout();
      return;
    }
    const accounts = await res.json();

    container.innerHTML = `
      <div class="page-header d-print-none mb-3">
        <div class="row align-items-center">
          <div class="col">
            <div class="page-pretitle text-muted">Bulk Settings</div>
            <h2 class="page-title fw-bold">批量修改设置项 (Bulk Settings)</h2>
          </div>
        </div>
      </div>
      <div class="row row-cards">
        <div class="col-md-5">
          <div class="card border-0 shadow-sm rounded-3 h-100">
            <div class="card-body">
              <h3 class="card-title fw-bold border-bottom pb-2">操作配置</h3>
              <div class="mb-3">
                <label class="form-label fw-bold">选择 Cloudflare 账号</label>
                <select id="bulk-account" class="form-select border-2 shadow-none">
                  ${(accounts || []).map(a => `<option value="${a.id}">${a.name} (${a.email})</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">输入域名列表 <span class="badge bg-blue-lt">每行一个</span></label>
                <textarea id="bulk-domains" class="form-control border-2 shadow-none font-monospace" rows="5" placeholder="example.com\nexample.net\nexample.org"></textarea>
              </div>
              
              <h4 class="fw-bold mt-4 mb-3 text-primary">安全设置</h4>
              <div class="mb-3">
                <label class="form-label fw-bold">安全级别 (Security Level)</label>
                <select id="bulk-security-level" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="off">关闭</option>
                  <option value="essentially_off">基本关闭</option>
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                  <option value="under_attack">受攻击模式</option>
                </select>
                <small class="text-muted">控制访客面临的挑战级别</small>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">挑战通过时长 (Challenge TTL)</label>
                <select id="bulk-challenge-ttl" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="300">5 分钟</option>
                  <option value="900">15 分钟</option>
                  <option value="1800">30 分钟</option>
                  <option value="2700">45 分钟</option>
                  <option value="3600">1 小时</option>
                  <option value="7200">2 小时</option>
                  <option value="10800">3 小时</option>
                  <option value="14400">4 小时</option>
                  <option value="28800">8 小时</option>
                  <option value="57600">16 小时</option>
                  <option value="86400">1 天</option>
                  <option value="604800">1 周</option>
                  <option value="2592000">1 个月</option>
                  <option value="31536000">1 年</option>
                </select>
                <small class="text-muted">访客通过挑战后的有效时长</small>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">浏览器完整性检查</label>
                <select id="bulk-browser-check" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
                <small class="text-muted">检查浏览器标头中是否存在威胁</small>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">WAF (Web 应用防火墙)</label>
                <select id="bulk-waf" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">Privacy Pass</label>
                <select id="bulk-privacy-pass" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
                <small class="text-muted">支持隐私通行证减少验证码</small>
              </div>

              <h4 class="fw-bold mt-4 mb-3 text-primary">内容保护</h4>
              <div class="mb-3">
                <label class="form-label fw-bold">防盗链保护 (Hotlink Protection)</label>
                <select id="bulk-hotlink" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
                <small class="text-muted">防止其他网站盗用您的图片</small>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">邮箱地址混淆</label>
                <select id="bulk-email-obfuscation" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
                <small class="text-muted">保护页面中的邮箱地址免受爬虫抓取</small>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">服务器端排除 (SSE)</label>
                <select id="bulk-sse" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
                <small class="text-muted">从缓存中排除特定内容</small>
              </div>

              <h4 class="fw-bold mt-4 mb-3 text-primary">网络设置</h4>
              <div class="mb-3">
                <label class="form-label fw-bold">Orange to Orange (O2O)</label>
                <select id="bulk-o2o" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
                <small class="text-muted">允许 CloudFlare 代理之间直接通信</small>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">代理读取超时</label>
                <select id="bulk-proxy-timeout" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="100">100 秒</option>
                  <option value="200">200 秒</option>
                  <option value="300">300 秒</option>
                  <option value="600">600 秒</option>
                </select>
                <small class="text-muted">源服务器响应的最大等待时间</small>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">True Client IP Header</label>
                <select id="bulk-true-client-ip" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
                <small class="text-muted">在请求头中包含真实客户端 IP</small>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">响应缓冲</label>
                <select id="bulk-response-buffering" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
                <small class="text-muted">在发送前缓冲整个响应</small>
              </div>

              <h4 class="fw-bold mt-4 mb-3 text-primary">优化设置</h4>
              <div class="mb-3">
                <label class="form-label fw-bold">自动平台优化 (APO)</label>
                <select id="bulk-apo" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
                <small class="text-muted">WordPress 等平台的自动优化</small>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">预取预加载</label>
                <select id="bulk-prefetch" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
                <small class="text-muted">预加载链接资源</small>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">查询字符串排序</label>
                <select id="bulk-sort-query" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
                <small class="text-muted">对 URL 查询字符串排序以提高缓存命中率</small>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">Crawler Hints</label>
                <select id="bulk-crawler-hints" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
                <small class="text-muted">帮助搜索引擎更好地索引您的网站</small>
              </div>

              <div class="form-footer mt-4">
                <button id="btn-apply-bulk" class="btn btn-primary w-100 py-2 fw-bold shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1" /><path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z" /><path d="M16 5l3 3" /></svg>
                  立即批量应用
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-7">
          <div class="card border-0 shadow-sm rounded-3 h-100">
            <div class="card-body">
              <h3 class="card-title fw-bold border-bottom pb-2">设置结果反馈</h3>
              <div id="bulk-results" class="table-responsive mt-2">
                <div class="text-center py-6 text-muted border-0">配置左侧信息后点击开始，结果将显示在此处</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-apply-bulk').addEventListener('click', () => this.applyBulkSettings(state));
  }

  static async applyBulkSettings(state) {
    const accountId = document.getElementById('bulk-account').value;
    const domainsText = document.getElementById('bulk-domains').value || '';
    const securityLevel = document.getElementById('bulk-security-level').value;
    const challengePassage = document.getElementById('bulk-challenge-ttl').value;
    const browserIntegrity = document.getElementById('bulk-browser-check').value;
    const hotlinkProtection = document.getElementById('bulk-hotlink').value;
    const emailObfuscation = document.getElementById('bulk-email-obfuscation').value;
    const serverSideExcludes = document.getElementById('bulk-sse').value;
    const waf = document.getElementById('bulk-waf').value;
    const privacyPass = document.getElementById('bulk-privacy-pass').value;
    const automaticPlatform = document.getElementById('bulk-apo').value;
    const orangeToOrange = document.getElementById('bulk-o2o').value;
    const proxyReadTimeout = document.getElementById('bulk-proxy-timeout').value;
    const prefetchPreload = document.getElementById('bulk-prefetch').value;
    const responseBuffering = document.getElementById('bulk-response-buffering').value;
    const sortQueryString = document.getElementById('bulk-sort-query').value;
    const trueClientIp = document.getElementById('bulk-true-client-ip').value;
    const crawlerHints = document.getElementById('bulk-crawler-hints').value;

    if (!accountId) return alert('请选择操作账号');
    if (!domainsText.trim()) return alert('请输入域名列表');

    if (!securityLevel && !challengePassage && !browserIntegrity && !hotlinkProtection && 
        !emailObfuscation && !serverSideExcludes && !waf && !privacyPass && 
        !automaticPlatform && !orangeToOrange && !proxyReadTimeout && !prefetchPreload && 
        !responseBuffering && !sortQueryString && !trueClientIp && !crawlerHints) {
      return alert('请至少选择一项要修改的设置');
    }

    const domains = domainsText.split('\n').map(d => d.trim()).filter(d => d.length > 0);
    if (domains.length === 0) return alert('域名列表为空');

    const btn = document.getElementById('btn-apply-bulk');
    const resultsDiv = document.getElementById('bulk-results');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>正在应用中...';

    resultsDiv.innerHTML = `
      <table class="table table-vcenter card-table table-hover">
        <thead class="bg-light">
          <tr><th>域名</th><th>状态</th></tr>
        </thead>
        <tbody>
          ${domains.map(d => `<tr><td>${d}</td><td><span class="badge bg-secondary-lt text-dark">队列中</span></td></tr>`).join('')}
        </tbody>
      </table>
    `;

    try {
      const res = await fetch('/api/bulk-settings/batch-apply', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': state.token || localStorage.getItem('token') 
        },
        body: JSON.stringify({ 
          accountId, 
          domains, 
          securityLevel,
          challengePassage,
          browserIntegrity,
          hotlinkProtection,
          emailObfuscation,
          serverSideExcludes,
          waf,
          privacyPass,
          automaticPlatform,
          orangeToOrange,
          proxyReadTimeout,
          prefetchPreload,
          responseBuffering,
          sortQueryString,
          trueClientIp,
          crawlerHints
        })
      });

      const data = await res.json();

      resultsDiv.innerHTML = `
        <table class="table table-vcenter card-table table-hover">
          <thead class="bg-light">
            <tr><th>域名</th><th>状态</th></tr>
          </thead>
          <tbody>
            ${data.map(r => `
              <tr class="bg-white">
                <td><div class="fw-bold text-dark">${r.domain}</div></td>
                <td>
                  ${r.success 
                    ? `<span class="badge bg-success-lt text-success fw-bold">成功</span><div class="small text-muted mt-1">${r.message}</div>` 
                    : `<span class="badge bg-danger-lt text-danger fw-bold">失败</span><div class="small text-danger mt-1">${r.message}</div>`
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (e) {
      console.error(e);
      alert('提交请求发生错误');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1" /><path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z" /><path d="M16 5l3 3" /></svg> 立即批量应用';
    }
  }
}
