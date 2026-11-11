'use strict';

const badgeNames = {
  first: '初次开工',
  sessions5: '五次出发',
  active3: '三日常来',
  streak3: '三日连胜',
  toolbox: '工具箱',
  sessions25: '持续创作',
  active10: '十日常来',
  streak7: '七日连胜',
};

const entriesEl = document.querySelector('#entries');
const totalEl = document.querySelector('#total');
const pageLabel = document.querySelector('#page-label');
const prevButton = document.querySelector('#prev');
const nextButton = document.querySelector('#next');
const metricSelect = document.querySelector('#ranking-metric');
let requestSequence = 0;
let page = 1;
let pages = 1;

function initials(alias) {
  return Array.from(alias.trim())[0] || '✳';
}

function render(entries) {
  entriesEl.replaceChildren();
  if (!entries.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.className = 'empty';
    cell.textContent = '榜单还空着，第一枚徽章正等着它的主人。';
    row.append(cell);
    entriesEl.append(row);
    return;
  }
  for (const entry of entries) {
    const row = document.createElement('tr');
    const rankCell = document.createElement('td');
    rankCell.className = `rank${entry.rank <= 3 ? ' top' : ''}`;
    rankCell.textContent = String(entry.rank).padStart(2, '0');

    const personCell = document.createElement('td');
    const person = document.createElement('div');
    person.className = 'person';
    const avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = initials(entry.alias);
    const name = document.createElement('span');
    name.textContent = entry.alias;
    person.append(avatar, name);
    personCell.append(person);

    const badgesCell = document.createElement('td');
    const badges = document.createElement('div');
    badges.className = 'badges';
    for (const id of entry.badges) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = badgeNames[id] || '已解锁';
      badges.append(badge);
    }
    badgesCell.append(badges);

    const scoreCell = document.createElement('td');
    scoreCell.className = 'score';
    scoreCell.textContent = metricSelect.value ? Number(entry.value).toLocaleString('zh-CN') : `${entry.score} pts`;
    row.append(rankCell, personCell, badgesCell, scoreCell);
    entriesEl.append(row);
  }
}

async function loadPage(nextPage) {
  const sequence = ++requestSequence;
  const metric = metricSelect.value;
  prevButton.disabled = nextButton.disabled = true;
  document.querySelector('#board-title').textContent = metricSelect.selectedOptions[0].textContent;
  document.querySelector('.score-head').textContent = metric === 'tokens' ? 'Token' : metric ? '数量' : '积分';
  entriesEl.replaceChildren();
  const loadingRow = document.createElement('tr');
  const loadingCell = document.createElement('td');
  loadingCell.colSpan = 4;
  loadingCell.className = 'empty';
  loadingCell.textContent = '正在打开荣誉墙…';
  loadingRow.append(loadingCell);
  entriesEl.append(loadingRow);
  try {
    const response = await fetch(`/api/v1/leaderboard?page=${nextPage}${metric ? '&metric=' + encodeURIComponent(metric) : ''}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('network response error');
    const data = await response.json();
    if (sequence !== requestSequence) return;
    page = data.page;
    pages = data.pages;
    totalEl.textContent = String(data.total);
    pageLabel.textContent = `第 ${page} / ${pages} 页`;
    prevButton.disabled = page <= 1;
    nextButton.disabled = page >= pages;
    render(data.entries);
  } catch {
    if (sequence !== requestSequence) return;
    totalEl.textContent = '—';
    pageLabel.textContent = '暂时无法连接';
    prevButton.disabled = true;
    nextButton.disabled = true;
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.className = 'empty';
    cell.textContent = '荣誉墙暂时没有响应，请稍后再试。';
    row.append(cell);
    entriesEl.replaceChildren(row);
  }
}

prevButton.addEventListener('click', () => { if (page > 1) void loadPage(page - 1); });
nextButton.addEventListener('click', () => { if (page < pages) void loadPage(page + 1); });
metricSelect.addEventListener('change', () => void loadPage(1));
void loadPage(1);
