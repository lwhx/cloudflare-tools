export class ExportZonesModule {
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
            <h2 class="page-title fw-bold">批量导出域名 (Export Zones)</h2>
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
                <select id="export-account" class="form-select border-2 shadow-none">
                  ${(accounts || []).map(a => `<option value="${a.id}">${a.name} (${a.email})</option>`).join('')}
                </select>
              </div>
              <div class="form-footer mt-4">
                <button id="btn-export-zones" class="btn btn-primary w-100 py-2 fw-bold shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M12 11v6" /><path d="M9 14l3 3l3 -3" /></svg>
                  开始导出域名
                </button>
              </div>
              <div id="export-actions" class="mt-3" style="display: none;">
                <button id="btn-copy-zones" class="btn btn-outline-primary w-100 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2" /><path d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" /></svg>
                  复制域名列表
                </button>
                <button id="btn-download-txt" class="btn btn-outline-secondary w-100">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>
                  下载为 TXT
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-7">
          <div class="card border-0 shadow-sm rounded-3 h-100">
            <div class="card-body">
              <h3 class="card-title fw-bold border-bottom pb-2">域名列表</h3>
              <div id="export-results" class="table-responsive mt-2">
                <div class="text-center py-6 text-muted border-0">选择账号后点击开始导出</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-export-zones').addEventListener('click', () => this.exportZones(state));
  }

  static async exportZones(state) {
    const accountId = document.getElementById('export-account').value;

    if (!accountId) return alert('请选择操作账号');

    const btn = document.getElementById('btn-export-zones');
    const resultsDiv = document.getElementById('export-results');
    const actionsDiv = document.getElementById('export-actions');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>正在导出中...';
    actionsDiv.style.display = 'none';

    try {
      const res = await fetch('/api/zones/export', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': state.token || localStorage.getItem('token') 
        },
        body: JSON.stringify({ accountId })
      });

      const data = await res.json();

      if (data.length === 0) {
        resultsDiv.innerHTML = '<div class="text-center py-6 text-muted">该账号下没有域名</div>';
        return;
      }

      window.exportedZones = data;

      resultsDiv.innerHTML = `
        <div class="mb-2 text-muted small">共 ${data.length} 个域名</div>
        <table class="table table-vcenter card-table table-hover">
          <thead class="bg-light">
            <tr><th>域名</th><th>状态</th><th>NS 服务器</th></tr>
          </thead>
          <tbody>
            ${data.map(z => `
              <tr class="bg-white">
                <td><div class="fw-bold text-dark">${z.domain}</div></td>
                <td>
                  ${z.status === 'active' 
                    ? '<span class="badge bg-success-lt text-success">Active</span>' 
                    : `<span class="badge bg-warning-lt text-warning">${z.status}</span>`
                  }
                </td>
                <td>
                  ${z.nameServers && z.nameServers.length > 0 
                    ? z.nameServers.map(ns => `<div class="small text-muted font-monospace">${ns}</div>`).join('') 
                    : '<span class="text-muted small">-</span>'
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      actionsDiv.style.display = 'block';

      document.getElementById('btn-copy-zones').addEventListener('click', () => this.copyZones());
      document.getElementById('btn-download-txt').addEventListener('click', () => this.downloadTxt());

    } catch (e) {
      console.error(e);
      alert('导出请求发生错误');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M12 11v6" /><path d="M9 14l3 3l3 -3" /></svg> 开始导出域名';
    }
  }

  static copyZones() {
    if (!window.exportedZones || window.exportedZones.length === 0) return;

    const text = window.exportedZones.map(z => z.domain).join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      alert(`已复制 ${window.exportedZones.length} 个域名到剪贴板`);
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert(`已复制 ${window.exportedZones.length} 个域名到剪贴板`);
    });
  }

  static downloadTxt() {
    if (!window.exportedZones || window.exportedZones.length === 0) return;

    const text = window.exportedZones.map(z => z.domain).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cloudflare-zones-${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
