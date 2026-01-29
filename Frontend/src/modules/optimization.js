export class OptimizationModule {
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
            <div class="page-pretitle text-muted">Performance Optimization</div>
            <h2 class="page-title fw-bold">批量代码压缩网络优化 (Optimization)</h2>
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
                <select id="opt-account" class="form-select border-2 shadow-none">
                  ${(accounts || []).map(a => `<option value="${a.id}">${a.name} (${a.email})</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">输入域名列表 <span class="badge bg-blue-lt">每行一个</span></label>
                <textarea id="opt-domains" class="form-control border-2 shadow-none font-monospace" rows="5" placeholder="example.com\nexample.net\nexample.org"></textarea>
              </div>
              
              <h4 class="fw-bold mt-4 mb-3 text-primary">代码压缩</h4>
              <div class="mb-3">
                <label class="form-label fw-bold">自动压缩 (Minify)</label>
                <select id="opt-minify" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="all">全部压缩 (HTML+CSS+JS)</option>
                  <option value="css">仅 CSS</option>
                  <option value="html">仅 HTML</option>
                  <option value="js">仅 JavaScript</option>
                  <option value="off">关闭</option>
                </select>
                <small class="text-muted">自动压缩 HTML、CSS、JavaScript 代码</small>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">Brotli 压缩</label>
                <select id="opt-brotli" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
                <small class="text-muted">比 Gzip 更高效的压缩算法</small>
              </div>

              <h4 class="fw-bold mt-4 mb-3 text-primary">网络协议</h4>
              <div class="mb-3">
                <label class="form-label fw-bold">HTTP/2</label>
                <select id="opt-http2" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">HTTP/3 (QUIC)</label>
                <select id="opt-http3" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">0-RTT 连接恢复</label>
                <select id="opt-0rtt" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
                <small class="text-muted">加速重复访问者的连接速度</small>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">IPv6 兼容性</label>
                <select id="opt-ipv6" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">WebSockets</label>
                <select id="opt-websockets" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">Pseudo IPv4</label>
                <select id="opt-pseudo-ipv4" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="off">关闭</option>
                  <option value="add_header">添加标头</option>
                  <option value="overwrite_header">覆盖标头</option>
                </select>
                <small class="text-muted">为仅支持 IPv4 的应用添加 IPv4 标头</small>
              </div>

              <h4 class="fw-bold mt-4 mb-3 text-primary">性能增强</h4>
              <div class="mb-3">
                <label class="form-label fw-bold">Early Hints</label>
                <select id="opt-early-hints" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
                <small class="text-muted">提前发送资源提示,加速页面加载</small>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">Rocket Loader</label>
                <select id="opt-rocket-loader" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
                <small class="text-muted">异步加载 JavaScript,优先显示内容</small>
              </div>

              <h4 class="fw-bold mt-4 mb-3 text-primary">图像优化</h4>
              <div class="mb-3">
                <label class="form-label fw-bold">Mirage (图像延迟加载)</label>
                <select id="opt-mirage" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
                <small class="text-muted">自动延迟加载图像</small>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">Polish (图像压缩)</label>
                <select id="opt-polish" class="form-select border-2 shadow-none">
                  <option value="">不修改</option>
                  <option value="off">关闭</option>
                  <option value="lossless">无损压缩</option>
                  <option value="lossy">有损压缩</option>
                </select>
                <small class="text-muted">自动优化图像大小</small>
              </div>

              <div class="form-footer mt-4">
                <button id="btn-apply-opt" class="btn btn-primary w-100 py-2 fw-bold shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 3a9 9 0 1 0 9 9" /><path d="M17 4v4h-4" /><path d="M19.9 7.5l-4.9 4.5" /></svg>
                  立即批量应用
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-7">
          <div class="card border-0 shadow-sm rounded-3 h-100">
            <div class="card-body">
              <h3 class="card-title fw-bold border-bottom pb-2">优化结果反馈</h3>
              <div id="opt-results" class="table-responsive mt-2">
                <div class="text-center py-6 text-muted border-0">配置左侧信息后点击开始，结果将显示在此处</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-apply-opt').addEventListener('click', () => this.applyOptimization(state));
  }

  static async applyOptimization(state) {
    const accountId = document.getElementById('opt-account').value;
    const domainsText = document.getElementById('opt-domains').value || '';
    const minify = document.getElementById('opt-minify').value;
    const brotli = document.getElementById('opt-brotli').value;
    const earlyHints = document.getElementById('opt-early-hints').value;
    const http2 = document.getElementById('opt-http2').value;
    const http3 = document.getElementById('opt-http3').value;
    const zeroRtt = document.getElementById('opt-0rtt').value;
    const ipv6 = document.getElementById('opt-ipv6').value;
    const webSockets = document.getElementById('opt-websockets').value;
    const pseudoIpv4 = document.getElementById('opt-pseudo-ipv4').value;
    const rocketLoader = document.getElementById('opt-rocket-loader').value;
    const mirage = document.getElementById('opt-mirage').value;
    const polish = document.getElementById('opt-polish').value;

    if (!accountId) return alert('请选择操作账号');
    if (!domainsText.trim()) return alert('请输入域名列表');

    if (!minify && !brotli && !earlyHints && !http2 && !http3 && !zeroRtt && 
        !ipv6 && !webSockets && !pseudoIpv4 && !rocketLoader && !mirage && !polish) {
      return alert('请至少选择一项要修改的设置');
    }

    const domains = domainsText.split('\n').map(d => d.trim()).filter(d => d.length > 0);
    if (domains.length === 0) return alert('域名列表为空');

    const btn = document.getElementById('btn-apply-opt');
    const resultsDiv = document.getElementById('opt-results');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>正在优化中...';

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
      const res = await fetch('/api/optimization/batch-settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': state.token || localStorage.getItem('token') 
        },
        body: JSON.stringify({ 
          accountId, 
          domains, 
          minify,
          brotli,
          earlyHints,
          http2,
          http3,
          zeroRtt,
          ipv6,
          webSockets,
          pseudoIpv4,
          rocketLoader,
          mirage,
          polish
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
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 3a9 9 0 1 0 9 9" /><path d="M17 4v4h-4" /><path d="M19.9 7.5l-4.9 4.5" /></svg> 立即批量应用';
    }
  }
}
