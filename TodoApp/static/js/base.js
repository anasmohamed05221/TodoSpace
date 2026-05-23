// -------- Helpers --------
function getCookie(name) {
    if (!document.cookie) return null;
    for (const raw of document.cookie.split(';')) {
        const c = raw.trim();
        if (c.startsWith(name + '=')) return decodeURIComponent(c.substring(name.length + 1));
    }
    return null;
}

function logout() {
    document.cookie.split(';').forEach(c => {
        const eq = c.indexOf('=');
        const name = (eq > -1 ? c.substr(0, eq) : c).trim();
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    });
    window.location.href = '/auth/login-page';
}

function authHeaders(extra = {}) {
    const token = getCookie('access_token');
    return {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...extra,
    };
}

function toast(message, variant = '') {
    const stack = document.getElementById('toastStack');
    if (!stack) { console.log(message); return; }
    const el = document.createElement('div');
    el.className = 'toast' + (variant ? ` toast--${variant}` : '');
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => {
        el.style.transition = 'opacity .25s, transform .25s';
        el.style.opacity = '0';
        el.style.transform = 'translateY(6px)';
        setTimeout(() => el.remove(), 250);
    }, 2400);
}

async function readError(response) {
    try {
        const data = await response.json();
        return data.detail || data.message || `Error ${response.status}`;
    } catch {
        return `Error ${response.status}`;
    }
}

// -------- Todo list page (inline interactions) --------
function initTodoListPage() {
    const list = document.getElementById('todoList');
    const quickForm = document.getElementById('quickAddForm');
    if (!list && !quickForm) return;

    const emptyState = document.getElementById('emptyState');
    const filterBtns = document.querySelectorAll('.filter-btn');
    let currentFilter = 'all';

    function updateCounts() {
        const items = list.querySelectorAll('.todo-item');
        let active = 0, done = 0;
        items.forEach(it => it.dataset.complete === 'true' ? done++ : active++);
        const setText = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n; };
        setText('countAll', items.length);
        setText('countActive', active);
        setText('countDone', done);
        if (emptyState) emptyState.hidden = items.length > 0;
        if (list) list.style.display = items.length > 0 ? '' : 'none';
    }

    function applyFilter() {
        list.querySelectorAll('.todo-item').forEach(it => {
            const done = it.dataset.complete === 'true';
            const show = currentFilter === 'all'
                || (currentFilter === 'active' && !done)
                || (currentFilter === 'done' && done);
            it.style.display = show ? '' : 'none';
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.toggle('is-active', b === btn));
            currentFilter = btn.dataset.filter;
            applyFilter();
        });
    });

    async function putTodo(item, patch) {
        const id = item.dataset.id;
        const payload = {
            title: patch.title ?? item.dataset.title,
            description: patch.description ?? item.dataset.description ?? '',
            priority: parseInt(patch.priority ?? item.dataset.priority, 10),
            complete: patch.complete ?? (item.dataset.complete === 'true'),
        };
        const res = await fetch(`/todos/${id}`, {
            method: 'PUT',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await readError(res));
        // sync dataset
        item.dataset.title = payload.title;
        item.dataset.description = payload.description;
        item.dataset.priority = String(payload.priority);
        item.dataset.complete = String(payload.complete);
    }

    async function deleteTodo(item) {
        const id = item.dataset.id;
        const res = await fetch(`/todos/${id}`, { method: 'DELETE', headers: authHeaders() });
        if (!res.ok && res.status !== 204) throw new Error(await readError(res));
    }

    list?.addEventListener('change', async (e) => {
        const checkbox = e.target.closest('.todo-check');
        if (!checkbox) return;
        const item = checkbox.closest('.todo-item');
        const next = checkbox.checked;
        item.classList.toggle('is-done', next);
        try {
            await putTodo(item, { complete: next });
            updateCounts();
            applyFilter();
        } catch (err) {
            checkbox.checked = !next;
            item.classList.toggle('is-done', !next);
            toast(err.message || 'Could not update', 'error');
        }
    });

    list?.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action="delete"]');
        if (!btn) return;
        const item = btn.closest('.todo-item');
        item.style.transition = 'opacity .2s, transform .2s';
        item.style.opacity = '0';
        item.style.transform = 'translateX(-6px)';
        try {
            await deleteTodo(item);
            setTimeout(() => { item.remove(); updateCounts(); applyFilter(); }, 180);
        } catch (err) {
            item.style.opacity = '';
            item.style.transform = '';
            toast(err.message || 'Could not delete', 'error');
        }
    });

    quickForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('quickAddInput');
        const prioritySel = document.getElementById('quickAddPriority');
        const title = input.value.trim();
        if (title.length < 3) {
            toast('Title needs at least 3 characters', 'error');
            return;
        }
        const priority = parseInt(prioritySel.value, 10);
        const payload = { title, description: '', priority, complete: false };

        const submitBtn = quickForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const res = await fetch('/todos/', {
                method: 'POST',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(await readError(res));

            // Fetch fresh list to get the new id
            const listRes = await fetch('/todos/', { headers: authHeaders() });
            if (listRes.ok) {
                const todos = await listRes.json();
                const created = todos[todos.length - 1];
                if (created) appendTodo(created);
            }
            input.value = '';
            input.focus();
            updateCounts();
            applyFilter();
        } catch (err) {
            toast(err.message || 'Could not add task', 'error');
        } finally {
            submitBtn.disabled = false;
        }
    });

    function appendTodo(todo) {
        const li = document.createElement('li');
        li.className = 'todo-item' + (todo.complete ? ' is-done' : '');
        li.dataset.id = todo.id;
        li.dataset.title = todo.title;
        li.dataset.description = todo.description || '';
        li.dataset.priority = todo.priority;
        li.dataset.complete = todo.complete ? 'true' : 'false';
        li.innerHTML = `
            <input type="checkbox" class="todo-check" ${todo.complete ? 'checked' : ''} aria-label="Toggle complete">
            <div class="todo-item__body">
                <div class="todo-item__title"></div>
                <div class="todo-item__meta">
                    <span class="priority priority-${todo.priority}">P${todo.priority}</span>
                </div>
            </div>
            <div class="todo-item__actions">
                <a class="icon-btn" href="edit-todo-page/${todo.id}" aria-label="Edit" title="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                </a>
                <button type="button" class="icon-btn icon-btn--danger" data-action="delete" aria-label="Delete" title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>`;
        li.querySelector('.todo-item__title').textContent = todo.title;
        list.appendChild(li);
    }

    updateCounts();
    applyFilter();
}

