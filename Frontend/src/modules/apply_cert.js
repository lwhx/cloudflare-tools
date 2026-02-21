export class ApplyCertModule {
  static async render(container, state) {
    const res = await fetch('/api/accounts', { headers: { 'Authorization': state.token || localStorage.getItem('token') } });
    if (!res.ok) {
      window.logout();
      return;
    }
    const accounts = await res.json() || [];

    const certsRes = await fetch('/api/certs/list', { headers: { 'Authorization': state.token || localStorage.getItem('token') } });
    const existingCerts = certsRes.ok ? (await certsRes.json() || []) : [];

    container.innerHTML = `
      <div class="page-header d-print-none mb-3">
        <div class="row align-items-center">
          <div class="col">
            <div class="page-pretitle text-muted">SSL Certificate</div>
            <h2 class="page-title fw-bold">一键申请免费证书 (Let's Encrypt)</h2>
          </div>
        </div>
      </div>
      <div class="row row-cards">
        <div class="col-md-5">
          <div class="card border-0 shadow-sm rounded-3 h-100">
            <div class="card-body">
              <h3 class="card-title fw-bold border-bottom pb-2">申请配置</h3>
              <div class="mb-3">
                <label class="form-label fw-bold">选择 Cloudflare 账号</label>
                <select id="cert-account" class="form-select border-2 shadow-none">
                  ${(accounts || []).map(a => `<option value="${a.id}">${a.name} (${a.email})</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">输入域名列表 <span class="badge bg-blue-lt">每行一个</span></label>
                <textarea id="cert-domains" class="form-control border-2 shadow-none font-monospace" rows="8" placeholder="example.com\nexample.net\nexample.org"></textarea>
              </div>
              <div class="mb-3">
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="cert-wildcard" checked>
                  <label class="form-check-label fw-bold" for="cert-wildcard">
                    同时申请通配符证书 (*.domain.com)
                  </label>
                </div>
                <small class="text-muted">勾选后将同时申请主域名和通配符证书</small>
              </div>
              <div class="alert alert-info bg-azure-lt border-0 mb-3">
                <div class="d-flex align-items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon alert-icon me-2" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 9h.01" /><path d="M11 12h1v4h1" /></svg>
                  <div class="small">
                    <div class="fw-bold mb-1">证书说明</div>
                    <div>• 使用 Let's Encrypt 免费证书</div>
                    <div>• 有效期 90 天，需定期续期</div>
                    <div>• 通过 Cloudflare DNS 自动验证</div>
                    <div>• 证书文件将打包为 ZIP 下载</div>
                  </div>
                </div>
              </div>
              <div class="form-footer mt-4">
                <button id="btn-apply-cert" class="btn btn-primary w-100 py-2 fw-bold shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" /><path d="M9 12l2 2l4 -4" /></svg>
                  立即申请证书
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-7">
          <div class="card border-0 shadow-sm rounded-3 mb-3">
            <div class="card-body">
              <h3 class="card-title fw-bold border-bottom pb-2">申请结果</h3>
              <div id="cert-results" class="table-responsive mt-2">
                <div class="text-center py-6 text-muted border-0">配置左侧信息后点击开始，结果将显示在此处</div>
              </div>
            </div>
          </div>
          ${existingCerts.length > 0 ? `
          <div class="card border-0 shadow-sm rounded-3">
            <div class="card-body">
              <h3 class="card-title fw-bold border-bottom pb-2">已申请证书</h3>
              <div class="table-responsive mt-2">
                <table class="table table-vcenter card-table table-hover mb-0">
                  <thead class="bg-light">
                    <tr>
                      <th>域名</th>
                      <th>修改时间</th>
                      <th>大小</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${existingCerts.map(cert => `
                      <tr class="bg-white">
                        <td><div class="fw-bold text-dark">${cert.domain}</div></td>
                        <td class="text-muted small">${cert.modifiedAt}</td>
                        <td class="text-muted small">${(cert.size / 1024).toFixed(2)} KB</td>
                        <td>
                          <a href="${cert.downloadUrl}" class="btn btn-sm btn-primary" download>
                            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-sm" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>
                            下载
                          </a>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    `;

    document.getElementById('btn-apply-cert').addEventListener('click', () => this.applyCert(state));
  }

  static async applyCert(state) {
    const accountId = document.getElementById('cert-account').value;
    const domainsText = document.getElementById('cert-domains').value || '';
    const includeWildcard = document.getElementById('cert-wildcard').checked;

    if (!accountId) return alert('请选择操作账号');
    if (!domainsText.trim()) return alert('请输入域名列表');

    const domains = domainsText.split('\n').map(d => d.trim()).filter(d => d.length > 0);
    if (domains.length === 0) return alert('域名列表为空');

    const btn = document.getElementById('btn-apply-cert');
    const resultsDiv = document.getElementById('cert-results');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>正在申请中（可能需要几分钟）...';

    resultsDiv.innerHTML = `
      <table class="table table-vcenter card-table table-hover">
        <thead class="bg-light">
          <tr><th>域名</th><th>状态</th><th>操作</th></tr>
        </thead>
        <tbody>
          ${domains.map(d => `<tr><td>${d}${includeWildcard ? ' + *.' + d : ''}</td><td><span class="badge bg-secondary-lt text-dark">队列中</span></td><td>-</td></tr>`).join('')}
        </tbody>
      </table>
    `;

    try {
      const res = await fetch('/api/certs/batch-apply', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': state.token || localStorage.getItem('token') 
        },
        body: JSON.stringify({ 
          accountId, 
          domains, 
          includeWildcard 
        })
      });

      const data = await res.json();

      resultsDiv.innerHTML = `
        <table class="table table-vcenter card-table">
          <thead class="bg-light">
            <tr><th>域名</th><th>状态</th><th>详细步骤</th><th>操作</th></tr>
          </thead>
          <tbody>
            ${data.map(r => `
              <tr class="bg-white">
                <td><div class="fw-bold text-dark">${r.domain}${includeWildcard ? ' + *.' + r.domain : ''}</div></td>
                <td>
                  ${r.success 
                    ? `<span class="badge bg-success-lt text-success fw-bold">✓ 成功</span>` 
                    : `<span class="badge bg-danger-lt text-danger fw-bold">✗ 失败</span>`
                  }
                  <div class="small text-muted mt-1">${r.message}</div>
                </td>
                <td>
                  <div class="small" style="max-height: 150px; overflow-y: auto;">
                    ${(r.steps || []).map(step => {
                      const isError = step.startsWith('✗') || step.startsWith('错误');
                      const isSuccess = step.startsWith('✓');
                      const isProgress = step.startsWith('→');
                      let color = 'text-muted';
                      if (isError) color = 'text-danger';
                      if (isSuccess) color = 'text-success';
                      if (isProgress) color = 'text-info';
                      return `<div class="${color}">${step}</div>`;
                    }).join('')}
                  </div>
                </td>
                <td>
                  ${r.success && r.downloadUrl 
                    ? `<a href="${r.downloadUrl}" class="btn btn-sm btn-primary" download>
                        <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-sm" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>
                        下载
                      </a>` 
                    : '-'
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      const successCount = data.filter(r => r.success).length;
      if (successCount > 0) {
        setTimeout(() => {
          this.render(document.getElementById('module-container'), state);
        }, 1000);
      }
    } catch (e) {
      console.error(e);
      alert('提交请求发生错误');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" /><path d="M9 12l2 2l4 -4" /></svg> 立即申请证书';
    }
  }
}
