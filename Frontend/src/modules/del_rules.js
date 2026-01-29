export class DelRulesModule {
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
            <h2 class="page-title fw-bold">批量删除规则 (Delete Rules)</h2>
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
                <select id="delrule-account" class="form-select border-2 shadow-none">
                  ${(accounts || []).map(a => `<option value="${a.id}">${a.name} (${a.email})</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">输入域名列表 <span class="badge bg-blue-lt">每行一个</span></label>
                <textarea id="delrule-domains" class="form-control border-2 shadow-none font-monospace" rows="8" placeholder="example.com\nexample.net\nexample.org"></textarea>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">选择要删除的规则类型</label>
                <div class="form-check mb-2">
                  <input class="form-check-input" type="checkbox" id="delrule-page" value="page_rules" checked>
                  <label class="form-check-label" for="delrule-page">
                    页面规则 (Page Rules)
                  </label>
                </div>
                <div class="form-check mb-2">
                  <input class="form-check-input" type="checkbox" id="delrule-firewall" value="firewall_rules" checked>
                  <label class="form-check-label" for="delrule-firewall">
                    防火墙规则 (Firewall Rules)
                  </label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="delrule-rate" value="rate_limiting" checked>
                  <label class="form-check-label" for="delrule-rate">
                    速率限制 (Rate Limiting)
                  </label>
                </div>
              </div>
              <div class="alert alert-danger border-0 py-2 px-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon alert-icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 9v4" /><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z" /><path d="M12 16h.01" /></svg>
                <span class="small fw-bold">警告：删除规则后无法恢复，请谨慎操作！</span>
              </div>
              <div class="form-footer mt-4">
                <button id="btn-delete-rules" class="btn btn-danger w-100 py-2 fw-bold shadow-sm">
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
              <div id="delrule-results" class="table-responsive mt-2">
                <div class="text-center py-6 text-muted border-0">配置左侧信息后点击开始，结果将显示在此处</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-delete-rules').addEventListener('click', () => this.deleteRules(state));
  }

  static async deleteRules(state) {
    const accountId = document.getElementById('delrule-account').value;
    const domainsText = document.getElementById('delrule-domains').value || '';

    if (!accountId) return alert('请选择操作账号');
    if (!domainsText.trim()) return alert('请输入域名列表');

    const ruleTypes = [];
    if (document.getElementById('delrule-page').checked) ruleTypes.push('page_rules');
    if (document.getElementById('delrule-firewall').checked) ruleTypes.push('firewall_rules');
    if (document.getElementById('delrule-rate').checked) ruleTypes.push('rate_limiting');

    if (ruleTypes.length === 0) return alert('请至少选择一种规则类型');

    const domains = domainsText.split('\n').map(d => d.trim()).filter(d => d.length > 0);
    if (domains.length === 0) return alert('域名列表为空');

    if (!confirm(`确定要删除 ${domains.length} 个域名的规则吗？此操作不可撤销！`)) return;

    const btn = document.getElementById('btn-delete-rules');
    const resultsDiv = document.getElementById('delrule-results');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>正在删除中...';

    resultsDiv.innerHTML = `
      <table class="table table-vcenter card-table table-hover">
        <thead class="bg-light">
          <tr><th>域名</th><th>状态</th><th>删除数量</th></tr>
        </thead>
        <tbody>
          ${domains.map(d => `<tr><td>${d}</td><td><span class="badge bg-secondary-lt text-dark">队列中</span></td><td>-</td></tr>`).join('')}
        </tbody>
      </table>
    `;

    try {
      const res = await fetch('/api/rules/batch-delete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': state.token || localStorage.getItem('token') 
        },
        body: JSON.stringify({ 
          accountId, 
          domains, 
          ruleTypes 
        })
      });

      const data = await res.json();

      resultsDiv.innerHTML = `
        <table class="table table-vcenter card-table table-hover">
          <thead class="bg-light">
            <tr><th>域名</th><th>状态</th><th>删除数量</th></tr>
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
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg> 立即批量删除';
    }
  }
}
