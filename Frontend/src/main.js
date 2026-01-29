import "@tabler/core/dist/js/tabler.min.js";
import { AccountsModule } from "./modules/accounts.js";
import { AddZoneModule } from "./modules/add_zone.js";
import { DNSRecordsModule } from "./modules/dns_records.js";
import { DelDNSModule } from "./modules/del_dns.js";
import { ProxyToggleModule } from "./modules/proxy_toggle.js";
import { DelZoneModule } from "./modules/del_zone.js";
import { ExportZonesModule } from "./modules/export_zones.js";
import { SSLSettingsModule } from "./modules/ssl_settings.js";
import { CopyRulesModule } from "./modules/copy_rules.js";
import { DelRulesModule } from "./modules/del_rules.js";
import { CacheSettingsModule } from "./modules/cache_settings.js";
import { OptimizationModule } from "./modules/optimization.js";
import { BulkSettingsModule } from "./modules/bulk_settings.js";

window.AccountsModule = AccountsModule;

const app = document.getElementById('app');

window.handleAuthError = function(response) {
  if (response.status === 401) {
    localStorage.removeItem('token');
    state.token = null;
    alert('登录已过期，请重新登录');
    render();
    return true;
  }
  return false;
};

// Global Error Handler for debugging "Empty Page" issues
window.onerror = function (msg, url, line, col, error) {
  document.body.innerHTML += `
    <div style="position:fixed;top:0;left:0;width:100%;background:red;color:white;padding:20px;z-index:9999;">
      <h3>Frontend Error</h3>
      <p>${msg}</p>
      <p>@ ${url}:${line}:${col}</p>
      <pre>${error?.stack}</pre>
    </div>
  `;
};

const state = {
  token: localStorage.getItem('token'),
  currentModule: 'accounts',
  editingId: null
};

const menuGroups = [
  {
    name: '域名解析',
    items: [
      { id: 'add-zone', name: '批量增域', full: 'CloudFlare 批量添加域名(Zone)', desc: '将域名解析权转移到CloudFlare，需要在域名注册商处更改域名NS为CloudFlare的NS' },
      { id: 'dns-records', name: '批量解析', full: 'CloudFlare 域名批量解析', desc: '批量添加或修改CloudFlare中域名的解析值，支持每个域名解析到不同的IP' },
      { id: 'del-dns', name: '解析删除', full: 'CloudFlare 批量删除解析记录', desc: '将你选择或输入的域名批量删除某个解析记录，支持清空选中域名的所有解析记录' },
      { id: 'proxy-toggle', name: '代理开关', full: 'CloudFlare 批量开关代理', desc: '将域名解析值中的代理加速开启或关闭，开启代理后将获得CDN缓存功能' },
      { id: 'del-zone', name: '批量删域', full: 'CloudFlare 批量删除域名(Zone)', desc: '将CloudFlare域名列表中的某些域名删除' },
      { id: 'export-zones', name: '域名导出', full: '批量导出域名', desc: '批量查看或导出您在CloudFlare中的域名' }
    ]
  },
  {
    name: '安全规则',
    items: [
      { id: 'ssl-settings', name: 'SSL/HTTPS', full: 'CloudFlare HTTPS边缘证书批量设置', desc: '设置网址的HTTPS加密模式, TLS版本, 自动重定向到HTTPS等' },
      { id: 'copy-rules', name: '规则复制', full: 'CloudFlare 批量复制规则,WAF规则', desc: 'Configuration Rules, 转换规则, 重写URL, 修改请求头, 响应头, WAF自定义规则等' },
      { id: 'del-rules', name: '规则清除', full: 'CloudFlare 批量删除页面规则', desc: '批量清空各种规则, 转换规则, 重写URL, 修改请求/响应头, WAF自定义规则等' }
    ]
  },
  {
    name: '高级设置',
    items: [
      { id: 'cache-settings', name: '缓存管理', full: 'CloudFlare 批量清除缓存 缓存设置', desc: '清除域名缓存 设置缓存级别 Always Online等功能' },
      { id: 'optimization', name: '性能优化', full: 'CloudFlare 批量代码压缩网络优化', desc: '压缩HTML,JS,CSS代码, Brotli 压缩, 图像压缩, 资源预加载...' },
      { id: 'bulk-settings', name: '批量配置', full: 'CloudFlare 批量修改设置项', desc: 'CloudFlare在线批量修改网站设置项, Crawler Hints 等设置...' }
    ]
  }
];

