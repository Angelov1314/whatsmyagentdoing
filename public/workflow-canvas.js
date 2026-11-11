(() => {
  const $ = (id) => document.getElementById(id);
  const dialog = $('workflowCanvasDialog');
  const launch = $('workflowCanvasOpen');
  const close = $('workflowCanvasClose');
  const picker = $('workflowCanvasSelect');
  const refresh = $('workflowCanvasRefresh');
  const frame = $('workflowCanvasFrame');
  const status = $('workflowCanvasStatus');
  const empty = $('workflowCanvasEmpty');
  const emptyTitle = $('workflowCanvasEmptyTitle');
  const emptyText = $('workflowCanvasEmptyText');
  const libraryDialog = $('libraryDialog');
  if (!dialog || !launch || !close || !picker || !refresh || !frame || !status || !empty) return;

  const copy = {
    zh: {
      open: '工作流', title: '工作流', eyebrow: 'MYOFFICE · WORKFLOWS',
      intro: '选择已生成的工作流图，在此查看完整流程。', close: '关闭工作流',
      select: '已生成的工作流', refresh: '刷新列表', loading: '正在读取工作流……',
      opening: '正在打开工作流图……', emptyTitle: '还没有生成的工作流',
      emptyText: '请先使用 $workflow-canvas 生成一张工作流图，再刷新列表。',
      emptyOption: '暂无可用工作流', errorTitle: '暂时无法读取工作流',
      errorText: '请检查 MyOffice 连接后重试。', documentErrorTitle: '无法打开这张工作流图',
      documentErrorText: '文件可能已更改或移除。请刷新列表后重试。',
      skillMissingTitle: '没有找到对应的工作流图',
      skillMissingText: '这张技能图书对应的工作流可能已移除。可从列表中选择其他工作流。',
      frameTitle: '工作流画布',
    },
    en: {
      open: 'Workflow', title: 'Workflow', eyebrow: 'MYOFFICE · WORKFLOWS',
      intro: 'Choose a generated workflow to explore its full path.', close: 'Close workflow',
      select: 'Generated workflows', refresh: 'Refresh list', loading: 'Loading workflows…',
      opening: 'Opening workflow canvas…', emptyTitle: 'No workflows generated yet',
      emptyText: 'Run $workflow-canvas to generate a workflow, then refresh this list.',
      emptyOption: 'No workflows available', errorTitle: 'Workflows could not be loaded',
      errorText: 'Check the MyOffice connection and try again.', documentErrorTitle: 'This workflow could not be opened',
      documentErrorText: 'The file may have changed or been removed. Refresh the list and try again.',
      skillMissingTitle: 'No workflow matches this skill',
      skillMissingText: 'Its workflow may have been removed. You can choose another workflow from the list.',
      frameTitle: 'Workflow canvas',
    },
  };
  const isChinese = () => /^zh(?:-|$)/i.test(document.documentElement.lang || '');
  const local = () => isChinese() ? copy.zh : copy.en;
  let catalog = [];
  let lastOpener = null;
  let requestNumber = 0;
  let frameRequestNumber = 0;
  let openActionNumber = 0;
  let emptyStateKind = 'empty';
  let statusStateKind = '';

  function listWorkflows(force = false) {
    if (!force && Array.isArray(catalog)) return Promise.resolve(catalog);
    return fetch('/api/workflows', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data?.workflows)) throw new Error('Invalid workflow catalog');
        catalog = data.workflows.filter((item) => typeof item?.id === 'string'
          && typeof item.title === 'string' && Array.isArray(item.skills));
        return catalog;
      });
  }

  function setStatus(message = '', kind = '') {
    status.textContent = message;
    status.hidden = !message;
    statusStateKind = message ? kind : '';
  }

  function setEmptyState(kind) {
    const t = local();
    emptyStateKind = kind || 'empty';
    if (kind === 'error') {
      emptyTitle.textContent = t.errorTitle;
      emptyText.textContent = t.errorText;
    } else if (kind === 'document-error') {
      emptyTitle.textContent = t.documentErrorTitle;
      emptyText.textContent = t.documentErrorText;
    } else if (kind === 'skill-missing') {
      emptyTitle.textContent = t.skillMissingTitle;
      emptyText.textContent = t.skillMissingText;
    } else {
      emptyTitle.textContent = t.emptyTitle;
      emptyText.textContent = t.emptyText;
    }
    empty.hidden = false;
  }

  function clearFrame() {
    frameRequestNumber += 1;
    frame.removeAttribute('src');
    frame.hidden = true;
  }

  function updateLabels() {
    const t = local();
    $('workflowCanvasOpenLabel').textContent = t.open;
    $('workflowCanvasTitle').textContent = t.title;
    $('workflowCanvasEyebrow').textContent = t.eyebrow;
    $('workflowCanvasIntro').textContent = t.intro;
    $('workflowCanvasSelectLabel').textContent = t.select;
    refresh.textContent = t.refresh;
    close.setAttribute('aria-label', t.close);
    frame.title = t.frameTitle;
    if (!catalog.length && picker.options.length) picker.options[0].textContent = t.emptyOption;
    if (!status.hidden) setStatus(statusStateKind === 'loading' ? t.loading : t.opening, statusStateKind);
    if (!empty.hidden) setEmptyState(emptyStateKind);
  }

  function workflowDocumentUrl(item, embed = false, skillName = '') {
    const url = new URL(`/workflow-canvas/${encodeURIComponent(item.id)}`, location.href);
    if (embed) url.searchParams.set('embed', '1');
    if (skillName && item.skills.includes(skillName)) url.searchParams.set('skill', skillName);
    return url.href;
  }

  async function openWorkflow(item, skillName = '') {
    clearFrame();
    const request = ++frameRequestNumber;
    setStatus(local().opening, 'opening');
    empty.hidden = true;
    try {
      const src = workflowDocumentUrl(item, true, skillName);
      const response = await fetch(src, { headers: { Accept: 'text/html' }, cache: 'no-store' });
      if (!response.ok || !String(response.headers.get('content-type') || '').startsWith('text/html')) {
        throw new Error(`HTTP ${response.status}`);
      }
      if (request !== frameRequestNumber || !dialog.open) return false;
      frame.src = src;
      frame.hidden = false;
      empty.hidden = true;
      setStatus('');
      return true;
    } catch {
      if (request !== frameRequestNumber || !dialog.open) return false;
      clearFrame();
      setEmptyState('document-error');
      setStatus('');
      return false;
    }
  }

  async function reloadCatalog({ preferredId = '', preferredSkill = '' } = {}) {
    const request = ++requestNumber;
    clearFrame();
    empty.hidden = true;
    picker.replaceChildren();
    picker.disabled = true;
    setStatus(local().loading, 'loading');
    try {
      const items = await listWorkflows(true);
      if (request !== requestNumber || !dialog.open) return;
      picker.replaceChildren();
      if (!items.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = local().emptyOption;
        picker.append(option);
        picker.disabled = true;
        setStatus('');
        setEmptyState('empty');
        return;
      }
      for (const item of items) {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.title;
        picker.append(option);
      }
      picker.disabled = false;
      setStatus('');
      const skillMatch = preferredSkill && items.find((item) => item.skills.includes(preferredSkill));
      if (preferredSkill && !skillMatch) {
        setEmptyState('skill-missing');
        return;
      }
      const selected = skillMatch || items.find((item) => item.id === preferredId) || items[0];
      picker.value = selected.id;
      await openWorkflow(selected, preferredSkill);
    } catch {
      if (request !== requestNumber || !dialog.open) return;
      catalog = [];
      picker.replaceChildren();
      const option = document.createElement('option');
      option.value = '';
      option.textContent = local().emptyOption;
      picker.append(option);
      picker.disabled = true;
      setStatus('');
      setEmptyState('error');
    }
  }

  function showDialog(opener, options = {}) {
    openActionNumber += 1;
    lastOpener = opener?.isConnected ? opener : launch;
    if (!dialog.open) dialog.showModal();
    close.focus({ preventScroll: true });
    reloadCatalog(options);
  }

  async function openForSkill(skillName) {
    if (typeof skillName !== 'string' || !skillName || document.body.dataset.workflowCanvasDisabled === 'true') return false;
    const action = ++openActionNumber;
    let items = null;
    try { items = await listWorkflows(true); } catch { /* The dialog will show the retryable catalog error. */ }
    if (action !== openActionNumber) return false;
    const item = items?.find((workflow) => workflow.skills.includes(skillName));
    if (libraryDialog?.open) {
      const closed = new Promise((resolve) => libraryDialog.addEventListener('close', resolve, { once: true }));
      libraryDialog.close();
      await closed;
    }
    if (action !== openActionNumber) return false;
    showDialog(launch, { preferredId: item?.id || '', preferredSkill: skillName });
    return true;
  }

  launch.hidden = document.body.dataset.workflowCanvasDisabled === 'true';
  window.MyOfficeWorkflowCanvas = Object.freeze({ list: listWorkflows, openForSkill });
  launch.addEventListener('click', () => showDialog(launch));
  close.addEventListener('click', () => dialog.close());
  refresh.addEventListener('click', () => reloadCatalog({ preferredId: picker.value }));
  picker.addEventListener('change', () => {
    const selected = catalog.find((item) => item.id === picker.value);
    if (selected) openWorkflow(selected);
    else { clearFrame(); setStatus(''); setEmptyState('empty'); }
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('cancel', (event) => {
    if (document.activeElement === frame) event.preventDefault();
  });
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    requestNumber += 1;
    clearFrame();
    catalog = [];
    picker.replaceChildren();
    picker.disabled = true;
    setStatus('');
    setEmptyState('empty');
    const opener = lastOpener;
    lastOpener = null;
    if (opener?.isConnected && !opener.hidden) opener.focus({ preventScroll: true });
  });
  new MutationObserver(updateLabels).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  updateLabels();
})();