// -------- Add Todo form (full page) --------
function initAddTodoForm() {
    const form = document.getElementById('todoForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        const payload = {
            title: data.title,
            description: data.description || '',
            priority: parseInt(data.priority, 10),
            complete: false,
        };
        try {
            const res = await fetch('/todos/', {
                method: 'POST',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(await readError(res));
            window.location.href = '/todos/todo-page';
        } catch (err) {
            toast(err.message || 'Could not add task', 'error');
        }
    });
}

// -------- Edit Todo form (full page) --------
function initEditTodoForm() {
    const form = document.getElementById('editTodoForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        const todoId = window.location.pathname.split('/').pop();
        const payload = {
            title: data.title,
            description: data.description || '',
            priority: parseInt(data.priority, 10),
            complete: data.complete === 'on',
        };
        try {
            const res = await fetch(`/todos/${todoId}`, {
                method: 'PUT',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(await readError(res));
            window.location.href = '/todos/todo-page';
        } catch (err) {
            toast(err.message || 'Could not save', 'error');
        }
    });

    const deleteBtn = document.getElementById('deleteButton');
    deleteBtn?.addEventListener('click', async () => {
        if (!confirm('Delete this task? This cannot be undone.')) return;
        const todoId = window.location.pathname.split('/').pop();
        try {
            const res = await fetch(`/todos/${todoId}`, { method: 'DELETE', headers: authHeaders() });
            if (!res.ok && res.status !== 204) throw new Error(await readError(res));
            window.location.href = '/todos/todo-page';
        } catch (err) {
            toast(err.message || 'Could not delete', 'error');
        }
    });
}

// -------- Auth forms --------
function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = new URLSearchParams();
        for (const [k, v] of new FormData(form).entries()) payload.append(k, v);
        try {
            const res = await fetch('/auth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: payload.toString(),
            });
            if (!res.ok) throw new Error(await readError(res));
            const data = await res.json();
            // clear any old cookies, then set token
            document.cookie.split(';').forEach(c => {
                const eq = c.indexOf('=');
                const name = (eq > -1 ? c.substr(0, eq) : c).trim();
                document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            });
            document.cookie = `access_token=${data.access_token}; path=/`;
            window.location.href = '/todos/todo-page';
        } catch (err) {
            toast(err.message || 'Sign-in failed', 'error');
        }
    });
}

function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        if (data.password !== data.password2) {
            toast('Passwords do not match', 'error');
            return;
        }
        const payload = {
            email: data.email,
            username: data.username,
            first_name: data.firstname,
            last_name: data.lastname,
            role: data.role,
            phone_number: data.phone_number,
            password: data.password,
        };
        try {
            const res = await fetch('/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(await readError(res));
            window.location.href = '/auth/login-page';
        } catch (err) {
            toast(err.message || 'Could not create account', 'error');
        }
    });
}

// -------- Pretty select (wraps native <select data-pretty>) --------
function initPrettySelects() {
    document.querySelectorAll('select[data-pretty]').forEach(buildPrettySelect);
}