const allModules = menuGroups.flatMap(g => g.items);

function setModule(modId) {
  state.currentModule = modId;
  window.location.hash = '/' + modId; // Update URL Hash
  const navbarCollapse = document.getElementById('navbar-menu');
  if (navbarCollapse && navbarCollapse.classList.contains('show')) {
    const bsCollapse = window.bootstrap?.Collapse?.getInstance(navbarCollapse);
    if (bsCollapse) bsCollapse.hide();
  }
  render();
}

// Handle Hash Change for Routing
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(2); // Remove #/
  if (hash && hash !== state.currentModule) {
    if (allModules.find(m => m.id === hash) || hash === 'accounts') {
      state.currentModule = hash;
      render();
    }
  }
});

// Initial Load from Hash
window.addEventListener('load', () => {
  const hash = window.location.hash.slice(2);
  if (hash && (allModules.find(m => m.id === hash) || hash === 'accounts')) {
    state.currentModule = hash;
  }
  render();
});

async function handleLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;
  
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>登录中...';
  
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: e.target.username.value.trim(), 
        password: e.target.password.value 
      })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      localStorage.setItem('token', data.token);
      state.token = data.token;
      state.currentModule = 'accounts';
      render();
    } else {
      let errorMsg = data.error || '登录失败';
      
      if (data.remaining_attempts !== undefined) {
        errorMsg += `\n剩余尝试次数: ${data.remaining_attempts}`;
      }
      
      if (data.locked_minutes !== undefined) {
        errorMsg = `账户已锁定，请 ${data.locked_minutes} 分钟后再试`;
      }
      
      alert(errorMsg);
      e.target.password.value = '';
      e.target.password.focus();
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('网络错误，请检查服务器连接');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

function logout() {
  localStorage.removeItem('token');
  state.token = null;
  render();
}

function renderLogin() {
  app.innerHTML = `
    <div class="page page-center" style="min-height: 100vh; display: flex; align-items: center; justify-content: center;">
      <div class="container container-tight">
        <div class="text-center mb-4">
          <a href="." class="navbar-brand navbar-brand-autodark"><h1 class="fw-bold text-primary">CF TOOLS</h1></a>
        </div>
        <div class="card card-md shadow-lg border-0">
          <div class="card-body">
            <h2 class="card-title text-center mb-4">管理后台登录</h2>
            <form id="login-form">
              <div class="mb-3"><label class="form-label">用户名</label><input type="text" name="username" class="form-control" autocomplete="off" required></div>
              <div class="mb-3"><label class="form-label">密码</label><input type="password" name="password" class="form-control" autocomplete="off" required></div>
              <div class="form-footer"><button type="submit" class="btn btn-primary w-100 py-2 fw-bold">登 录</button></div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('login-form').addEventListener('submit', handleLogin);
}

function renderHeader() {
  const isInGroup = (groupItems) => groupItems.some(item => item.id === state.currentModule);
  
  return `
    <header class="navbar navbar-expand-md navbar-light bg-white d-print-none sticky-top border-bottom py-2">
      <div class="container-xl">
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbar-menu">
          <span class="navbar-toggler-icon"></span>
        </button>
        <h1 class="navbar-brand navbar-brand-autodark d-none-navbar-horizontal pe-0 pe-md-3">
          <a href="#" onclick="window.setModule('accounts')" class="text-decoration-none d-flex align-items-center">
            <span class="text-primary fw-bold me-1">CF</span> TOOLS
          </a>
        </h1>
        <div class="navbar-nav flex-row order-md-last">
          <div class="nav-item">
            <a href="#" class="btn btn-outline-danger btn-sm px-3" onclick="window.logout()">
              <svg xmlns="http://www.w3.org/2000/svg" class="icon me-1" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" /><path d="M9 12h12l-3 -3" /><path d="M18 15l3 -3" /></svg>
              退出
            </a>
          </div>
        </div>
        <div class="collapse navbar-collapse" id="navbar-menu">
          <ul class="navbar-nav">
            <li class="nav-item ${state.currentModule === 'accounts' ? 'active' : ''}">
              <a class="nav-link fw-bold px-3" href="#" onclick="window.setModule('accounts')">账号管理</a>
            </li>
            ${menuGroups.map(g => `
              <li class="nav-item dropdown px-1 ${isInGroup(g.items) ? 'active' : ''}">
                <a class="nav-link dropdown-toggle fw-bold ${isInGroup(g.items) ? 'active' : ''}" href="#" data-bs-toggle="dropdown" data-bs-auto-close="outside" role="button" aria-expanded="false" >
                  <span class="nav-link-title">${g.name}</span>
                </a>
                <div class="dropdown-menu dropdown-menu-arrow mt-2 shadow-sm">
                  ${g.items.map(m => `
                    <a class="dropdown-item ${state.currentModule === m.id ? 'active' : ''}" href="#" onclick="window.setModule('${m.id}')">${m.name}</a>
                  `).join('')}
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    </header>
  `;
}

function renderModuleContent() {
  const container = document.getElementById('module-container');
  const mod = allModules.find(m => m.id === state.currentModule);

  if (state.currentModule === 'accounts') {
    AccountsModule.render(container, state);
  } else if (state.currentModule === 'add-zone') {
    AddZoneModule.render(container, state);
  } else if (state.currentModule === 'dns-records') {
    DNSRecordsModule.render(container, state);
  } else if (state.currentModule === 'del-dns') {
    DelDNSModule.render(container, state);
  } else if (state.currentModule === 'proxy-toggle') {
    ProxyToggleModule.render(container, state);
  } else if (state.currentModule === 'del-zone') {
    DelZoneModule.render(container, state);
  } else if (state.currentModule === 'export-zones') {
    ExportZonesModule.render(container, state);
  } else if (state.currentModule === 'ssl-settings') {
    SSLSettingsModule.render(container, state);
  } else if (state.currentModule === 'copy-rules') {
    CopyRulesModule.render(container, state);
  } else if (state.currentModule === 'del-rules') {
    DelRulesModule.render(container, state);
  } else if (state.currentModule === 'cache-settings') {
    CacheSettingsModule.render(container, state);
  } else if (state.currentModule === 'optimization') {
    OptimizationModule.render(container, state);
  } else if (state.currentModule === 'bulk-settings') {
    BulkSettingsModule.render(container, state);
  } else {
    // Default module placeholder
    container.innerHTML = `
      <div class="page-header d-print-none mb-4"><h2 class="page-title fw-bold text-dark">${mod.name}</h2></div>
      <div class="card border-0 shadow-lg rounded-4 overflow-hidden">
        <div class="card-body py-6 px-4 bg-white text-center">
          <div class="mb-4 text-azure opacity-75">
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-rocket" width="70" height="70" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 13a8 8 0 0 1 7 7a6 6 0 0 0 3 -5a9 9 0 0 0 6 -8a3 3 0 0 0 -3 -3a9 9 0 0 0 -8 6a6 6 0 0 0 -5 3" /><path d="M7 14a6 6 0 0 0 -3 6a6 6 0 0 0 6 -3" /><path d="M15 9m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /></svg>
          </div>
          <h2 class="fw-bold mb-2">${mod.full}</h2>
          <p class="text-secondary mx-auto mb-4 lead" style="max-width: 500px;">${mod.desc}</p>
          <div class="alert alert-info bg-azure-lt border-0 d-inline-block px-5 py-2 fw-bold text-azure rounded-pill">功能正在火速接入中，请在账号管理处配置密钥...</div>
        </div>
      </div>
    `;
  }
}

async function renderDashboard() {
  app.innerHTML = `
    <div class="page bg-light">
      ${renderHeader()}
      <div class="page-wrapper">
        <div class="page-body">
          <div class="container-xl" id="module-container"></div>
        </div>
        <footer class="footer footer-transparent d-print-none">
          <div class="container-xl">
            <div class="row text-center align-items-center">
              <div class="col-12 col-lg-auto mt-3 mt-lg-0">
                <ul class="list-inline list-inline-dots mb-0">
                  <li class="list-inline-item">
                    <a href="https://github.com/xkatld/Cloudflare-Tools" target="_blank" class="link-secondary text-decoration-none">
                      © 2026 Cloudflare Tools
                    </a>
                  </li>
                </ul>
              </div>
              <div class="col-12 col-lg-auto ms-lg-auto mt-3 mt-lg-0">
                <a href="https://github.com/xkatld" target="_blank" class="link-secondary text-decoration-none d-flex align-items-center justify-content-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon me-2" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5"/>
                  </svg>
                  xkatld
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
    
    <div class="modal fade" id="modal-account" tabindex="-1" role="dialog" aria-hidden="true" data-bs-backdrop="static">
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content shadow-lg border-0 rounded-4">
          <div class="modal-header border-bottom-0 pb-0 px-4 pt-4">
            <h5 class="modal-title fw-bold h3" id="modal-title">添加 Cloudflare 账号</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body px-4 py-3">
            <div class="mb-4">
              <label class="form-label fw-bold mb-1">账号备注</label>
              <input type="text" id="acc-name" class="form-control form-control-lg border-2 shadow-none" placeholder="例如：我的主托管账号">
            </div>
            <div class="row">
              <div class="col-12 mb-3">
                <label class="form-label fw-bold mb-1">邮箱地址 (Email)</label>
                <input type="email" id="acc-email" class="form-control form-control-lg border-2 shadow-none" placeholder="user@example.com">
              </div>
              <div class="col-12 mb-2">
                <label class="form-label fw-bold mb-1">Global API Key</label>
                <input type="text" id="acc-key" class="form-control form-control-lg border-2 shadow-none" placeholder="输入 37 位 API 令牌">
              </div>
            </div>
            <div id="test-alert"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-link link-secondary fw-bold" data-bs-dismiss="modal" style="text-decoration: none;">取消操作</button>
            <button type="button" id="btn-test" class="btn btn-outline-primary ms-auto px-4" onclick="window.testAccount()">测试连接</button>
            <button type="button" class="btn btn-primary px-4" onclick="window.saveAccount()">保存账号</button>
          </div>
        </div>
      </div>
    </div>
  `;
  renderModuleContent();
}

// Global Exports
window.setModule = setModule;
window.logout = logout;

// Helpers for Accounts Module (keep global for now as Acc Module uses inline onclicks)
window.resetModal = () => {
  state.editingId = null;
  document.getElementById('modal-title').innerText = '添加 Cloudflare 账号';
  document.getElementById('acc-name').value = '';
  document.getElementById('acc-email').value = '';
  document.getElementById('acc-key').value = '';
  document.getElementById('test-alert').innerHTML = '';
};

window.testAccount = async () => {
  const email = document.getElementById('acc-email').value;
  const key = document.getElementById('acc-key').value;
  if (!email || !key) return alert('请先填写 Email 和 API Key');

  const btn = document.getElementById('btn-test');
  const alertBox = document.getElementById('test-alert');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>测试中';

  try {
    const res = await fetch('/api/accounts/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': state.token || localStorage.getItem('token') },
      body: JSON.stringify({ email, key })
    });
    const data = await res.json();
    if (data.success) {
      alertBox.innerHTML = '<div class="alert alert-success border-0 py-2 mt-2 fw-bold small mb-0">✅ 连接测试成功</div>';
    } else {
      alertBox.innerHTML = `<div class="alert alert-danger border-0 py-2 mt-2 fw-bold small mb-0">❌ 失败: ${data.message}</div>`;
    }
  } catch (e) {
    alertBox.innerHTML = '<div class="alert alert-danger border-0 py-2 mt-2 fw-bold small mb-0">❌ 请求服务器错误</div>';
  } finally {
    btn.disabled = false;
    btn.innerText = '测试连接';
  }
};

window.testExistingAccount = async (id, btn) => {
  const acc = window.accountsCache.find(a => a.id === id);
  if (!acc) return;
  const originalText = btn.innerText;
  btn.disabled = true;
  btn.innerText = '测试中...';

  try {
    const res = await fetch('/api/accounts/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': state.token || localStorage.getItem('token') },
      body: JSON.stringify({ email: acc.email, key: acc.key })
    });
    const data = await res.json();
    
    if (typeof AccountsModule !== 'undefined' && AccountsModule.accountStatuses) {
      AccountsModule.accountStatuses.set(id, data.success);
    }
    
    if (data.success) {
      alert('✅ 连接成功！账户有效。');
      const statusCell = btn.closest('tr').querySelector('td:nth-child(5)');
      if (statusCell) {
        statusCell.innerHTML = '<span class="badge bg-success-lt text-success">正常</span>';
      }
    } else {
      alert('❌ 连接失败: ' + data.message);
      const statusCell = btn.closest('tr').querySelector('td:nth-child(5)');
      if (statusCell) {
        statusCell.innerHTML = '<span class="badge bg-danger-lt text-danger">失效</span>';
      }
    }
  } catch (e) {
    alert('❌ 测试请求失败');
  } finally {
    btn.disabled = false;
    btn.innerText = originalText;
  }
};

