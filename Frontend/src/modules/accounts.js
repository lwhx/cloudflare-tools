export class AccountsModule {
    static currentPage = 1;
    static pageSize = 25;
    static searchQuery = '';
    static statusFilter = 'all';
    static selectedAccounts = new Set();
    static accountStatuses = new Map();

    static async render(container, state) {
        const res = await fetch('/api/accounts', { headers: { 'Authorization': state.token || localStorage.getItem('token') } });
        if (!res.ok) {
            window.logout();
            return;
        }
        const data = await res.json();
        window.accountsCache = data;

        this.renderContent(container, data);
    }

    static renderContent(container, allAccounts) {
        let filteredAccounts = allAccounts;

        if (this.searchQuery) {
            filteredAccounts = filteredAccounts.filter(acc => 
                acc.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                acc.email.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        }

        if (this.statusFilter !== 'all') {
            filteredAccounts = filteredAccounts.filter(acc => {
                const status = this.accountStatuses.get(acc.id);
                return this.statusFilter === 'valid' ? status === true : status === false;
            });
        }

        const totalPages = this.pageSize === 'all' ? 1 : Math.ceil(filteredAccounts.length / this.pageSize);
        const startIndex = this.pageSize === 'all' ? 0 : (this.currentPage - 1) * this.pageSize;
        const endIndex = this.pageSize === 'all' ? filteredAccounts.length : startIndex + this.pageSize;
        const paginatedAccounts = filteredAccounts.slice(startIndex, endIndex);

        const allSelected = paginatedAccounts.length > 0 && paginatedAccounts.every(acc => this.selectedAccounts.has(acc.id));

        const validCount = Array.from(this.accountStatuses.values()).filter(v => v === true).length;
        const invalidCount = Array.from(this.accountStatuses.values()).filter(v => v === false).length;

        container.innerHTML = `
      <div class="page-header d-print-none mb-3">
        <div class="row align-items-center">
          <div class="col">
            <div class="page-pretitle text-muted">Management</div>
            <h2 class="page-title fw-bold">账号管理</h2>
          </div>
          <div class="col-auto ms-auto">
            <button class="btn btn-primary px-4 shadow-sm" data-bs-toggle="modal" data-bs-target="#modal-account" onclick="window.resetModal()">
              <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-plus" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>
              添加账号
            </button>
          </div>
        </div>
      </div>

      <div class="card shadow-sm border-0 rounded-3">
        <div class="table-responsive">
          <table class="table table-vcenter card-table table-hover mb-0">
            <thead class="bg-light">
              <tr>
                <th colspan="6" class="border-bottom-0 p-0">
                  <div class="px-3 py-2 border-bottom">
                    <div class="row align-items-center g-2">
                      <div class="col-md-7">
                        <div class="d-flex gap-2 align-items-center flex-wrap">
                          <div style="width: 280px;">
                            <div class="input-group input-group-sm input-group-flat">
                              <span class="input-group-text bg-light border-end-0 pe-0">
                                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-sm text-muted" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
                              </span>
                              <input type="text" class="form-control form-control-sm border-start-0 ps-1" id="search-accounts" placeholder="搜索账号或邮箱" value="${this.searchQuery}">
                            </div>
                          </div>
                          <select class="form-select form-select-sm" id="status-filter" style="width: 140px;">
                            <option value="all" ${this.statusFilter === 'all' ? 'selected' : ''}>全部状态</option>
                            <option value="valid" ${this.statusFilter === 'valid' ? 'selected' : ''}>正常${validCount > 0 ? `(${validCount})` : ''}</option>
                            <option value="invalid" ${this.statusFilter === 'invalid' ? 'selected' : ''}>失效${invalidCount > 0 ? `(${invalidCount})` : ''}</option>
                          </select>
                          <select class="form-select form-select-sm" id="page-size-select" style="width: 110px;">
                            <option value="25" ${this.pageSize === 25 ? 'selected' : ''}>25条/页</option>
                            <option value="50" ${this.pageSize === 50 ? 'selected' : ''}>50条/页</option>
                            <option value="100" ${this.pageSize === 100 ? 'selected' : ''}>100条/页</option>
                            <option value="all" ${this.pageSize === 'all' ? 'selected' : ''}>全部</option>
                          </select>
                        </div>
                      </div>
                      <div class="col-md-5">
                        <div class="d-flex gap-2 justify-content-md-end">
                          <button class="btn btn-secondary btn-sm" id="btn-batch-test" ${this.selectedAccounts.size === 0 ? 'disabled' : ''}>
                            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-sm" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 11l3 3l8 -8" /><path d="M20 12v6a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h9" /></svg>
                            批量检测${this.selectedAccounts.size > 0 ? `(${this.selectedAccounts.size})` : ''}
                          </button>
                          <button class="btn btn-danger btn-sm" id="btn-batch-delete" ${this.selectedAccounts.size === 0 ? 'disabled' : ''}>
                            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-sm" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg>
                            批量删除${this.selectedAccounts.size > 0 ? `(${this.selectedAccounts.size})` : ''}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </th>
              </tr>
              <tr>
                <th class="ps-3 py-3" style="width: 50px;">
                  <input type="checkbox" class="form-check-input" id="select-all" ${allSelected && paginatedAccounts.length > 0 ? 'checked' : ''}>
                </th>
                <th class="py-3 text-secondary fw-bold" style="width: 15%;">账号名称</th>
                <th class="py-3 text-secondary fw-bold" style="width: 25%;">邮箱</th>
                <th class="py-3 text-secondary fw-bold" style="width: 25%;">API密钥</th>
                <th class="py-3 text-secondary fw-bold" style="width: 10%;">状态</th>
                <th class="py-3 text-secondary fw-bold text-center" style="width: 15%;">操作</th>
              </tr>
            </thead>
            <tbody>
              ${paginatedAccounts.length === 0 ? `
                <tr><td colspan="6" class="text-center py-6 text-muted border-0">
                  ${this.searchQuery || this.statusFilter !== 'all' ? '未找到匹配的账号' : '暂无托管账号，点击上方按钮开始添加'}
                </td></tr>
              ` : paginatedAccounts.map(acc => {
                const status = this.accountStatuses.get(acc.id);
                const statusBadge = status === true 
                  ? '<span class="badge bg-success-lt text-success">正常</span>'
                  : status === false 
                  ? '<span class="badge bg-danger-lt text-danger">失效</span>'
                  : '<span class="badge bg-secondary-lt text-secondary">未检测</span>';
                
                return `
                <tr class="bg-white">
                  <td class="ps-3">
                    <input type="checkbox" class="form-check-input account-checkbox" data-id="${acc.id}" ${this.selectedAccounts.has(acc.id) ? 'checked' : ''}>
                  </td>
                  <td><div class="fw-bold text-dark">${acc.name}</div></td>
                  <td class="text-secondary">${acc.email}</td>
                  <td>
                    <code class="bg-azure-lt border-0 px-2 py-1 rounded text-azure fw-bold" onclick="window.toggleKey('${acc.id}', this)" style="cursor: pointer;">
                      ****${acc.key.slice(-4)}
                    </code>
                  </td>
                  <td>${statusBadge}</td>
                  <td>
                    <div class="d-flex justify-content-center gap-2">
                      <button class="btn btn-secondary btn-sm px-3" onclick="window.testExistingAccount('${acc.id}', this)">测试</button>
                      <button class="btn btn-danger btn-sm px-3" onclick="window.deleteAccount('${acc.id}')">删除</button>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${this.pageSize !== 'all' && totalPages > 1 ? `
          <div class="card-footer bg-white border-top py-3">
            <div class="row align-items-center">
              <div class="col-auto">
                <div class="text-muted">
                  显示 ${startIndex + 1}-${Math.min(endIndex, filteredAccounts.length)} / 共 ${filteredAccounts.length} 条
                </div>
              </div>
              <div class="col-auto ms-auto">
                <ul class="pagination mb-0">
                  <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="prev">
                      <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M15 6l-6 6l6 6" /></svg>
                    </a>
                  </li>
                  ${this.generatePagination(totalPages)}
                  <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="next">
                      <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 6l6 6l-6 6" /></svg>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ` : filteredAccounts.length > 0 ? `
          <div class="card-footer bg-white border-top py-3">
            <div class="text-muted">共 ${filteredAccounts.length} 条记录</div>
          </div>
        ` : ''}
      </div>
    `;

        this.attachEventListeners(container, allAccounts);
    }

    static generatePagination(totalPages) {
        let pages = [];
        const current = this.currentPage;
        
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (current <= 4) {
                pages = [1, 2, 3, 4, 5, '...', totalPages];
            } else if (current >= totalPages - 3) {
                pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
            } else {
                pages = [1, '...', current - 1, current, current + 1, '...', totalPages];
            }
        }

        return pages.map(page => {
            if (page === '...') {
                return `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            return `<li class="page-item ${page === current ? 'active' : ''}">
                      <a class="page-link" href="#" data-page="${page}">${page}</a>
                    </li>`;
        }).join('');
    }

    static attachEventListeners(container, allAccounts) {
        const searchInput = container.querySelector('#search-accounts');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.currentPage = 1;
                this.renderContent(container, allAccounts);
            });
        }

        const statusFilter = container.querySelector('#status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.statusFilter = e.target.value;
                this.currentPage = 1;
                this.renderContent(container, allAccounts);
            });
        }

        const pageSizeSelect = container.querySelector('#page-size-select');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.pageSize = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
                this.currentPage = 1;
                this.renderContent(container, allAccounts);
            });
        }

        const paginationLinks = container.querySelectorAll('.pagination .page-link');
        paginationLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.closest('a').dataset.page;
                if (page === 'prev' && this.currentPage > 1) {
                    this.currentPage--;
                } else if (page === 'next') {
                    const filteredAccounts = this.getFilteredAccounts(allAccounts);
                    const totalPages = Math.ceil(filteredAccounts.length / this.pageSize);
                    if (this.currentPage < totalPages) this.currentPage++;
                } else if (page && page !== '...') {
                    this.currentPage = parseInt(page);
                }
                this.renderContent(container, allAccounts);
            });
        });

        const selectAllCheckbox = container.querySelector('#select-all');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                const checkboxes = container.querySelectorAll('.account-checkbox');
                checkboxes.forEach(cb => {
                    const id = cb.dataset.id;
                    if (e.target.checked) {
                        this.selectedAccounts.add(id);
                        cb.checked = true;
                    } else {
                        this.selectedAccounts.delete(id);
                        cb.checked = false;
                    }
                });
                this.renderContent(container, allAccounts);
            });
        }

        const accountCheckboxes = container.querySelectorAll('.account-checkbox');
        accountCheckboxes.forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                if (e.target.checked) {
                    this.selectedAccounts.add(id);
                } else {
                    this.selectedAccounts.delete(id);
                }
                this.renderContent(container, allAccounts);
            });
        });

        const batchTestBtn = container.querySelector('#btn-batch-test');
        if (batchTestBtn) {
            batchTestBtn.addEventListener('click', () => this.batchTest(container, allAccounts));
        }

        const batchDeleteBtn = container.querySelector('#btn-batch-delete');
        if (batchDeleteBtn) {
            batchDeleteBtn.addEventListener('click', () => this.batchDelete(container, allAccounts));
        }
    }

    static getFilteredAccounts(allAccounts) {
        let filtered = allAccounts;
        if (this.searchQuery) {
            filtered = filtered.filter(acc => 
                acc.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                acc.email.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        }
        if (this.statusFilter !== 'all') {
            filtered = filtered.filter(acc => {
                const status = this.accountStatuses.get(acc.id);
                return this.statusFilter === 'valid' ? status === true : status === false;
            });
        }
        return filtered;
    }

    static async batchTest(container, allAccounts) {
        if (this.selectedAccounts.size === 0) return;

        const btn = container.querySelector('#btn-batch-test');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>检测中...';

        let successCount = 0;
        let failCount = 0;

        for (const id of this.selectedAccounts) {
            const acc = allAccounts.find(a => a.id === id);
            if (!acc) continue;

            try {
                const res = await fetch('/api/accounts/test', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': localStorage.getItem('token') 
                    },
                    body: JSON.stringify({ email: acc.email, key: acc.key })
                });
                const data = await res.json();
                if (data.success) {
                    successCount++;
                    this.accountStatuses.set(id, true);
                } else {
                    failCount++;
                    this.accountStatuses.set(id, false);
                }
            } catch (e) {
                failCount++;
                this.accountStatuses.set(id, false);
            }
        }

        btn.disabled = false;
        btn.innerHTML = originalText;

        this.renderContent(container, allAccounts);
        alert(`批量检测完成\n✅ 成功: ${successCount} 个\n❌ 失败: ${failCount} 个`);
    }

    static async batchDelete(container, allAccounts) {
        if (this.selectedAccounts.size === 0) return;

        if (!confirm(`确定要删除选中的 ${this.selectedAccounts.size} 个账号吗？\n此操作无法撤销！`)) {
            return;
        }

        const btn = container.querySelector('#btn-batch-delete');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>删除中...';

        for (const id of this.selectedAccounts) {
            try {
                await fetch(`/api/accounts/${id}`, { 
                    method: 'DELETE', 
                    headers: { 'Authorization': localStorage.getItem('token') } 
                });
                this.accountStatuses.delete(id);
            } catch (e) {
                console.error('Delete error:', e);
            }
        }

        this.selectedAccounts.clear();
        
        const res = await fetch('/api/accounts', { 
            headers: { 'Authorization': localStorage.getItem('token') } 
        });
        const updatedData = await res.json();
        window.accountsCache = updatedData;

        this.renderContent(container, updatedData);
    }
}
