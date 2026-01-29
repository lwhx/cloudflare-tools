export class ProxyToggleModule {
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
            <div class="page-pretitle text-muted">DNS Management</div>
            <h2 class="page-title fw-bold">批量开关代理 (Proxy Toggle)</h2>
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
                <select id="proxy-account" class="form-select border-2 shadow-none">
                  ${(accounts || []).map(a => `<option value="${a.id}">${a.name} (${a.email})</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">输入域名列表 <span class="badge bg-blue-lt">每行一个</span></label>
                <textarea id="proxy-domains" class="form-control border-2 shadow-none font-monospace" rows="8" placeholder="example.com\nexample.net\nexample.org"></textarea>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">记录类型</label>
                <select id="proxy-record-type" class="form-select border-2 shadow-none">
                  <option value="">全部类型</option>
                  <option value="A">A</option>
                  <option value="AAAA">AAAA</option>
                  <option value="CNAME">CNAME</option>
                </select>
                <div class="form-text">只有 A、AAAA、CNAME 记录支持代理功能</div>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">主机记录</label>
                <input type="text" id="proxy-host-record" class="form-control border-2 shadow-none" placeholder="留空表示全部，如：www、@、*">
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">代理状态</label>
                <div class="form-check">
                  <input class="form-check-input" type="radio" name="proxy-status" id="proxy-on" value="true" checked>
                  <label class="form-check-label" for="proxy-on">
                    开启代理 <span class="text-muted small">（启用 CDN 缓存加速）</span>
                  </label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" type="radio" name="proxy-status" id="proxy-off" value="false">
                  <label class="form-check-label" for="proxy-off">
                    关闭代理 <span class="text-muted small">（仅 DNS 解析）</span>
                  </label>
                </div>
              </div>
              <div class="form-footer mt-4">
                <button id="btn-start-toggle" class="btn btn-primary w-100 py-2 fw-bold shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M15 4l-4 4l4 4m-4 -4h11" /><path d="M9 20l4 -4l-4 -4m4 4h-11" /></svg>
                  立即批量切换
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-7">
          <div class="card border-0 shadow-sm rounded-3 h-100">
            <div class="card-body">
              <h3 class="card-title fw-bold border-bottom pb-2">切换结果反馈</h3>
              <div id="proxy-results" class="table-responsive mt-2">
                <div class="text-center py-6 text-muted border-0">配置左侧信息后点击开始，结果将显示在此处</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-start-toggle').addEventListener('click', () => this.startToggle(state));
  }

  static async startToggle(state) {
    const accountId = document.getElementById('proxy-account').value;
    const domainsText = document.getElementById('proxy-domains').value || '';
    const recordType = document.getElementById('proxy-record-type').value;
    const hostRecord = document.getElementById('proxy-host-record').value.trim();
    const proxyStatus = document.querySelector('input[name="proxy-status"]:checked').value === 'true';

    if (!accountId) return alert('请选择操作账号');
    if (!domainsText.trim()) return alert('请输入域名列表');

    const domains = domainsText.split('\n').map(d => d.trim()).filter(d => d.length > 0);
    if (domains.length === 0) return alert('域名列表为空');

    const btn = document.getElementById('btn-start-toggle');
    const resultsDiv = document.getElementById('proxy-results');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>正在切换中...';

    resultsDiv.innerHTML = `
      <table class="table table-vcenter card-table table-hover">
        <thead class="bg-light">
          <tr><th>域名</th><th>状态</th><th>操作数量</th></tr>
        </thead>
        <tbody>
          ${domains.map(d => `<tr><td>${d}</td><td><span class="badge bg-secondary-lt text-dark">队列中</span></td><td>-</td></tr>`).join('')}
        </tbody>
      </table>
    `;

    try {
      const res = await fetch('/api/dns/proxy-toggle', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': state.token || localStorage.getItem('token') 
        },
        body: JSON.stringify({ 
          accountId, 
          domains, 
          recordType, 
          hostRecord, 
          proxyStatus 
        })
      });

      const data = await res.json();

      resultsDiv.innerHTML = `
        <table class="table table-vcenter card-table table-hover">
          <thead class="bg-light">
            <tr><th>域名</th><th>状态</th><th>操作数量</th></tr>
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
                <td><span class="badge bg-blue-lt">${r.count} 条</span></td>
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
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M15 4l-4 4l4 4m-4 -4h11" /><path d="M9 20l4 -4l-4 -4m4 4h-11" /></svg> 立即批量切换';
    }
  }
}
