'use strict';

const SocialWorkbench = (() => {
  const endpoint = '/api/social-workbench';
  const platformName = { 'social-x': 'X', 'social-douyin': '抖音', 'social-xhs': '小红书' };
  const sources = {
    'x-ledger': ['X 发布台账', 'X ledger'],
    'douyin-ledger': ['抖音创作者台账', 'Douyin creator ledger'],
    'douyin-live': ['抖音作品管理 · 单条快照', 'Douyin creator page snapshot'],
    'rednote-city-ledger': ['小红书城市台账', 'Rednote city ledger'],
    'rednote-city-archive': ['小红书城市台账归档', 'Archived Rednote city ledger'],
    manual: ['手动录入', 'Manual entry'],
  };
  const labels = {
    zh: {
      mode: '社交账号', filter: '平台', add: '添加账号', edit: '编辑账号', sync: '同步台账', loading: '正在连接社交账号…',
      unavailable: '社交账号暂时无法读取。', retry: '重试', synced: '本机台账已同步。', failed: '操作失败，请重试。',
      noAccounts: '还没有社交账号。', account: '账号', platform: '平台', identity: '身份',
      verified: '已核验', unverified: '待核验', pending: '待补身份',
      needsYou: '待处理', working: '聊天进行中', finished: '有活动记录', idle: '暂无活动',
      thinking: '聊天进行中', done: '有活动记录', waiting: '待补身份', archived: '已归档',
      completed: '已结束', interrupted: '已中断', unknown: '状态待确认',
      chats: '关联的 Codex 聊天', noChats: '暂无关联聊天。', bind: '关联聊天', unlink: '解除关联',
      history: '发布历史', noHistory: '暂无发布记录。', addPost: '录入记录', original: '原帖 ↗',
      screenshot: '查看原图 ↗', hasScreenshot: '有截图', upload: '补传截图', replace: '更换截图',
      published: '已发布', submitted: '已提交', failedPost: '发布失败', recorded: '仅有记录',
    },
    en: {
      mode: 'Social accounts', filter: 'Platforms', add: 'Add account', edit: 'Edit account', sync: 'Sync records',
      loading: 'Connecting to social accounts…', unavailable: 'Social accounts are unavailable.', retry: 'Retry',
      synced: 'Local records synced.', failed: 'This action failed. Try again.',
      noAccounts: 'There are no social accounts.', account: 'Account', platform: 'Platform', identity: 'Identity',
      verified: 'Verified', unverified: 'Unverified', pending: 'Identity needed',
      needsYou: 'Needs attention', working: 'Chat in progress', finished: 'Recent activity', idle: 'Quiet',
      thinking: 'Chat in progress', done: 'Has activity', waiting: 'Identity needed', archived: 'Archived',
      completed: 'Completed', interrupted: 'Interrupted', unknown: 'Status unconfirmed',
      chats: 'Linked Codex chats', noChats: 'No chats linked.', bind: 'Link chat', unlink: 'Unlink',
      history: 'Publication history', noHistory: 'No publications yet.', addPost: 'Add record', original: 'Original post ↗',
      screenshot: 'Open full image ↗', hasScreenshot: 'Screenshot', upload: 'Add screenshot', replace: 'Replace screenshot',
      published: 'Published', submitted: 'Submitted', failedPost: 'Failed', recorded: 'Recorded',
    },
  };
  const zh = () => /^zh(?:-|$)/i.test(document.documentElement.lang);
  const copy = () => labels[zh() ? 'zh' : 'en'];
  let snapshot = null;
  let loading = null;
  let problem = false;
  let notice = '';
  const date = (value) => {
    if (!value) return '—';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const time = Date.parse(value);
    return Number.isFinite(time) ? new Date(time).toLocaleString(zh() ? 'zh-CN' : 'en', {
      timeZone: 'Asia/Shanghai', dateStyle: 'medium', timeStyle: 'short',
    }) : '—';
  };
  const isRecent = (chat) => !chat.archived && /^(running|in[_ ]?progress|started)$/i.test(chat.thread_status || '') &&
    Date.now() - Date.parse(chat.updated_at) < 12 * 60_000;
  const stamp = (value) => value ? (Date.parse(value.length === 10 ? value + 'T00:00:00+08:00' : value) || 0) : 0;
  const handle = (account) => account.platform === 'x' && account.handle
    ? '@' + account.handle.replace(/^@/, '') : account.handle;

  function sessions() {
    if (!snapshot) return [];
    return snapshot.accounts.map((account) => {
      const chats = snapshot.chats.filter((chat) => chat.account_ids.includes(account.id));
      const publications = snapshot.publications.filter((post) => post.account_id === account.id);
      const lastEventAt = Math.max(0, ...chats.map((chat) => Date.parse(chat.updated_at) || 0),
        ...publications.map((post) => Date.parse(post.occurred_at) || 0));
      const status = !account.handle ? 'waiting' : chats.some(isRecent) ? 'thinking'
        : lastEventAt ? 'done' : 'idle';
      const agent = 'social-' + account.platform;
      return {
        key: 'social:' + account.id, agent, agentName: platformName[agent], status, lastEventAt,
        project: account.name, title: handle(account) || copy().pending,
        social: { account, chats, publications },
      };
    });
  }

  async function refresh() {
    if (!loading) {
      loading = fetch(endpoint, { cache: 'no-store' }).then(async (response) => {
        if (!response.ok) throw new Error('unavailable');
        const data = await response.json();
        if (!['accounts', 'chats', 'publications'].every((key) => Array.isArray(data[key]))) throw new Error('invalid data');
        snapshot = data;
        problem = false;
      }).catch(() => { problem = true; }).finally(() => { loading = null; });
    }
    return loading;
  }

  async function request(action, data = {}) {
    const response = await fetch(endpoint + '/' + action, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-whatsmyagentdoing': 'social-workbench' },
      body: JSON.stringify(data),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || copy().failed);
    return result;
  }

  const button = (action, label, id = '') =>
    `<button type="button" class="btn" data-social-action="${action}" data-social-id="${esc(id)}">${esc(label)}</button>`;
  const link = (url, label) => url
    ? `<a class="social-link" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>` : '';
  const https = (url) => /^https:\/\//i.test(url || '') ? url : '';
  const chatUrl = (url) => /^codex:\/\/threads\/[a-f0-9-]{36}$/i.test(url || '') ? url : '';
  const message = (value) => `<div class="msgs-note">${esc(value)}</div>`;
  const section = (name, count) => `<div class="side-sec">${esc(name)} · ${count}</div>`;

  function detail(session) {
    const { account, chats, publications } = session.social;
    const t = copy();
    const ready = !!account.handle;
    const chatRows = chats.map((chat) => {
      const phase = chat.archived ? 'archived' : isRecent(chat) ? 'thinking'
        : ['completed', 'interrupted'].includes(chat.thread_status) ? chat.thread_status : 'unknown';
      const name = link(chatUrl(chat.url), chat.title) || esc(chat.title);
      return `<div class="msg assistant social-entry">${name}<span class="at">${esc(t[phase])} · ${esc(date(chat.updated_at))}</span>
        <div class="social-actions">${button('unbind', t.unlink, chat.id)}</div></div>`;
    }).join('');
    const records = [...publications].sort((a, b) => stamp(b.occurred_at) - stamp(a.occurred_at));
    const postRows = records.map((record) => {
      const file = /^[a-f0-9]{64}$/.test(record.screenshot_id || '') ? endpoint + '/media/' + record.screenshot_id : '';
      const status = t[record.status === 'failed' ? 'failedPost' : record.status] || record.status;
      const source = sources[record.source]?.[zh() ? 0 : 1] || record.source;
      const thread = chats.find((chat) => chat.id === record.thread_id);
      return `<details class="msg assistant social-entry" data-social-record="${esc(record.id)}">
        <summary>${esc(record.title)}<span class="at">${esc(status)} · ${esc(date(record.occurred_at))}${file ? ' · ' + esc(t.hasScreenshot) : ''}</span></summary>
        <div class="social-evidence"><span class="at">${link(https(record.source_url), source) || esc(source)}</span>
          ${thread ? `<span class="at">${link(chatUrl(thread.url), thread.title)}</span>` : ''}
          ${file ? `<a href="${file}" target="_blank" rel="noopener" aria-label="${esc(t.screenshot)}"><img src="${file}" alt="${esc(t.screenshot)}" loading="lazy"></a>` : ''}
          <div class="social-actions">${link(https(record.url), t.original)}${button('screenshot', file ? t.replace : t.upload, record.id)}</div>
        </div></details>`;
    }).join('');
    return `<div class="dstatus" style="--s:${statusColor(session.status)}"><i></i><b>${esc(t[session.status])}</b></div>
      <dl class="dmeta">
        <dt>${esc(t.platform)}</dt><dd>${esc(session.agentName)}</dd>
        <dt>${esc(t.account)}</dt><dd class="mono">${esc(handle(account) || '—')}</dd>
        <dt>${esc(t.identity)}</dt><dd>${esc(t[account.status] || account.status)}</dd>
      </dl>
      <div class="dactions">${button('edit', t.edit)}</div>
      ${section(t.chats, chats.length)}
      ${ready ? `<div class="dactions">${button('bind', t.bind)}</div>` : ''}
      <div class="msgs">${chatRows || message(t.noChats)}</div>
      ${section(t.history, records.length)}
      ${ready ? `<div class="dactions">${button('publication', t.addPost)}</div>` : ''}
      <div class="msgs">${postRows || message(t.noHistory)}</div>`;
  }

  function listStart() {
    const t = copy();
    if (!snapshot) return message(problem ? t.unavailable : t.loading) + (problem ? button('retry', t.retry) : '');
    return `<div class="dactions">${button('add', t.add)}${button('sync', t.sync)}</div>`
      + (problem ? message(t.unavailable) : '') + (notice ? `<div role="status">${message(notice)}</div>` : '');
  }

  function setNotice(value) { notice = value; }

  return { copy, sessions, refresh, request, detail, listStart, setNotice, ready: () => !!snapshot };
})();
