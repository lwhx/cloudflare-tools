export class CopyRulesModule {
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
            <div class="page-pretitle text-muted">Rules Management</div>
            <h2 class="page-title fw-bold">批量复制规则 (Copy Rules)</h2>
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
                <select id="copy-account" class="form-select border-2 shadow-none">
                  ${(accounts || []).map(a => `<option value="${a.id}">${a.name} (${a.email})</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">源域名 <span class="badge bg-blue-lt">复制规则来源</span></label>
                <input type="text" id="copy-source" class="form-control border-2 shadow-none" placeholder="example.com">
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">目标域名列表 <span class="badge bg-blue-lt">每行一个</span></label>
                <textarea id="copy-targets" class="form-control border-2 shadow-none font-monospace" rows="6" placeholder="target1.com\ntarget2.com\ntarget3.com"></textarea>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">选择要复制的规则类型</label>
                <div class="form-check mb-2">
                  <input class="form-check-input" type="checkbox" id="rule-page" value="page_rules" checked>
                  <label class="form-check-label" for="rule-page">
                    页面规则 (Page Rules)
                  </label>
                </div>
                <div class="form-check mb-2">
                  <input class="form-check-input" type="checkbox" id="rule-firewall" value="firewall_rules" checked>
                  <label class="form-check-label" for="rule-firewall">
                    防火墙规则 (Firewall Rules)
                  </label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="rule-rate" value="rate_limiting" checked>
                  <label class="form-check-label" for="rule-rate">
                    速率限制 (Rate Limiting)
                  </label>
                </div>
              </div>
              <div class="form-footer mt-4">
                <button id="btn-copy-rules" class="btn btn-primary w-100 py-2 fw-bold shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /></svg>
                  立即批量复制
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-7">
          <div class="card border-0 shadow-sm rounded-3 h-100">
            <div class="card-body">
              <h3 class="card-title fw-bold border-bottom pb-2">复制结果反馈</h3>
              <div id="copy-results" class="table-responsive mt-2">
                <div class="text-center py-6 text-muted border-0">配置左侧信息后点击开始，结果将显示在此处</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-copy-rules').addEventListener('click', () => this.copyRules(state));
  }

  static async copyRules(state) {
    const accountId = document.getElementById('copy-account').value;
    const sourceDomain = document.getElementById('copy-source').value.trim();
    const targetsText = document.getElementById('copy-targets').value || '';

    if (!accountId) return alert('请选择操作账号');
    if (!sourceDomain) return alert('请输入源域名');
    if (!targetsText.trim()) return alert('请输入目标域名列表');

    const ruleTypes = [];
    if (document.getElementById('rule-page').checked) ruleTypes.push('page_rules');
    if (document.getElementById('rule-firewall').checked) ruleTypes.push('firewall_rules');
    if (document.getElementById('rule-rate').checked) ruleTypes.push('rate_limiting');

    if (ruleTypes.length === 0) return alert('请至少选择一种规则类型');

    const targetDomains = targetsText.split('\n').map(d => d.trim()).filter(d => d.length > 0);
    if (targetDomains.length === 0) return alert('目标域名列表为空');

    const btn = document.getElementById('btn-copy-rules');
    const resultsDiv = document.getElementById('copy-results');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>正在复制中...';

    resultsDiv.innerHTML = `
      <table class="table table-vcenter card-table table-hover">
        <thead class="bg-light">
          <tr><th>目标域名</th><th>状态</th><th>复制数量</th></tr>
        </thead>
        <tbody>
          ${targetDomains.map(d => `<tr><td>${d}</td><td><span class="badge bg-secondary-lt text-dark">队列中</span></td><td>-</td></tr>`).join('')}
        </tbody>
      </table>
    `;

    try {
      const res = await fetch('/api/rules/batch-copy', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': state.token || localStorage.getItem('token') 
        },
        body: JSON.stringify({ 
          accountId, 
          sourceDomain, 
          targetDomains, 
          ruleTypes 
        })
      });

      const data = await res.json();

      resultsDiv.innerHTML = `
        <table class="table table-vcenter card-table table-hover">
          <thead class="bg-light">
            <tr><th>目标域名</th><th>状态</th><th>复制数量</th></tr>
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
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /></svg> 立即批量复制';
    }
  }
}
