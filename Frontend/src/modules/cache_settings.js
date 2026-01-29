export class CacheSettingsModule {
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
            <div class="page-pretitle text-muted">Cache Management</div>
            <h2 class="page-title fw-bold">批量清除缓存 缓存设置 (Cache Settings)</h2>
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
                <select id="cache-account" class="form-select border-2 shadow-none">
                  ${(accounts || []).map(a => `<option value="${a.id}">${a.name} (${a.email})</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">输入域名列表 <span class="badge bg-blue-lt">每行一个</span></label>
                <textarea id="cache-domains" class="form-control border-2 shadow-none font-monospace" rows="6" placeholder="example.com\nexample.net\nexample.org"></textarea>
              </div>
              <div class="mb-3">
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="cache-purge">
                  <label class="form-check-label fw-bold" for="cache-purge">清除全部缓存 (Purge Everything)</label>
                </div>
                <small class="text-muted">清除该域名在 CloudFlare 上的所有缓存文件</small>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">缓存级别 (Cache Level)</label>
                <select id="cache-level" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="aggressive">积极 (Aggressive)</option>
                  <option value="basic">基本 (Basic)</option>
                  <option value="simplified">简化 (Simplified)</option>
                </select>
                <small class="text-muted">控制 CloudFlare 缓存静态内容的方式</small>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">浏览器缓存 TTL</label>
                <select id="cache-browser-ttl" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="0">遵循现有标头</option>
                  <option value="1800">30 分钟</option>
                  <option value="3600">1 小时</option>
                  <option value="7200">2 小时</option>
                  <option value="14400">4 小时</option>
                  <option value="28800">8 小时</option>
                  <option value="43200">12 小时</option>
                  <option value="86400">1 天</option>
                  <option value="172800">2 天</option>
                  <option value="259200">3 天</option>
                  <option value="345600">4 天</option>
                  <option value="432000">5 天</option>
                  <option value="691200">8 天</option>
                  <option value="1382400">16 天</option>
                  <option value="2678400">1 个月</option>
                  <option value="5356800">2 个月</option>
                  <option value="16070400">6 个月</option>
                  <option value="31536000">1 年</option>
                </select>
                <small class="text-muted">浏览器缓存资源的时间</small>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">Always Online</label>
                <select id="cache-always-online" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
                <small class="text-muted">源服务器宕机时从缓存提供内容</small>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">开发模式 (Development Mode)</label>
                <select id="cache-dev-mode" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启 (3小时)</option>
                  <option value="off">关闭</option>
                </select>
                <small class="text-muted">暂时绕过缓存，方便开发调试</small>
              </div>
              <div class="form-footer mt-4">
                <button id="btn-apply-cache" class="btn btn-primary w-100 py-2 fw-bold shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" /></svg>
                  立即批量应用
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-7">
          <div class="card border-0 shadow-sm rounded-3 h-100">
            <div class="card-body">
              <h3 class="card-title fw-bold border-bottom pb-2">操作结果反馈</h3>
              <div id="cache-results" class="table-responsive mt-2">
                <div class="text-center py-6 text-muted border-0">配置左侧信息后点击开始，结果将显示在此处</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-apply-cache').addEventListener('click', () => this.applyCacheSettings(state));
  }

  static async applyCacheSettings(state) {
    const accountId = document.getElementById('cache-account').value;
    const domainsText = document.getElementById('cache-domains').value || '';
    const purgeCache = document.getElementById('cache-purge').checked;
    const cacheLevel = document.getElementById('cache-level').value;
    const browserTtl = document.getElementById('cache-browser-ttl').value;
    const alwaysOnline = document.getElementById('cache-always-online').value;
    const developmentMode = document.getElementById('cache-dev-mode').value;

    if (!accountId) return alert('请选择操作账号');
    if (!domainsText.trim()) return alert('请输入域名列表');

    if (!purgeCache && !cacheLevel && !browserTtl && !alwaysOnline && !developmentMode) {
      return alert('请至少选择一项要执行的操作');
    }

    const domains = domainsText.split('\n').map(d => d.trim()).filter(d => d.length > 0);
    if (domains.length === 0) return alert('域名列表为空');

    const btn = document.getElementById('btn-apply-cache');
    const resultsDiv = document.getElementById('cache-results');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>正在处理中...';

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
      const res = await fetch('/api/cache/batch-settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': state.token || localStorage.getItem('token') 
        },
        body: JSON.stringify({ 
          accountId, 
          domains, 
          purgeCache,
          cacheLevel, 
          browserTtl, 
          alwaysOnline, 
          developmentMode 
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
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" /></svg> 立即批量应用';
    }
  }
}
