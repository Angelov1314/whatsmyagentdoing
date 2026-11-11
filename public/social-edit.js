'use strict';

const SocialEditor = (() => {
  const translations = {
    en: {
      save: 'Save', cancel: 'Back', search: 'Search', searchChat: 'Find a Codex chat by title',
      chatId: 'Codex chat ID or link', bindChat: 'Link chat', linkedChats: 'Linked chats',
      account: 'Account', platform: 'Platform', handle: 'Account name or ID', name: 'Display name',
      pending: 'Leave blank while the account name is pending', verified: 'Verified account identity is managed by the trusted source.',
      publication: 'Publication', title: 'Title', occurred: 'Date and time', status: 'Status', url: 'Post URL',
      status_published: 'Published', status_submitted: 'Submitted', status_failed: 'Failed', status_recorded: 'Recorded',
      x: 'X', douyin: 'Douyin', xhs: 'Xiaohongshu', screenshot: 'Screenshot', upload: 'Choose a screenshot',
      paste: 'You can also paste a screenshot here. PNG, JPG or WebP, up to 8 MiB.', view: 'View screenshot',
      removeLink: 'Unlink', empty: 'No records yet.', noChats: 'No Codex chats found.', selected: 'Selected chat',
      workError: 'Could not save this change.', unsupported: 'Choose a PNG, JPG or WebP image no larger than 8 MiB.',
      missingImage: 'Choose or paste a screenshot first.', pendingAccount: 'Account identity pending',
      source: 'Source', chatsUnavailable: 'The local Codex chat index is unavailable.',
      count: (n) => `${n} records`,
    },
    zh: {
      save: '保存', cancel: '返回', search: '搜索', searchChat: '搜索 Codex 聊天标题',
      chatId: 'Codex 聊天 ID 或链接', bindChat: '关联聊天', linkedChats: '已关联聊天',
      account: '账号', platform: '平台', handle: '平台账号名或 ID', name: '显示名称',
      pending: '账号名待确认时留空', verified: '已核验身份由可信来源管理。',
      publication: '发布记录', title: '标题', occurred: '日期和时间', status: '状态', url: '原帖链接',
      status_published: '已发布', status_submitted: '已提交', status_failed: '失败', status_recorded: '仅有记录',
      x: 'X', douyin: '抖音', xhs: '小红书', screenshot: '截图', upload: '选择截图',
      paste: '也可直接粘贴截图。支持 PNG、JPG、WebP，最多 8 MiB。', view: '查看截图',
      removeLink: '解除关联', empty: '还没有发布记录。', noChats: '没有找到 Codex 聊天。', selected: '已选择',
      workError: '保存失败，请检查输入后重试。', unsupported: '请选择 8 MiB 以内的 PNG、JPG 或 WebP 图片。',
      missingImage: '请先选择或粘贴一张截图。', pendingAccount: '账号身份待补',
      source: '来源', chatsUnavailable: '暂时无法读取本机 Codex 聊天。',
      count: (n) => `${n} 条记录`,
    },
  };

  let activeHost = null;

  function text(value) {
    return String(value ?? '');
  }

  function node(tag, className = '', value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  }

  function button(label, action, onClick, className = 'btn') {
    const element = node('button', className, label);
    element.type = 'button';
    element.addEventListener('click', onClick);
    if (action) element.dataset.action = action;
    return element;
  }

  function makeField(labels, label, name, type = 'text', value = '', options = {}) {
    const wrapper = node('label', 'social-edit-field');
    wrapper.append(node('span', '', label));
    const control = node(type === 'select' ? 'select' : 'input');
    if (type !== 'select') control.type = type;
    control.name = name;
    control.required = Boolean(options.required);
    control.disabled = Boolean(options.disabled);
    if (type === 'select') {
      for (const [optionValue, optionLabel] of options.entries || []) {
        const option = node('option', '', optionLabel);
        option.value = optionValue;
        control.append(option);
      }
    }
    if (value) control.value = value;
    if (options.placeholder) control.placeholder = options.placeholder;
    if (options.maxLength) control.maxLength = options.maxLength;
    if (options.accept) control.accept = options.accept;
    if (options.step) control.step = options.step;
    wrapper.append(control);
    return wrapper;
  }

  function localeLabels(custom) {
    const code = (document.documentElement.lang || '').slice(0, 2).toLowerCase();
    return {...translations[code] || translations.en, ...custom};
  }

  function clear(host) {
    host.replaceChildren();
    host.classList.remove('social-editor');
  }

  function close(host) {
    if (host) clear(host);
    if (!host || activeHost === host) activeHost = null;
  }

  function active(host) {
    return Boolean(activeHost && (!host || activeHost === host));
  }

  function open(host, options) {
    close(activeHost);
    activeHost = host;
    host.classList.add('social-editor');
    host.replaceChildren();
    const labels = localeLabels(options.labels || {});
    const form = node('form', 'social-edit-form');
    form.noValidate = false;
    const heading = node('div', 'side-sec', options.action === 'publication'
      ? `${labels.publication} · ${options.account?.name || ''}`
      : options.action === 'bind'
        ? `${labels.bindChat} · ${options.account?.name || ''}`
        : options.action === 'screenshot'
          ? `${labels.screenshot} · ${options.record?.title || ''}`
          : `${labels.account} · ${options.account?.name || labels.pendingAccount}`);
    const error = node('p', 'social-edit-error');
    error.hidden = true;
    const fields = node('div', 'social-edit-fields');
    let selectedImage = null;
    const get = (name) => String(new FormData(form).get(name) || '').trim();

    if (options.action === 'account') {
      fields.append(makeField(labels, labels.name, 'name', 'text', options.account?.name || '', {
        required: true, maxLength: 120, placeholder: labels.name,
      }));
      fields.append(makeField(labels, labels.platform, 'platform', 'select', options.account?.platform || 'x', {
        disabled: Boolean(options.account), entries: [['x', labels.x], ['douyin', labels.douyin], ['xhs', labels.xhs]],
      }));
      fields.append(makeField(labels, labels.handle, 'handle', 'text', options.account?.handle || '', {
        disabled: options.account?.status === 'verified', maxLength: 160,
        placeholder: labels.pending,
      }));
      if (options.account?.status === 'verified') fields.append(node('p', 'field-hint', labels.verified));
    } else if (options.action === 'publication') {
      fields.append(makeField(labels, labels.title, 'title', 'text', '', {required: true, maxLength: 200}));
      fields.append(makeField(labels, labels.occurred, 'occurred_at', 'datetime-local', '', {step: 60}));
      fields.append(makeField(labels, labels.status, 'status', 'select', 'published', {
        entries: ['published', 'submitted', 'failed', 'recorded'].map((value) => [value, labels[`status_${value}`]]),
      }));
      fields.append(makeField(labels, labels.url, 'url', 'url', '', {maxLength: 2048}));
      const linkedChats = (options.chats || []).filter((chat) => chat.account_ids?.includes(options.account?.id));
      if (linkedChats.length) fields.append(makeField(labels, labels.selected, 'thread_id', 'select', '', {
        entries: [['', '—'], ...linkedChats.map((chat) => [chat.id, chat.title])],
      }));
    } else if (options.action === 'screenshot') {
      fields.append(node('p', 'field-hint', options.record?.title || ''));
      fields.append(makeField(labels, labels.upload, 'image', 'file', '', {
        accept: 'image/png,image/jpeg,image/webp',
      }));
      const hint = node('p', 'field-hint', labels.paste);
      fields.append(hint);
      form.addEventListener('paste', (event) => {
        const image = [...(event.clipboardData?.files || [])].find((file) =>
          ['image/png', 'image/jpeg', 'image/webp'].includes(file.type));
        if (image) { selectedImage = image; hint.textContent = `${labels.upload} · ${image.name}`; }
      });
    } else if (options.action === 'bind') {
      fields.append(makeField(labels, labels.searchChat, 'query', 'search', '', {maxLength: 160}));
      const searchButton = button(labels.search, 'social-search', () => void searchChats());
      const searchStatus = node('p', 'field-hint');
      const results = node('div', 'social-chat-results');
      fields.append(searchButton, searchStatus, results);
      fields.append(makeField(labels, labels.chatId, 'thread_id', 'text', '', {maxLength: 36}));
      const existing = node('div', 'social-linked-chats');
      for (const chat of (options.chats || []).filter((item) => item.account_ids?.includes(options.account?.id))) {
        const row = node('div', 'social-linked-chat');
        row.append(node('span', '', chat.title));
        row.append(button(labels.removeLink, 'social-unbind', async () => {
          await run('unbind', {account_id: options.account.id, thread_id: chat.id}, false);
        }, 'text-button'));
        existing.append(row);
      }
      if (existing.childElementCount) {
        fields.append(node('div', 'side-sec', labels.linkedChats), existing);
      }

      async function searchChats() {
        searchButton.disabled = true;
        searchStatus.textContent = '';
        results.replaceChildren();
        try {
          const response = await options.request('chats', {query: get('query')});
          const chats = response.chats || [];
          searchStatus.textContent = response.chat_source === 'unavailable'
            ? labels.chatsUnavailable : labels.count(chats.length);
          if (!chats.length && response.chat_source !== 'unavailable') results.append(node('p', 'msgs-note', labels.noChats));
          for (const chat of chats) {
            const result = button(chat.title, 'social-chat', () => {
              form.elements.thread_id.value = chat.id;
              searchStatus.textContent = `${labels.selected}: ${chat.title}`;
            }, 'srow');
            result.append(node('span', 'tm', chat.updated_at || ''));
            results.append(result);
          }
        } catch {
          searchStatus.textContent = labels.chatsUnavailable;
        } finally {
          searchButton.disabled = false;
        }
      }
    }

    const actions = node('div', 'social-edit-actions');
    actions.append(button(labels.cancel, 'social-cancel', () => {
      if (options.onCancel) options.onCancel(); else close(host);
    }));
    const submit = node('button', 'btn', labels.save);
    submit.type = 'submit';
    actions.append(submit);
    form.append(heading, fields, error, actions);
    host.replaceChildren(form);

    async function run(action, payload, shouldClose = true) {
      submit.disabled = true;
      error.hidden = true;
      try {
        const result = await options.request(action, payload);
        if (!form.isConnected) return result;
        if (options.onDone) await options.onDone(action, result, {close: shouldClose});
        if (shouldClose && form.isConnected) close(host);
        return result;
      } catch (cause) {
        error.textContent = cause?.message || labels.workError;
        error.hidden = false;
        return null;
      } finally {
        if (activeHost === host) submit.disabled = false;
      }
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      let payload;
      if (options.action === 'account') {
        payload = {
          id: options.account?.id,
          platform: options.account?.platform || get('platform'),
          name: get('name'),
          handle: options.account?.status === 'verified' ? options.account.handle : get('handle'),
        };
      } else if (options.action === 'bind') {
        const threadId = get('thread_id').replace(/^codex:\/\/threads\//i, '');
        if (!/^[a-f0-9-]{36}$/i.test(threadId)) {
          error.textContent = labels.chatId;
          error.hidden = false;
          return;
        }
        payload = {account_id: options.account.id, thread_id: threadId};
      } else if (options.action === 'publication') {
        const occurred = get('occurred_at');
        payload = {
          account_id: options.account.id,
          title: get('title'),
          occurred_at: occurred ? `${occurred}:00+08:00` : '',
          status: get('status'),
          url: get('url'),
          thread_id: get('thread_id'),
        };
      } else if (options.action === 'screenshot') {
        const file = selectedImage || form.elements.image.files?.[0];
        if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
          error.textContent = file ? labels.unsupported : labels.missingImage;
          error.hidden = false;
          return;
        }
        let data;
        try {
          data = await imageData(file);
        } catch (cause) {
          error.textContent = cause?.message || labels.workError;
          error.hidden = false;
          return;
        }
        payload = {publication_id: options.record.id, data};
      } else {
        return;
      }
      await run(options.action, payload);
    });

    const first = fields.querySelector('input:not([disabled]), select:not([disabled])');
    first?.focus();
  }

  function imageData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(String(reader.result).split(',')[1] || ''));
      reader.addEventListener('error', () => reject(new Error('Could not read screenshot')));
      reader.readAsDataURL(file);
    });
  }

  return {open, close, active};
})();
