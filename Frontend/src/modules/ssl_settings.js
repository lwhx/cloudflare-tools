export class SSLSettingsModule {
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
            <div class="page-pretitle text-muted">SSL/TLS Settings</div>
            <h2 class="page-title fw-bold">HTTPS边缘证书批量设置 (SSL Settings)</h2>
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
                <select id="ssl-account" class="form-select border-2 shadow-none">
                  ${(accounts || []).map(a => `<option value="${a.id}">${a.name} (${a.email})</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">输入域名列表 <span class="badge bg-blue-lt">每行一个</span></label>
                <textarea id="ssl-domains" class="form-control border-2 shadow-none font-monospace" rows="6" placeholder="example.com\nexample.net\nexample.org"></textarea>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">SSL/TLS 加密模式</label>
                <select id="ssl-mode" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="off">关闭 (Off)</option>
                  <option value="flexible">灵活 (Flexible)</option>
                  <option value="full">完全 (Full)</option>
                  <option value="strict">完全(严格) (Full Strict)</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">最低 TLS 版本</label>
                <select id="ssl-min-tls" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="1.0">TLS 1.0</option>
                  <option value="1.1">TLS 1.1</option>
                  <option value="1.2">TLS 1.2</option>
                  <option value="1.3">TLS 1.3</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">始终使用 HTTPS</label>
                <select id="ssl-always-https" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">自动 HTTPS 重写</label>
                <select id="ssl-auto-https" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">机会性加密</label>
                <select id="ssl-opportunistic" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
              </div>
              <div class="form-footer mt-4">
                <button id="btn-apply-ssl" class="btn btn-primary w-100 py-2 fw-bold shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10" /></svg>
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
              <div id="ssl-results" class="table-responsive mt-2">
                <div class="text-center py-6 text-muted border-0">配置左侧信息后点击开始，结果将显示在此处</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-apply-ssl').addEventListener('click', () => this.applySSLSettings(state));
  }

  static async applySSLSettings(state) {
    const accountId = document.getElementById('ssl-account').value;
    const domainsText = document.getElementById('ssl-domains').value || '';
    const sslMode = document.getElementById('ssl-mode').value;
    const minTlsVersion = document.getElementById('ssl-min-tls').value;
    const alwaysUseHttps = document.getElementById('ssl-always-https').value;
    const automaticHttps = document.getElementById('ssl-auto-https').value;
    const opportunisticEnc = document.getElementById('ssl-opportunistic').value;

    if (!accountId) return alert('请选择操作账号');
    if (!domainsText.trim()) return alert('请输入域名列表');

    if (!sslMode && !minTlsVersion && !alwaysUseHttps && !automaticHttps && !opportunisticEnc) {
      return alert('请至少选择一项要修改的设置');
    }

    const domains = domainsText.split('\n').map(d => d.trim()).filter(d => d.length > 0);
    if (domains.length === 0) return alert('域名列表为空');

    const btn = document.getElementById('btn-apply-ssl');
    const resultsDiv = document.getElementById('ssl-results');

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
      const res = await fetch('/api/ssl/batch-settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': state.token || localStorage.getItem('token') 
        },
        body: JSON.stringify({ 
          accountId, 
          domains, 
          sslMode, 
          minTlsVersion, 
          alwaysUseHttps, 
          automaticHttps, 
          opportunisticEnc 
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
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10" /></svg> 立即批量应用';
    }
  }
}
