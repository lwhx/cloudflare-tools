export class DelZoneModule {
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
            <div class="page-pretitle text-muted">Zone Management</div>
            <h2 class="page-title fw-bold">批量删除域名 (Batch Delete Zones)</h2>
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
                <select id="delzone-account" class="form-select border-2 shadow-none">
                  ${(accounts || []).map(a => `<option value="${a.id}">${a.name} (${a.email})</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">输入域名列表 <span class="badge bg-blue-lt">每行一个</span></label>
                <textarea id="delzone-domains" class="form-control border-2 shadow-none font-monospace" rows="12" placeholder="example.com\nexample.net\nexample.org"></textarea>
              </div>
              <div class="alert alert-danger border-0 py-2 px-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon alert-icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 9v4" /><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z" /><path d="M12 16h.01" /></svg>
                <span class="small fw-bold">警告：删除域名将移除所有DNS记录，此操作不可撤销！</span>
              </div>
              <div class="form-footer mt-4">
                <button id="btn-batch-delzone" class="btn btn-danger w-100 py-2 fw-bold shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg>
                  立即批量删除
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-7">
          <div class="card border-0 shadow-sm rounded-3 h-100">
            <div class="card-body">
              <h3 class="card-title fw-bold border-bottom pb-2">删除结果反馈</h3>
              <div id="delzone-results" class="table-responsive mt-2">
                <div class="text-center py-6 text-muted border-0">配置左侧信息后点击开始，结果将显示在此处</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-batch-delzone').addEventListener('click', () => this.batchDeleteZones(state));
  }

  static async batchDeleteZones(state) {
    const accountId = document.getElementById('delzone-account').value;
    const domainsText = document.getElementById('delzone-domains').value || '';

    if (!accountId) return alert('请选择操作账号');
    if (!domainsText.trim()) return alert('请输入域名列表');

    const domains = domainsText.split('\n').map(d => d.trim()).filter(d => d.length > 0);
    if (domains.length === 0) return alert('域名列表为空');

    if (!confirm(`确定要删除 ${domains.length} 个域名吗？此操作将删除所有DNS记录且不可撤销！`)) return;

    const btn = document.getElementById('btn-batch-delzone');
    const resultsDiv = document.getElementById('delzone-results');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>正在删除中...';

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
      const res = await fetch('/api/zones/batch-delete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': state.token || localStorage.getItem('token') 
        },
        body: JSON.stringify({ accountId, domains })
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
                    ? '<span class="badge bg-success-lt text-success fw-bold">成功</span>' 
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
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg> 立即批量删除';
    }
  }
}