function buildPrettySelect(nativeSel) {
    if (nativeSel.dataset.prettyMounted) return;
    nativeSel.dataset.prettyMounted = '1';

    const variant = nativeSel.dataset.pretty; // 'inline' or ''
    const colorPrefix = nativeSel.dataset.colorPrefix || ''; // e.g. 'p-color-'

    const wrap = document.createElement('div');
    wrap.className = 'pretty-select' + (variant === 'inline' ? ' pretty-select--inline' : '');
    nativeSel.parentNode.insertBefore(wrap, nativeSel);
    wrap.appendChild(nativeSel);
    nativeSel.classList.add('pretty-select__native');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'pretty-select__trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = `<span class="pretty-select__label"></span>
        <svg class="pretty-select__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    wrap.appendChild(trigger);

    const menu = document.createElement('div');
    menu.className = 'pretty-select__menu';
    menu.setAttribute('role', 'listbox');
    wrap.appendChild(menu);

    const options = Array.from(nativeSel.options).map((opt, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pretty-select__opt';
        btn.setAttribute('role', 'option');
        btn.dataset.value = opt.value;
        btn.dataset.index = i;
        const dotClass = colorPrefix ? colorPrefix + opt.value : '';
        btn.innerHTML = `${dotClass ? `<span class="pretty-select__opt-dot ${dotClass}"></span>` : ''}
            <span class="pretty-select__opt-label">${opt.textContent}</span>
            <svg class="pretty-select__opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
        menu.appendChild(btn);
        return btn;
    });

    const labelEl = trigger.querySelector('.pretty-select__label');
    function syncFromNative() {
        const opt = nativeSel.options[nativeSel.selectedIndex];
        if (!opt) return;
        const dotClass = colorPrefix ? colorPrefix + opt.value : '';
        labelEl.innerHTML = (dotClass ? `<span class="pretty-select__opt-dot ${dotClass}" style="display:inline-block;margin-right:8px;vertical-align:middle;"></span>` : '') + opt.textContent;
        options.forEach(b => b.classList.toggle('is-selected', b.dataset.value === nativeSel.value));
    }
    syncFromNative();

    let focusIdx = -1;
    function setFocus(i) {
        focusIdx = Math.max(0, Math.min(options.length - 1, i));
        options.forEach((b, idx) => b.classList.toggle('is-focus', idx === focusIdx));
        options[focusIdx]?.scrollIntoView({ block: 'nearest' });
    }

    function positionMenu() {
        const r = trigger.getBoundingClientRect();
        const menuW = Math.max(r.width, 200);
        const gap = 6;
        const viewportH = window.innerHeight;
        const maxH = 240;
        const spaceBelow = viewportH - r.bottom - 8;
        const spaceAbove = r.top - 8;
        const placeAbove = spaceBelow < 160 && spaceAbove > spaceBelow;
        menu.style.width = menuW + 'px';
        // anchor right-aligned for inline variant so it doesn't clip viewport
        if (wrap.classList.contains('pretty-select--inline')) {
            menu.style.left = Math.max(8, r.right - menuW) + 'px';
        } else {
            menu.style.left = r.left + 'px';
        }
        if (placeAbove) {
            menu.style.top = '';
            menu.style.bottom = (viewportH - r.top + gap) + 'px';
            menu.style.maxHeight = Math.min(maxH, spaceAbove) + 'px';
        } else {
            menu.style.bottom = '';
            menu.style.top = (r.bottom + gap) + 'px';
            menu.style.maxHeight = Math.min(maxH, spaceBelow) + 'px';
        }
    }
    function open() {
        // move menu to <body> so it escapes any clipping/transform ancestor
        if (menu.parentNode !== document.body) document.body.appendChild(menu);
        wrap.classList.add('is-open');
        menu.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        positionMenu();
        setFocus(Math.max(0, nativeSel.selectedIndex));
        document.addEventListener('mousedown', onOutside, true);
        document.addEventListener('keydown', onKey);
        window.addEventListener('scroll', positionMenu, true);
        window.addEventListener('resize', positionMenu);
    }
    function close() {
        wrap.classList.remove('is-open');
        menu.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        document.removeEventListener('mousedown', onOutside, true);
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('scroll', positionMenu, true);
        window.removeEventListener('resize', positionMenu);
    }
    function onOutside(e) {
        if (!wrap.contains(e.target) && !menu.contains(e.target)) close();
    }
    function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); close(); trigger.focus(); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); setFocus(focusIdx + 1); return; }
        if (e.key === 'ArrowUp')   { e.preventDefault(); setFocus(focusIdx - 1); return; }
        if (e.key === 'Enter')     { e.preventDefault(); pick(focusIdx); }
    }
    function pick(i) {
        const val = options[i]?.dataset.value;
        if (val == null) return;
        if (nativeSel.value !== val) {
            nativeSel.value = val;
            nativeSel.dispatchEvent(new Event('change', { bubbles: true }));
        }
        syncFromNative();
        close();
        trigger.focus();
    }

    trigger.addEventListener('click', () => wrap.classList.contains('is-open') ? close() : open());
    options.forEach((b, i) => b.addEventListener('click', () => pick(i)));
    nativeSel.addEventListener('change', syncFromNative);
}

// -------- Boot --------
document.addEventListener('DOMContentLoaded', () => {
    initPrettySelects();
    initTodoListPage();
    initAddTodoForm();
    initEditTodoForm();
    initLoginForm();
    initRegisterForm();
});