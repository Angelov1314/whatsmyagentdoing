'use strict';

const PUBLISH_WINDOW_MS = 5 * 60_000;
const PUBLISH_EXPIRY_HEADER = 'x-myoffice-publish-until';
const RANK_METRICS = ['tokens', 'projects', 'sessions', 'activeDays', 'streak', 'agents'];

const BADGES = [
  { id: 'first', metric: 'sessions', target: 1, points: 10 },
  { id: 'sessions5', metric: 'sessions', target: 5, points: 20 },
  { id: 'active3', metric: 'activeDays', target: 3, points: 30 },
  { id: 'streak3', metric: 'streak', target: 3, points: 40 },
  { id: 'toolbox', metric: 'agents', target: 2, points: 20 },
  { id: 'sessions25', metric: 'sessions', target: 25, points: 50 },
  { id: 'active10', metric: 'activeDays', target: 10, points: 80 },
  { id: 'streak7', metric: 'streak', target: 7, points: 100 },
];

function parseAlias(input) {
  if (typeof input !== 'string' || input.length > 100) return null;
  const alias = input.trim().normalize('NFC');
  const length = [...alias].length;
  return length >= 2 && length <= 24 && /^[\p{L}\p{N}][\p{L}\p{M}\p{N} _-]*$/u.test(alias) ? alias : null;
}

function parseProfile(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      ![3, 4].includes(Object.keys(input).length) || !['alias', 'badges', 'score'].every((key) => Object.hasOwn(input, key)) ||
      Object.keys(input).some((key) => !['alias', 'badges', 'score', 'stats'].includes(key)) ||
      (Object.keys(input).length === 4 && !Object.hasOwn(input, 'stats'))) return null;
  const alias = parseAlias(input.alias);
  if (!alias || alias !== input.alias || !Array.isArray(input.badges) || !input.badges.length || input.badges.length > BADGES.length) return null;
  const picked = new Set(input.badges);
  const badges = BADGES.filter((badge) => picked.has(badge.id));
  if (badges.length !== input.badges.length) return null;
  const score = badges.reduce((total, badge) => total + badge.points, 0);
  if (input.score !== score) return null;
  const profile = { alias, badges: badges.map((badge) => badge.id), score };
  if (Object.hasOwn(input, 'stats')) {
    const stats = parseStats(input.stats);
    if (!stats) return null;
    profile.stats = stats;
  }
  return profile;
}

function parseStats(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== RANK_METRICS.length ||
      RANK_METRICS.some((metric) => !Object.hasOwn(input, metric))) return null;
  const stats = {};
  for (const metric of RANK_METRICS) {
    const value = input[metric];
    if (value !== null && (!Number.isSafeInteger(value) || value < 0)) return null;
    stats[metric] = value;
  }
  return stats;
}

module.exports = { BADGES, RANK_METRICS, parseAlias, parseProfile, parseStats, PUBLISH_WINDOW_MS, PUBLISH_EXPIRY_HEADER };
