(() => {
  'use strict';

  const button = document.getElementById('codexUsageScope');
  const sidebar = document.getElementById('usageSidebar');
  if (!button || !sidebar) return;
  const svgNS = 'http://www.w3.org/2000/svg';
  let numberFormat = new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 });
  let integerFormat = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });
  let copy = {};
  let available = false;
  let open = false;
  let loading = false;
  let pollTimer = 0;
  let epoch = 0;
  let controller = null;
  let data = { rows: [], projects: {}, status: {} };
  const state = { range: '30', start: '', end: '', model: '', project: '', grain: 'day', metric: 'tokens', ranking: 'project', expanded: false };

  const translations = {
    en: {
      metric: 'Display metric', scope: 'Token usage', title: 'Codex token usage', subtitle: 'Local usage records · grouped by model, project and time', refresh: 'Scan new records', ranges: ['7 days', '30 days', 'All', 'Custom'], model: 'Model', project: 'Project', allModels: 'All models', allProjects: 'All projects', clear: 'Clear filters', tokens: 'Tokens', input: 'Input', apiCost: 'API equivalent estimate', tokensMetric: 'Total tokens', costMetric: 'API equivalent estimate', costHidden: 'On demand', cacheRate: 'Cached input', coverage: 'Usage records', daily: 'Daily usage', grains: ['Hour', 'Day', 'Week', 'Month'], component: 'Token composition', reasoning: 'Reasoning is included in output', cachedInput: 'Cached input', otherInput: 'Other input', output: 'Output', projects: 'Projects', models: 'Models', rankings: 'Usage rankings', rankMetric: 'Ranked by current metric', showAll: 'Show all', collapse: 'Collapse', scanning: 'Scanning local usage logs', updated: 'Updated from local logs', empty: 'No records in this range', unavailable: 'Local usage data is unavailable', loadError: 'Could not read local usage data', partial: 'Some local records could not be read', unpriced: 'Some models have no known rate', estimateSource: 'OpenAI Standard short-context API token rates. Long-context, speed-mode and tool charges are excluded.', billing: 'Actual subscription or credit usage is available in OpenAI usage and billing. Actual charges are not recorded in local logs.', actual: 'Actual charges: not recorded in local logs', priceSource: 'API pricing', usageSource: 'OpenAI usage and billing', scanError: 'Scan request failed', filters: 'Usage filters', ranking: 'Ranking', close: 'Close ranking panel', hourly: 'Latest 36 recorded hours', costOnly: 'Priced models only', allPriced: 'All models have a known rate', measured: 'Local usage increments', seven: '7-day range', thirty: '30-day range', custom: 'Custom date range', estimateOnly: 'Estimate only', noData: 'No local usage records were found.',
    },
    'zh-Hans': {
      metric: '显示指标', scope: 'Token 用量', title: 'Codex Token 用量', subtitle: '本机用量记录 · 按模型、项目和时间查看', refresh: '扫描新记录', ranges: ['7 天', '30 天', '全部', '自定义'], model: '模型', project: '项目', allModels: '全部模型', allProjects: '全部项目', clear: '清除筛选', tokens: 'Token', input: '输入', apiCost: 'API 等价估算', tokensMetric: 'Token 总量', costMetric: 'API 等价估算', costHidden: '按需显示', cacheRate: '缓存输入', coverage: '用量记录', daily: '每日用量', grains: ['按小时', '按日', '按周', '按月'], component: 'Token 构成', reasoning: '推理 Token 已计入输出', cachedInput: '缓存输入', otherInput: '其他输入', output: '输出', projects: '项目', models: '模型', rankings: '用量排行', rankMetric: '按当前指标排序', showAll: '显示全部', collapse: '收起', scanning: '正在扫描本机用量日志', updated: '已从本机日志更新', empty: '所选范围没有记录', unavailable: '本机用量数据不可用', loadError: '无法读取本机用量数据', partial: '部分本机记录无法读取', unpriced: '部分模型没有已知费率', estimateSource: 'OpenAI 标准短上下文 API 费率估算，不含长上下文、加速模式和工具调用费用。', billing: '实际订阅或 credits 用量请查看 OpenAI 官方 Usage / Billing。本机日志不记录实际扣款。', actual: '实际扣款：本机日志未记录', priceSource: 'API 费率', usageSource: 'OpenAI 用量与计费', scanError: '扫描请求失败', filters: '用量筛选', ranking: '用量排行', close: '关闭排行侧栏', hourly: '最近 36 个有记录的小时', costOnly: '仅含已知费率模型', allPriced: '全部模型均有已知费率', measured: '本机用量增量', seven: '7 天范围', thirty: '30 天范围', custom: '自定义日期范围', estimateOnly: '仅作估算', noData: '没有找到本机用量记录。',
    },
    'zh-Hant': {
      metric: '顯示指標', scope: 'Token 用量', title: 'Codex Token 用量', subtitle: '本機用量記錄 · 依模型、專案和時間查看', refresh: '掃描新記錄', ranges: ['7 天', '30 天', '全部', '自訂'], model: '模型', project: '專案', allModels: '全部模型', allProjects: '全部專案', clear: '清除篩選', tokens: 'Token', input: '輸入', apiCost: 'API 等值估算', tokensMetric: 'Token 總量', costMetric: 'API 等值估算', costHidden: '按需顯示', cacheRate: '快取輸入', coverage: '用量記錄', daily: '每日用量', grains: ['按小時', '按日', '按週', '按月'], component: 'Token 組成', reasoning: '推理 Token 已計入輸出', cachedInput: '快取輸入', otherInput: '其他輸入', output: '輸出', projects: '專案', models: '模型', rankings: '用量排行', rankMetric: '依目前指標排序', showAll: '顯示全部', collapse: '收合', scanning: '正在掃描本機用量記錄', updated: '已從本機記錄更新', empty: '所選範圍沒有記錄', unavailable: '本機用量資料無法使用', loadError: '無法讀取本機用量資料', partial: '部分本機記錄無法讀取', unpriced: '部分模型沒有已知費率', estimateSource: 'OpenAI 標準短上下文 API 費率估算，不含長上下文、加速模式和工具呼叫費用。', billing: '實際訂閱或 credits 用量請查看 OpenAI 官方 Usage / Billing。本機記錄不含實際扣款。', actual: '實際扣款：本機記錄未提供', priceSource: 'API 費率', usageSource: 'OpenAI 用量與計費', scanError: '掃描請求失敗', filters: '用量篩選', ranking: '用量排行', close: '關閉排行側欄', hourly: '最近 36 個有記錄的小時', costOnly: '僅含已知費率模型', allPriced: '全部模型皆有已知費率', measured: '本機用量增量', seven: '7 天範圍', thirty: '30 天範圍', custom: '自訂日期範圍', estimateOnly: '僅供估算', noData: '找不到本機用量記錄。',
    },
  };

  const $ = (selector) => document.querySelector(selector);
  const tr = (key) => copy[key] ?? translations.en[key] ?? key;
  const compact = (number) => numberFormat.format(Math.max(0, number || 0));
  const full = (number) => integerFormat.format(Math.max(0, Math.round(number || 0)));
  const currency = (number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Math.max(0, number || 0));

  function localeKey(code = document.documentElement.lang) {
    if (/^zh-Hans|^zh-CN|^zh$/.test(code)) return 'zh-Hans';
    if (/^zh-Hant|^zh-TW|^zh-HK/.test(code)) return 'zh-Hant';
    return 'en';
  }

  function setLocale(code) {
    copy = translations[localeKey(code)] || translations.en;
    const numberLocale = code === 'zh-Hans' ? 'zh-CN' : code === 'zh-Hant' ? 'zh-TW' : code || 'en';
    numberFormat = new Intl.NumberFormat(numberLocale, { notation: 'compact', maximumFractionDigits: 1 });
    integerFormat = new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 0 });
    document.querySelectorAll('[data-cu]').forEach((element) => { element.textContent = tr(element.dataset.cu); });
    document.querySelectorAll('[data-cu-range]').forEach((element) => { element.textContent = tr('ranges')[Number(element.dataset.cuRange)]; });
    document.querySelectorAll('[data-cu-grain]').forEach((element) => { element.textContent = tr('grains')[Number(element.dataset.cuGrain)]; });
    button.setAttribute('aria-label', tr('scope'));
    button.title = tr('scope');
    document.getElementById('cuProjectMode').textContent = tr('projects');
    document.getElementById('cuModelMode').textContent = tr('models');
    document.getElementById('cuMetricTokens').textContent = tr('tokens');
    document.getElementById('cuMetricCost').textContent = localeKey(code) === 'en' ? 'API equivalent' : localeKey(code) === 'zh-Hant' ? 'API 等值' : 'API 等价';
    document.getElementById('cuSideClose').setAttribute('aria-label', localeKey(code) === 'en' ? 'Back' : localeKey(code) === 'zh-Hant' ? '返回' : '返回');
    document.getElementById('cuSideHide').setAttribute('aria-label', localeKey(code) === 'en' ? 'Hide panel' : localeKey(code) === 'zh-Hant' ? '隱藏側欄' : '隐藏侧栏');
    document.getElementById('cuSideTitle').textContent = tr('title');
    document.getElementById('cuRefresh').setAttribute('aria-label', tr('refresh'));
    document.getElementById('cuRefresh').title = tr('refresh');
    if (open) render();
  }

  function localDate(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }

  function shiftDate(day, offset) {
    const date = new Date(`${day}T12:00:00+08:00`);
    date.setUTCDate(date.getUTCDate() + offset);
    return localDate(date);
  }

  function daysBetween(start, end) {
    return Math.floor((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86400000) + 1;
  }

  function dateLabel(day) {
    return new Intl.DateTimeFormat(document.documentElement.lang || undefined, { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric' }).format(new Date(`${day}T12:00:00+08:00`));
  }

  function rangeDates() {
    const today = localDate();
    if (state.range === 'all') return [data.rows.reduce((minimum, row) => row.day < minimum ? row.day : minimum, today), today];
    if (state.range === 'custom') return [state.start || shiftDate(today, -29), state.end || today];
    const days = Number(state.range) || 30;
    return [shiftDate(today, 1 - days), today];
  }

  function parseRows(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((row) => {
      if (!Array.isArray(row) || row.length < 11 || typeof row[0] !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(row[0])) return [];
      if (!row.slice(4, 9).every((value) => Number.isFinite(Number(value)))) return [];
      return [{
        day: row[0], hour: Math.max(0, Math.min(23, Number(row[1]) || 0)), model: String(row[2] || 'Unknown model'), projectId: String(row[3] || ''),
      input: Math.max(0, Number(row[4])), cached: Math.max(0, Number(row[5])), output: Math.max(0, Number(row[6])),
        reasoning: Math.max(0, Number(row[7])), cacheWrite: Math.max(0, Number(row[8])),
        cost: row[9] == null || !Number.isFinite(Number(row[9])) ? null : Math.max(0, Number(row[9])), samples: Math.max(0, Number(row[10]) || 0),
      }];
    });
  }

  function visibleRows() {
    const [start, end] = rangeDates();
    return data.rows.filter((row) => row.day >= start && row.day <= end && (!state.model || row.model === state.model) && (!state.project || row.projectId === state.project));
  }

  function updateSelect(select, items, firstLabel, selected) {
    const options = document.createDocumentFragment();
    const first = document.createElement('option'); first.value = ''; first.textContent = firstLabel; options.append(first);
    items.forEach(([value, text]) => { const option = document.createElement('option'); option.value = value; option.textContent = text; options.append(option); });
    select.replaceChildren(options);
    if (items.some(([value]) => value === selected)) select.value = selected;
  }

  function populateFilters() {
    const models = [...new Set(data.rows.map((row) => row.model))].sort((a, b) => a.localeCompare(b));
    const projectNames = new Map();
    data.rows.forEach((row) => {
      if (!projectNames.has(row.projectId)) {
        const info = data.projects?.[row.projectId] || {};
        projectNames.set(row.projectId, String(info.name || info.path || 'Unassigned project'));
      }
    });
    updateSelect($('#cuModel'), models.map((model) => [model, model]), tr('allModels'), state.model);
    updateSelect($('#cuProject'), [...projectNames.entries()].sort((a, b) => a[1].localeCompare(b[1])), tr('allProjects'), state.project);
  }

  function sum(rows) {
    return rows.reduce((total, row) => {
      total.input += row.input; total.cached += row.cached; total.output += row.output; total.records += row.samples;
      total.tokens += row.input + row.output;
      if (row.cost == null) { total.unpriced += row.input + row.output; total.unpricedRows++; }
      else { total.cost += row.cost; total.priced += row.input + row.output; }
      return total;
    }, { input: 0, cached: 0, output: 0, records: 0, tokens: 0, cost: 0, priced: 0, unpriced: 0, unpricedRows: 0 });
  }

  function renderSummary(rows) {
    const total = sum(rows);
    $('#cuTotalTokens').textContent = compact(total.tokens);
    $('#cuTotalTokens').title = `${full(total.tokens)} ${tr('tokens')}`;
    $('#cuTokensNote').textContent = `${compact(total.input)} ${tr('input')} · ${compact(total.output)} ${tr('output')}`;
    $('#cuTotalCost').textContent = state.metric === 'cost' && total.priced ? `≈ ${currency(total.cost)}` : state.metric === 'cost' ? '—' : tr('costHidden');
    $('#cuTotalCost').title = state.metric === 'cost' ? (total.priced ? `${currency(total.cost)} · ${tr('estimateOnly')}` : tr('unpriced')) : tr('apiCost');
    $('#cuCostNote').textContent = state.metric !== 'cost' ? tr('actual') : total.unpriced ? `${(100 * total.priced / (total.tokens || 1)).toFixed(1)}% priced tokens · ${tr('unpriced')}` : tr('allPriced');
    $('#cuCacheRate').textContent = total.input ? `${Math.min(100, 100 * total.cached / total.input).toFixed(1)}%` : '0%';
    $('#cuCacheNote').textContent = `${compact(total.cached)}`;
    $('#cuRecordCount').textContent = compact(total.records);
    const components = [
      ['Cached', 'cachedInput', total.cached],
      ['Input', 'otherInput', Math.max(0, total.input - total.cached)],
      ['Output', 'output', total.output],
    ];
    for (const [name, label, value] of components) {
      const detail = document.getElementById('cuComposition' + name);
      const bar = document.getElementById('cuBar' + name);
      const exact = `${tr(label)} · ${full(value)} ${tr('tokens')}`;
      detail.textContent = compact(value);
      detail.title = exact;
      bar.style.width = `${100 * value / (total.tokens || 1)}%`;
      bar.title = exact;
    }
    const [start, end] = rangeDates();
    $('#cuCoverageNote').textContent = `${Math.max(0, daysBetween(start, end))} ${localeKey() === 'en' ? 'days' : '天'} · ${tr('measured')}`;

    $('#cuCostRow').hidden = state.metric !== 'cost';
    $('#cuCostNote').hidden = state.metric !== 'cost';
  }

  function bucketRows(rows) {
    const buckets = new Map();
    rows.forEach((row) => {
      let key; let label;
      if (state.grain === 'hour') { key = `${row.day}T${String(row.hour).padStart(2, '0')}`; label = `${dateLabel(row.day)} ${String(row.hour).padStart(2, '0')}:00`; }
      else if (state.grain === 'week') {
        const date = new Date(`${row.day}T12:00:00+08:00`); const weekday = (date.getUTCDay() + 6) % 7;
        key = shiftDate(row.day, -weekday); label = dateLabel(key);
      } else if (state.grain === 'month') { key = row.day.slice(0, 7); label = key; }
      else { key = row.day; label = dateLabel(row.day); }
      if (!buckets.has(key)) buckets.set(key, { key, label, tokens: 0, cost: 0, priced: 0, unpriced: 0 });
      const bucket = buckets.get(key); bucket.tokens += row.input + row.output;
      if (row.cost == null) bucket.unpriced++; else { bucket.cost += row.cost; bucket.priced++; }
    });
    if (state.grain === 'day') {
      const [start, end] = rangeDates();
      if (start <= end && daysBetween(start, end) <= 366) for (let day = start; day <= end; day = shiftDate(day, 1)) {
        if (!buckets.has(day)) buckets.set(day, { key: day, label: dateLabel(day), tokens: 0, cost: 0, priced: 0, unpriced: 0 });
      }
    }
    return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
  }

  function drawChart(rows) {
    const svg = $('#cuChart'); const buckets = bucketRows(rows); const visible = state.grain === 'hour' ? buckets.slice(-36) : buckets;
    const metric = state.metric === 'cost' ? 'cost' : 'tokens'; const maximum = Math.max(1, ...visible.map((bucket) => bucket[metric]));
    const width = Math.max(260, Math.round(svg.getBoundingClientRect().width)); const height = 132;
    const right = 6; const top = 7; const bottom = 23; const chartHeight = height - top - bottom;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const labels = [maximum, maximum / 2, 0].map((value) => {
      const label = document.createElementNS(svgNS, 'text');
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('class', 'cu-axis-label');
      label.textContent = state.metric === 'cost' ? currency(value) : compact(value);
      return label;
    });
    svg.replaceChildren(...labels);
    const left = Math.max(43, 10 + Math.ceil(Math.max(...labels.map((label) => label.getComputedTextLength()))));
    const chartWidth = width - left - right;
    const elements = [];
    for (let tick = 0; tick <= 2; tick++) {
      const y = top + chartHeight * tick / 2; const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', String(left)); line.setAttribute('x2', String(width - right)); line.setAttribute('y1', String(y)); line.setAttribute('y2', String(y)); line.setAttribute('class', 'cu-grid-line'); elements.push(line);
      const label = labels[tick];
      label.setAttribute('x', String(left - 8));
      label.setAttribute('y', String(y + 3));
      elements.push(label);
    }
    const slot = visible.length ? chartWidth / visible.length : chartWidth; const barWidth = Math.max(.5, Math.min(12, slot * .65));
    visible.forEach((bucket, index) => {
      const value = bucket[metric]; const barHeight = value ? Math.max(1, chartHeight * value / maximum) : 0;
      const x = left + slot * index + (slot - barWidth) / 2; const y = top + chartHeight - barHeight;
      const bar = document.createElementNS(svgNS, 'rect'); bar.setAttribute('x', String(x)); bar.setAttribute('y', String(y)); bar.setAttribute('width', String(barWidth)); bar.setAttribute('height', String(barHeight));
      bar.setAttribute('rx', '2'); bar.setAttribute('class', `cu-bar${state.metric === 'cost' && bucket.unpriced ? ' unknown' : ''}`);
      const title = document.createElementNS(svgNS, 'title'); title.textContent = `${bucket.label} · ${state.metric === 'cost' ? (bucket.priced ? currency(bucket.cost) : '—') : `${full(bucket.tokens)} ${tr('tokens')}`}${bucket.unpriced ? ` · ${bucket.unpriced} unpriced groups` : ''}`;
      bar.append(title); elements.push(bar);
      if (index === 0 || index === visible.length - 1 || (index % Math.ceil(visible.length / 3) === 0 && index < visible.length - 2)) {
        const axis = document.createElementNS(svgNS, 'text'); axis.setAttribute('x', String(x + barWidth / 2)); axis.setAttribute('y', String(height - 8)); axis.setAttribute('text-anchor', index === 0 ? 'start' : index === visible.length - 1 ? 'end' : 'middle'); axis.setAttribute('class', 'cu-axis-label');
        axis.textContent = state.grain === 'hour' ? bucket.label.slice(-5) : bucket.label; elements.push(axis);
      }
    });
    if (!visible.length) { const empty = document.createElementNS(svgNS, 'text'); empty.setAttribute('x', String(width / 2)); empty.setAttribute('y', String(height / 2)); empty.setAttribute('text-anchor', 'middle'); empty.setAttribute('class', 'cu-chart-empty'); empty.textContent = tr('empty'); elements.push(empty); }
    svg.replaceChildren(...elements);
    svg.setAttribute('aria-label', `${state.metric === 'cost' ? tr('apiCost') : tr('tokens')} · ${visible.length}`);
    $('#cuChartTitle').textContent = state.grain === 'hour' ? tr('grains')[0] : state.grain === 'week' ? tr('grains')[2] : state.grain === 'month' ? tr('grains')[3] : tr('daily');
    $('#cuUnknownLegend').hidden = state.metric !== 'cost' || !visible.some((bucket) => bucket.unpriced);
    $('#cuChartLegend').textContent = state.metric === 'cost' ? tr('apiCost') : tr('tokensMetric');
    $('#cuChartRule').textContent = state.grain === 'hour' && buckets.length > 36 ? tr('hourly') : state.metric === 'cost' ? tr('costOnly') : tr('updated');
  }

  function rankGroups(rows, dimension) {
    const grouped = new Map();
    rows.forEach((row) => {
      const id = dimension === 'model' ? row.model : row.projectId;
      if (!grouped.has(id)) grouped.set(id, { id, tokens: 0, cost: 0, pricedTokens: 0, unpricedTokens: 0, records: 0 });
      const group = grouped.get(id); group.tokens += row.input + row.output; group.records += row.samples;
      if (row.cost == null) group.unpricedTokens += row.input + row.output;
      else { group.cost += row.cost; group.pricedTokens += row.input + row.output; }
    });
    return [...grouped.values()].map((group) => {
      if (dimension === 'model') { group.name = group.id; group.detail = group.unpricedTokens ? tr('unpriced') : `${compact(group.records)} ${tr('coverage').toLowerCase()}`; }
      else {
        const project = data.projects?.[group.id] || {};
        group.name = String(project.name || project.path || 'Unassigned project');
        group.detail = String(project.path || 'Codex project');
      }
      return group;
    });
  }

  function renderRankList(rows) {
    const dimension = state.ranking; const list = document.getElementById('cuRankList');
    const groups = rankGroups(rows, dimension); const key = state.metric === 'cost' ? 'cost' : 'tokens';
    groups.sort((a, b) => b[key] - a[key] || a.name.localeCompare(b.name));
    const visible = state.expanded ? groups : groups.slice(0, 8);
    const fragment = document.createDocumentFragment();
    if (!visible.length) { const empty = document.createElement('li'); empty.className = 'cu-rank-empty'; empty.textContent = tr('empty'); fragment.append(empty); }
    visible.forEach((group, index) => {
      const row = document.createElement('li');
      const button = document.createElement('button'); button.type = 'button'; button.className = 'srow cu-rank-button';
      const selected = (dimension === 'model' ? state.model : state.project) === group.id && Boolean(dimension === 'model' ? state.model : state.project);
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', `${group.name} · ${state.metric === 'cost' ? (group.pricedTokens ? currency(group.cost) : '—') : `${full(group.tokens)} ${tr('tokens')}`}`);
      const number = document.createElement('span'); number.className = 'cu-rank-number'; number.textContent = String(index + 1);
      const name = document.createElement('span'); name.className = 'nm'; name.textContent = group.name; name.title = group.name;
      const value = document.createElement('span'); value.className = 'tm'; value.textContent = state.metric === 'cost' ? (group.pricedTokens ? `≈ ${currency(group.cost)}` : '—') : compact(group.tokens);
      const detail = document.createElement('span'); detail.className = 'st';
      const detailText = document.createElement('span'); detailText.textContent = state.metric === 'cost' && group.unpricedTokens ? `${group.detail} · ${compact(group.tokens)} ${tr('tokens')}` : group.detail;
      detail.append(detailText); button.append(number, name, value, detail);
      button.addEventListener('click', () => {
        const field = dimension === 'model' ? 'model' : 'project'; state[field] = state[field] === group.id ? '' : group.id;
        $(`#cu${dimension === 'model' ? 'Model' : 'Project'}`).value = state[field]; render();
      });
      row.append(button); fragment.append(row);
    });
    if (groups.length > 8) {
      const row = document.createElement('li'); const more = document.createElement('button'); more.type = 'button'; more.className = 'cu-text-button cu-rank-more'; more.setAttribute('aria-expanded', String(state.expanded));
      more.textContent = state.expanded ? tr('collapse') : `${tr('showAll')} ${groups.length}`;
      more.addEventListener('click', () => { state.expanded = !state.expanded; render(); }); row.append(more); fragment.append(row);
    }
    list.replaceChildren(fragment);
    document.getElementById('cuProjectMode').classList.toggle('on', dimension === 'project');
    document.getElementById('cuProjectMode').setAttribute('aria-pressed', String(dimension === 'project'));
    document.getElementById('cuModelMode').classList.toggle('on', dimension === 'model');
    document.getElementById('cuModelMode').setAttribute('aria-pressed', String(dimension === 'model'));
    document.getElementById('cuRankSortNote').textContent = tr('rankMetric');
  }

  function renderStatus() {
    const status = data.status || {}; const statusLabel = document.getElementById('cuStatus');
    const scanning = Boolean(status.running); statusLabel.dataset.state = scanning ? 'scanning' : status.error ? 'error' : 'ready';
    statusLabel.textContent = scanning ? `${tr('scanning')}${Number(status.total) ? ` · ${Number(status.scanned) || 0}/${Number(status.total)}` : ''}` : status.error ? tr('loadError') : tr('updated');
    const message = $('#cuMessage');
    const failures = Number(status.unreadable) || 0; const invalid = Number(status.invalid) || 0; const missing = Number(status.missing) || 0;
    const hasFailures = Boolean(status.error || failures || invalid || missing);
    message.classList.toggle('visible', hasFailures);
    message.dataset.kind = status.error ? 'error' : 'info';
    message.textContent = status.error ? tr('loadError') : `${tr('partial')}${failures ? ` · ${failures}` : ''}${missing ? ` · ${missing}` : ''}${invalid ? ` · ${invalid}` : ''}`;
    document.getElementById('cuEstimateNote').classList.toggle('visible', state.metric === 'cost');
    document.getElementById('cuBillingNote').classList.toggle('visible', state.metric === 'cost');
    document.getElementById('cuPricingDate').textContent = state.metric === 'cost' && data.pricingDate ? ` · ${data.pricingDate}` : '';
    const progress = status.running && Number(status.total) > 0 ? ` · ${Math.min(100, Math.round((Number(status.scanned) || 0) * 100 / Number(status.total)))}%` : '';
    document.getElementById('cuScanProgress').textContent = progress;
  }

  function render() {
    populateFilters();
    const rows = visibleRows();
    renderSummary(rows); drawChart(rows); renderRankList(rows); renderStatus();
    $('#cuModel').value = state.model; $('#cuProject').value = state.project;
    document.querySelectorAll('#cuRange button').forEach((rangeButton) => {
      const on = rangeButton.dataset.range === state.range; rangeButton.classList.toggle('on', on); rangeButton.setAttribute('aria-pressed', String(on));
    });
    document.querySelectorAll('#cuMetric button').forEach((metricButton) => {
      const on = metricButton.dataset.metric === state.metric; metricButton.classList.toggle('on', on); metricButton.setAttribute('aria-pressed', String(on));
    });
    $('#cuCustomRange').classList.toggle('visible', state.range === 'custom');
    $('#cuDateStart').value = state.start; $('#cuDateEnd').value = state.end;
  }

  function setUnavailable() {
    available = false;
    close();
    button.hidden = true;
  }

  async function checkAvailability() {
    try {
      const response = await fetch('/api/codex-usage/status', { cache: 'no-store', headers: { accept: 'application/json' } });
      if (!response.ok) { setUnavailable(); return false; }
      const status = await response.json();
      available = Boolean(status && status.available === true);
      button.hidden = !available;
      return available;
    } catch {
      setUnavailable(); return false;
    }
  }

  function queuePoll() {
    clearTimeout(pollTimer); pollTimer = 0;
    if (open && data.status?.running && !document.hidden) pollTimer = setTimeout(() => loadReport(epoch), 2300);
  }

  async function loadReport(activeEpoch = epoch) {
    if (!open || !available || loading) return;
    loading = true; controller = new AbortController();
    try {
      const response = await fetch('/api/codex-usage', { cache: 'no-store', signal: controller.signal, headers: { accept: 'application/json' } });
      if (!response.ok) { if (response.status === 404 || response.status === 403) setUnavailable(); else throw new Error(tr('loadError')); return; }
      const next = await response.json();
      if (activeEpoch !== epoch || !open) return;
      if (!next || next.available === false || !Array.isArray(next.rows)) { setUnavailable(); return; }
      data = { rows: parseRows(next.rows), projects: next.projects && typeof next.projects === 'object' ? next.projects : {}, status: next.status || {}, pricingDate: next.pricingDate || '' };
      render();
    } catch (error) {
      if (error.name !== 'AbortError' && activeEpoch === epoch) {
        data.status = { error: true };
        renderStatus();
      }
    } finally {
      if (activeEpoch === epoch) { loading = false; controller = null; queuePoll(); }
    }
  }

  async function refresh() {
    if (!open || !available) return;
    const refreshButton = document.getElementById('cuRefresh'); refreshButton.disabled = true;
    try {
      const response = await fetch('/api/codex-usage/refresh', { method: 'POST', cache: 'no-store', headers: { 'x-whatsmyagentdoing': 'codex-usage', accept: 'application/json' } });
      if (response.status !== 202 && !response.ok) throw new Error(tr('scanError'));
      data.status = { ...(data.status || {}), running: true };
      renderStatus(); await loadReport(epoch);
    } catch { data.status = { ...(data.status || {}), error: true }; renderStatus(); }
    finally { refreshButton.disabled = false; }
  }

  async function activate() {
    if (!available && !(await checkAvailability())) return;
    if (open) { close(); return; }
    open = true; epoch++;
    document.body.classList.add('usage-mode'); sidebar.hidden = false;
    button.classList.add('on'); button.setAttribute('aria-pressed', 'true');
    window.dispatchEvent(new Event('codex-usage-open'));
    requestAnimationFrame(() => { if (open) drawChart(visibleRows()); });
    await loadReport(epoch);
  }

  function close() {
    if (!open) return;
    open = false; epoch++; clearTimeout(pollTimer); pollTimer = 0; controller?.abort(); loading = false; controller = null;
    document.body.classList.remove('usage-mode'); sidebar.hidden = true;
    button.classList.remove('on'); button.setAttribute('aria-pressed', 'false');
    window.dispatchEvent(new Event('codex-usage-close'));
  }

  function configureInputs() {
    $('#cuRange').addEventListener('click', (event) => {
      const target = event.target.closest('[data-range]'); if (!target) return;
      state.range = target.dataset.range;
      if (state.range === 'custom') {
        const [start, end] = rangeDates(); state.start ||= start; state.end ||= end;
      }
      render();
    });
    $('#cuDateStart').addEventListener('change', (event) => { state.start = event.target.value; render(); });
    $('#cuDateEnd').addEventListener('change', (event) => { state.end = event.target.value; render(); });
    $('#cuModel').addEventListener('change', (event) => { state.model = event.target.value; render(); });
    $('#cuProject').addEventListener('change', (event) => { state.project = event.target.value; render(); });
    $('#cuGrain').addEventListener('change', (event) => { state.grain = event.target.value; render(); });
    $('#cuMetric').addEventListener('click', (event) => {
      const target = event.target.closest('[data-metric]'); if (!target) return;
      state.metric = target.dataset.metric; render();
    });
    $('#cuRankingMode').addEventListener('click', (event) => {
      const target = event.target.closest('[data-ranking]'); if (!target) return;
      state.ranking = target.dataset.ranking; state.expanded = false; render();
    });
    $('#cuRefresh').addEventListener('click', refresh);
    $('#cuReset').addEventListener('click', () => {
      state.range = '30'; state.start = ''; state.end = ''; state.model = ''; state.project = ''; state.grain = 'day'; state.metric = 'tokens'; state.expanded = false; render();
    });
    document.getElementById('cuSideHide').addEventListener('click', () => document.getElementById('sideHide').click());
    document.getElementById('cuSideClose').addEventListener('click', close);
    window.addEventListener('resize', () => { if (open) drawChart(visibleRows()); }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { clearTimeout(pollTimer); pollTimer = 0; }
      else if (open) { if (data.status?.running) queuePoll(); else void loadReport(epoch); }
    });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && open && !event.defaultPrevented) { event.preventDefault(); event.stopImmediatePropagation(); close(); button.focus(); } });
    button.addEventListener('click', activate);
  }

  function sideTabLabel() { return tr('scope'); }
  function isOpen() { return open; }

  window.CodexUsage = { isOpen, close, setLocale, sideTabLabel, refresh };
  configureInputs(); setLocale();
  if (window.matchMedia('(display-mode: picture-in-picture)').matches) return;
  void checkAvailability();
})();
