export class AddZoneModule {
  static render(container, state) {
    container.innerHTML = `
      <div class="page-header d-print-none mb-3">
        <div class="row align-items-center">
          <div class="col">
            <div class="page-pretitle text-muted">Core Function</div>
            <h2 class="page-title fw-bold">批量添加域名 (Batch Add Zones)</h2>
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
                <select id="zone-acc-id" class="form-select border-2 shadow-none">
                  ${(window.accountsCache || []).map(a => `<option value="${a.id}">${a.name} (${a.email})</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">输入域名列表 <span class="badge bg-blue-lt">每行一个</span></label>
                <textarea id="zone-domains" class="form-control border-2 shadow-none" rows="12" placeholder="example.com\nexample.net\nexample.org"></textarea>
              </div>
              <div class="form-footer mt-4">
                <button id="btn-batch-add" class="btn btn-primary w-100 py-2 fw-bold shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-rocket" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 13a8 8 0 0 1 7 7a6 6 0 0 0 3 -5a9 9 0 0 0 6 -8a3 3 0 0 0 -3 -3a9 9 0 0 0 -8 6a6 6 0 0 0 -5 3" /><path d="M7 14a6 6 0 0 0 -3 6a6 6 0 0 0 6 -3" /><path d="M15 9m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /></svg>
                  立即批量添加
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-7">
          <div class="card border-0 shadow-sm rounded-3 h-100">
            <div class="card-body">
              <h3 class="card-title fw-bold border-bottom pb-2">添加结果反馈</h3>
              <div id="zone-results" class="table-responsive mt-2">
                <div class="text-center py-6 text-muted border-0">配置左侧信息后点击开始，结果将显示在此处</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind event listener properly without polluting window object
    document.getElementById('btn-batch-add').addEventListener('click', () => this.batchAddZones(state));
  }

  static async batchAddZones(state) {
    const accId = document.getElementById('zone-acc-id').value;
    const domainsText = document.getElementById('zone-domains').value || '';

    if (!accId || !domainsText.trim()) return alert('请选择账号并输入域名列表');

    console.log('Raw input:', JSON.stringify(domainsText));

    let domains = domainsText.split('\n').map(d => d.trim()).filter(d => d.length > 0);
    domains = [...new Set(domains)];

    console.log('Final parsed domains:', domains);
    if (domains.length === 0) return alert('域名列表为空或格式不正确');

    const btn = document.getElementById('btn-batch-add');
    const resultsDiv = document.getElementById('zone-results');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>正在并发请求中...';
    resultsDiv.innerHTML = `
      <table class="table table-vcenter card-table table-hover">
        <thead class="bg-light">
          <tr><th>域名</th><th>状态</th><th>NS 信息</th></tr>
        </thead>
        <tbody>
          ${domains.map(d => `<tr><td>${d}</td><td><span class="badge bg-secondary-lt text-dark">队列中</span></td><td>-</td></tr>`).join('')}
        </tbody>
      </table>
    `;

    try {
      const res = await fetch('/api/zones/batch-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': state.token || localStorage.getItem('token') },
        body: JSON.stringify({ accountId: accId, domains })
      });
      const data = await res.json();

      resultsDiv.innerHTML = `
        <table class="table table-vcenter card-table table-hover">
          <thead class="bg-light">
            <tr><th>域名</th><th>状态</th><th>NS 信息</th></tr>
          </thead>
          <tbody>
            ${data.map(r => `
              <tr class="bg-white">
                <td><div class="fw-bold text-dark">${r.domain}</div></td>
                <td>${r.success ? '<span class="badge bg-success-lt text-success fw-bold">成功</span>' : '<span class="badge bg-danger-lt text-danger fw-bold">失败</span>'}</td>
                <td>
                  ${r.success && r.nameServers ? r.nameServers.map(ns => `<div class="small text-muted font-monospace">${ns}</div>`).join('') : `<span class="text-danger small">${r.message}</span>`}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (e) {
      console.error(e);
      alert('提交请求发生错误，请看控制台');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-rocket" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 13a8 8 0 0 1 7 7a6 6 0 0 0 3 -5a9 9 0 0 0 6 -8a3 3 0 0 0 -3 -3a9 9 0 0 0 -8 6a6 6 0 0 0 -5 3" /><path d="M7 14a6 6 0 0 0 -3 6a6 6 0 0 0 6 -3" /><path d="M15 9m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /></svg> 立即批量添加';
    }
  }
}