window.toggleKey = (id, el) => {
  const acc = window.accountsCache.find(a => a.id === id);
  if (!acc) return;
  const isMasked = el.innerText.startsWith('****');
  if (isMasked) {
    el.innerText = acc.key;
    el.classList.remove('text-azure');
    el.classList.add('text-dark');
  } else {
    el.innerText = `****${acc.key.slice(-4)}`;
    el.classList.remove('text-dark');
    el.classList.add('text-azure');
  }
};

window.saveAccount = async () => {
  const name = document.getElementById('acc-name').value;
  const email = document.getElementById('acc-email').value;
  const key = document.getElementById('acc-key').value;
  if (!name || !email || !key) return alert('信息填完整');

  const res = await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': state.token || localStorage.getItem('token') },
    body: JSON.stringify({ id: state.editingId, name, email, key })
  });

  if (res.ok) {
    const modalEl = document.getElementById('modal-account');
    const modal = window.bootstrap?.Modal?.getInstance(modalEl);
    if (modal) modal.hide();
    else {
      const closeBtn = modalEl.querySelector('.btn-close');
      if (closeBtn) closeBtn.click();
    }
    renderModuleContent();
  } else {
    alert('保存失败');
  }
};

window.deleteAccount = async (id) => {
  if (confirm('确定要删除个账号吗？此操作无法撤销。')) {
    await fetch(`/api/accounts/${id}`, { method: 'DELETE', headers: { 'Authorization': state.token || localStorage.getItem('token') } });
    renderModuleContent();
  }
};

// Make render globally available and define it
window.render = function () {
  if (!state.token && !localStorage.getItem('token')) renderLogin();
  else renderDashboard();
};

// Initial render logic
if (document.readyState === 'complete') {
  window.render();
} else {
  window.addEventListener('load', window.render);
}
