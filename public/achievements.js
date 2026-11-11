(() => {
  'use strict';

  const q = (id) => document.getElementById(id);
  const $ = {
    dialog: q('achievementsDialog'), trigger: q('achievementsOpen'), triggerLabel: q('achievementsOpenLabel'), close: q('achievementsClose'),
    title: q('achievementsTitle'), intro: q('achievementsIntro'), tablist: q('achievementsTablist'), tabLocal: q('achievementsTabLocal'), tabHall: q('achievementsTabHall'),
    room: q('achievementsRoom'), roomOffice: q('achievementsOffice'), details: q('achievementsDetails'), detailsToolbar: q('achievementsDetailsToolbar'),
    backToOffice: q('achievementOfficeBack'), collectionOpen: q('achievementCollectionOpen'), rankingMetric: q('achievementRankingMetric'),
    officeTrophy: q('officeHallTrophy'), local: q('achievementsLocal'), hall: q('achievementsHall'), connection: q('achievementsConnection'), refresh: q('achievementsRefresh'),
    status: q('achievementsStatus'), statusText: q('achievementsStatusText'), score: q('achievementsScore'), summary: q('achievementsSummary'),
    badgeGrid: q('achievementsBadgeGrid'), badgeEmpty: q('achievementsBadgeEmpty'), collectionCount: q('achievementsCollectionCount'),
    sharePrompt: q('achievementsSharePrompt'), shareStart: q('achievementsShareStart'), localUnavailable: q('achievementsLocalUnavailable'),
    hallStatus: q('achievementsHallStatus'), boardWrap: q('achievementsLeaderboardWrap'), leaderboard: q('achievementsLeaderboard'), boardTotal: q('achievementsBoardTotal'),
    pageControls: q('achievementsPageControls'), pagePrev: q('achievementsPagePrev'), pageNext: q('achievementsPageNext'), pageLabel: q('achievementsPageLabel'), hallUnavailable: q('achievementsHallUnavailable'),
    publishCard: q('achievementsPublishCard'), alias: q('achievementsAlias'), previewButton: q('achievementsPreview'), previewPanel: q('achievementsPreviewPanel'), previewList: q('achievementsPreviewList'),
    consent: q('achievementsConsent'), consentHint: q('achievementsConsentHint'), submit: q('achievementsSubmit'), publicationCard: q('achievementsPublicationCard'),
    publication: q('achievementsPublication'), withdraw: q('achievementsWithdraw')
  };

  if (!$.dialog) return;

  const strings = {
    en: {
      trigger: 'Achievements', triggerAria: 'Open achievements and hall of fame', eyebrow: 'MYOFFICE · VIBE INDEX', title: 'Vibe Coding Achievements', intro: 'A record of the work you put into motion.', close: 'Close achievements',
      tabLocal: 'My cabinet', tabHall: 'Hall of fame', tablist: 'Achievements sections', refresh: 'Refresh', refreshAria: 'Refresh achievements',
      localEyebrow: 'PRIVATE BY DEFAULT', localHeading: 'Your work leaves a mark.', localLead: 'A small archive of your recent momentum, counted on this machine.', scoreLabel: 'COLLECTED POINTS', scoreCaption: 'local score', scoreAria: 'Local achievement score',
      collectionEyebrow: 'THE COLLECTION', collectionHeading: 'Milestones & rituals', earnedCount: '{earned} of {total} earned',
      emptyBadges: 'No achievement data is available yet. Start a session in MyOffice and check back.', localNote: 'Counts use distinct main sessions MyOffice observed in the last 30 UTC days. Earned badges stay unlocked.',
      shareTitle: 'Put your name on the wall?', shareText: 'Preview the exact small profile that would appear in the public hall. Nothing is published before your approval.', shareStart: 'Review public profile',
      shareUpdateTitle: 'Update your public profile?', shareUpdateText: 'Build a fresh preview, review the changed profile and give consent again to update your entry.', shareUpdateStart: 'Review an update',
      offlineLocal: 'Public publishing and rankings are unavailable in this connection. Your local progress remains here.',
      sampleBoard: 'Sample leaderboard', sampleNote: 'These example entries show how the board works. The public board lists profiles shared with consent.',
      hallEyebrow: 'THE PUBLIC REGISTER', hallHeading: 'A place for builders.', hallLead: 'A worldwide table of makers who chose to share a small, self-reported snapshot.', boardEyebrow: 'OPEN ROLL', boardHeading: 'The hall of fame',
      boardNote: 'Scores are self-reported by MyOffice clients. The board shows the alias, earned badges, score and aggregate statistics approved for publication.', rankHead: 'Rank', aliasHead: 'Maker', badgesHead: 'Badges', pointsHead: 'Points',
      previous: 'Previous', next: 'Next', page: 'Page {page} of {pages}', totalMakers: '{total} public makers', noEntries: 'No public entries yet. A place opens when someone chooses to share.',
      hallOffline: 'The public hall is unavailable for this connection. If you already have an entry, you can still withdraw it below.', hallPreview: 'This is a local preview or demo connection. Global rankings and publication are disabled here.',
      publishEyebrow: 'YOUR PLACE, YOUR CALL', publishHeading: 'Choose how you appear.', publishIntro: 'Use a public alias, then review the exact profile before deciding whether to share.', aliasLabel: 'Public alias',
      aliasHint: '2–24 Unicode letters or digits. Spaces, _ and - are allowed after the first character.', aliasPlaceholder: 'e.g. PaperKite', previewButton: 'Build my preview',
      previewEyebrow: 'EXACT PUBLIC PREVIEW', previewHeading: 'This is what others will see.', previewAlias: 'Alias', previewBadges: 'Earned badges', previewScore: 'Score', previewDestination: 'Destination',
      noPreviewBadges: 'No earned badges', noDestination: 'Not available', exclusions: 'Not included: prompts, repository paths, detailed usage logs, or session identifiers.',
      consent: 'I authorize publishing this exact profile to the worldwide leaderboard.', consentHint: 'Review the alias, badge IDs, score, aggregate statistics and destination above. Consent is never pre-checked.', consentPreviewOnly: 'Preview mode only: this profile cannot be published to a worldwide ranking.',
      submit: 'Publish my profile', publishSuccess: 'Your profile was published{rank}.', publishRank: ' at achievement-points rank {rank} of {total}', withdrawSuccess: 'Your public entry was removed.',
      publicationEyebrow: 'YOUR PUBLISHED ENTRY', publicationHeading: 'Your place in the hall', publicationPending: 'Your entry is pending confirmation. You can withdraw it while it is being checked.', publicationPublished: 'Published as “{alias}”.', publicationUncertain: 'The last request may still be processing. Refresh the local status or withdraw this entry.', withdraw: 'Withdraw my entry', withdrawing: 'Withdrawing…',
      privacyHeading: 'A deliberate footprint.', privacyText: 'Your activity stays on this machine until you choose to publish a reviewed profile. Publication needs a fresh, unchecked consent each time.', footer: 'MAKE THINGS. KEEP THE RECEIPT.',
      loadingLocal: 'Reading local achievement totals…', loaded: 'Local achievement totals updated.', unavailable: 'Achievements are unavailable in this MyOffice version.', statusError: 'Could not read achievement totals. Check MyOffice and try again.', networkError: 'Could not reach MyOffice. Check your connection and try again.', loadingBoard: 'Loading the public leaderboard…', boardError: 'Could not load the public leaderboard. Try again in a moment.',
      previewLoading: 'Preparing a private preview…', previewReady: 'Review the exact profile below. It has not been published.', previewError: 'Could not prepare the profile preview.', publishing: 'Publishing the profile you reviewed…', publishingError: 'The publication status may be uncertain. Refresh the local status or withdraw if an entry appears.', withdrawingError: 'Could not withdraw the entry. Try refreshing the status and retry.',
      invalidAlias: 'Use 2–24 Unicode letters or digits. Spaces, _ and - are allowed only after the first character.', invalid_alias: 'That alias is not valid. Use 2–24 Unicode letters or digits and keep spaces, _ or - after the first character.', no_badges: 'There are no earned badges to share yet.', expired_preview: 'This preview expired. Build a fresh preview before publishing.', consent_required: 'Check the unchecked consent box after reviewing the exact profile.', hall_unavailable: 'The public hall is unavailable right now.', no_connection: 'MyOffice has no connection to the public hall right now.', write_in_progress: 'A publication request may still be processing. Refresh the status before trying again.', destination_changed: 'The publication destination changed. Build and review a fresh preview.', storage_unavailable: 'MyOffice could not save the publication safely. Nothing was confirmed as published.', unknownApiError: 'MyOffice could not complete that action. Please retry.',
      unavailableConnection: 'Unavailable', offlineConnection: 'Offline', previewConnection: 'Local preview', publicConnection: 'Public hall configured',
      metricSessions: 'MAIN SESSIONS', metricSessionsDetail: 'Distinct sessions · 30 UTC days', metricActiveDays: 'ACTIVE DAYS', metricActiveDaysDetail: 'Days with a session · 30 UTC days', metricStreak: 'LONGEST STREAK', metricStreakDetail: 'Consecutive UTC days · 30 UTC days', metricAgents: 'AGENT TYPES', metricAgentsDetail: 'Distinct agents · 30 UTC days',
      metricSessionsShort: 'sessions', metricActiveDaysShort: 'active days', metricStreakShort: 'streak days', metricAgentsShort: 'agent types',
      catFoundation: 'FOUNDATION', catCraft: 'CRAFT', catRhythm: 'RHYTHM', catRange: 'RANGE', catEndurance: 'ENDURANCE',
      badgeFirst: 'First signal', badgeSessions5: 'Five in motion', badgeActive3: 'Three active days', badgeStreak3: 'Three-day rhythm', badgeToolbox: 'A wider toolkit', badgeSessions25: 'Twenty-five sessions', badgeActive10: 'Ten active days', badgeStreak7: 'A week in flow',
      ruleFirst: 'Record your first main session.', ruleSessions5: 'Record 5 distinct main sessions.', ruleActive3: 'Be active on 3 UTC days.', ruleStreak3: 'Build a 3-day active streak.', ruleToolbox: 'Work with 2 distinct agent types.', ruleSessions25: 'Record 25 distinct main sessions.', ruleActive10: 'Be active on 10 UTC days.', ruleStreak7: 'Build a 7-day active streak.',
      earned: 'Earned', progress: '{current} / {target}', earnedOn: 'Earned {date}',
      featureDisabled: 'Achievements are disabled in this private or demo launch.'
    },
    zh: {
      trigger: '成就', triggerAria: '打开成就与名人堂', eyebrow: 'MYOFFICE · VIBE INDEX', title: 'Vibe Coding 成就', intro: '记录你推动想法落地的每一步。', close: '关闭成就',
      tabLocal: '我的成就', tabHall: '名人堂', tablist: '成就页面', refresh: '刷新', refreshAria: '刷新成就数据',
      localEyebrow: '默认仅本机可见', localHeading: '每一次投入，都算数。', localLead: '这份近期进度只在这台设备上统计和展示。', scoreLabel: '累计成就积分', scoreCaption: '本地积分', scoreAria: '本地成就积分',
      collectionEyebrow: '徽章收藏', collectionHeading: '里程碑与习惯', earnedCount: '已获得 {earned} / {total}',
      emptyBadges: '暂时没有可显示的成就数据。先在 MyOffice 中完成一次会话，再回来看看。', localNote: '数据统计 MyOffice 在最近 30 个 UTC 日观察到的不同主会话；已获得的徽章会保留。',
      shareTitle: '把名字留在名人墙上？', shareText: '先预览公开名册中将展示的精简资料。得到你的明确同意前，不会发布。', shareStart: '预览公开资料',
      shareUpdateTitle: '更新你的公开资料？', shareUpdateText: '重新生成一份预览，核对变更，并再次明确同意后更新名册。', shareUpdateStart: '核对资料更新',
      offlineLocal: '当前连接无法发布或查看全网排名。本机进度仍保留在这里。',
      sampleBoard: '示例榜', sampleNote: '这里展示的是示例成员。公开榜只收录主动同意公开的资料。',
      hallEyebrow: '公开名册', hallHeading: '给创造者留一席。', hallLead: '这是一张全球名册，只展示主动选择公开、自行申报的成就摘要。', boardEyebrow: '公开榜单', boardHeading: 'Vibe Coding 名人堂',
      boardNote: '积分由 MyOffice 客户端自行申报。榜单只显示用户同意公开的昵称、已获徽章、积分和汇总统计值。', rankHead: '排名', aliasHead: '创造者', badgesHead: '徽章', pointsHead: '积分',
      previous: '上一页', next: '下一页', page: '第 {page} / {pages} 页', totalMakers: '共 {total} 位公开成员', noEntries: '还没有公开成员。有人选择分享后，这里就会出现第一席。',
      hallOffline: '当前连接无法访问公开名人堂。如果你之前发布过资料，仍可在下方撤回。', hallPreview: '当前是本机预览或演示连接，不提供全网排名，也不能发布。',
      publishEyebrow: '是否公开，由你决定', publishHeading: '选择公开昵称。', publishIntro: '填写公开昵称后，先核对将要公开的完整资料，再决定是否提交。', aliasLabel: '公开昵称',
      aliasHint: '2–24 个 Unicode 字母或数字；首字符之后可使用空格、_ 和 -。', aliasPlaceholder: '例如：纸飞机', previewButton: '生成我的预览',
      previewEyebrow: '将公开的完整预览', previewHeading: '其他人看到的内容如下。', previewAlias: '昵称', previewBadges: '已获徽章', previewScore: '积分', previewDestination: '发布位置',
      noPreviewBadges: '暂无已获徽章', noDestination: '暂不可用', exclusions: '不会包含：提示词、仓库路径、用量明细或会话标识。',
      consent: '我同意将这份完整资料发布到全网榜单。', consentHint: '请先核对上方昵称、徽章 ID、积分、汇总统计与发布位置。此选项默认不勾选。', consentPreviewOnly: '当前仅支持本机预览，不能将资料发布到全网榜单。',
      submit: '同意并发布', publishSuccess: '资料已发布{rank}。', publishRank: ' · 成就积分排名第 {rank} / {total}', withdrawSuccess: '已撤回公开资料。',
      publicationEyebrow: '你的公开资料', publicationHeading: '你在名人堂中的位置', publicationPending: '资料正在等待确认。确认期间，你仍可撤回。', publicationPublished: '已用昵称“{alias}”发布。', publicationUncertain: '上次请求可能仍在处理中。可刷新本机状态，或撤回此资料。', withdraw: '撤回我的资料', withdrawing: '正在撤回…',
      privacyHeading: '只留下你选择的足迹。', privacyText: '发布经核对的资料前，活动数据始终留在本机。每次发布都需要重新明确同意。', footer: '创造作品，也留下记录。',
      loadingLocal: '正在读取本机成就数据…', loaded: '本机成就数据已更新。', unavailable: '当前版本的 MyOffice 尚未启用成就。', statusError: '无法读取成就数据。请检查 MyOffice 后重试。', networkError: '无法连接 MyOffice。请检查连接后重试。', loadingBoard: '正在读取公开榜单…', boardError: '暂时无法读取公开榜单，请稍后重试。',
      previewLoading: '正在生成仅供你查看的预览…', previewReady: '请核对下方资料。当前尚未发布。', previewError: '无法生成资料预览。', publishing: '正在发布你刚核对的资料…', publishingError: '发布状态可能尚未确定。请刷新本机状态；若资料已出现，也可以撤回。', withdrawingError: '暂时无法撤回。请刷新状态后重试。',
      invalidAlias: '请使用 2–24 个 Unicode 字母或数字；首字符之后才能使用空格、_ 或 -。', invalid_alias: '昵称格式不正确：使用 2–24 个 Unicode 字母或数字，空格、_ 和 - 只能出现在首字符之后。', no_badges: '目前还没有已获得的徽章可供分享。', expired_preview: '这份预览已过期。请重新生成并核对后再发布。', consent_required: '请核对完整资料后再勾选同意框。', hall_unavailable: '公开名人堂暂时不可用。', no_connection: 'MyOffice 当前无法连接公开名人堂。', write_in_progress: '发布请求可能仍在处理中。请先刷新状态，再决定是否重试。', destination_changed: '发布位置已变化。请重新生成并核对预览。', storage_unavailable: 'MyOffice 无法安全保存这次发布请求，尚未确认发布成功。', unknownApiError: 'MyOffice 暂时无法完成此操作，请重试。',
      unavailableConnection: '不可用', offlineConnection: '离线', previewConnection: '本机预览', publicConnection: '公开榜已配置',
      metricSessions: '主会话', metricSessionsDetail: '近 30 个 UTC 日内的不同主会话', metricActiveDays: '活跃日', metricActiveDaysDetail: '近 30 个 UTC 日中有会话的日期', metricStreak: '最长连续天数', metricStreakDetail: '近 30 个 UTC 日内连续活跃天数', metricAgents: 'Agent 类型', metricAgentsDetail: '近 30 个 UTC 日内出现的不同 Agent',
      metricSessionsShort: '次会话', metricActiveDaysShort: '个活跃日', metricStreakShort: '天连续活跃', metricAgentsShort: '种 Agent',
      catFoundation: '初次启程', catCraft: '持续创作', catRhythm: '节奏习惯', catRange: '工具广度', catEndurance: '长期投入',
      badgeFirst: '点亮第一束信号', badgeSessions5: '五次进入状态', badgeActive3: '三日有新作', badgeStreak3: '连续三日', badgeToolbox: '多一件趁手工具', badgeSessions25: '二十五次创作', badgeActive10: '十日持续创作', badgeStreak7: '一周灵感不断',
      ruleFirst: '记录第一个主会话。', ruleSessions5: '记录 5 个不同的主会话。', ruleActive3: '在 3 个 UTC 日中保持活跃。', ruleStreak3: '连续活跃 3 天。', ruleToolbox: '使用 2 种不同的 Agent。', ruleSessions25: '记录 25 个不同的主会话。', ruleActive10: '在 10 个 UTC 日中保持活跃。', ruleStreak7: '连续活跃 7 天。',
      earned: '已获得', progress: '{current} / {target}', earnedOn: '获得于 {date}',
      featureDisabled: '私密或演示模式已停用成就入口。'
    }
  };

  const badgeArtwork = {
    first: '<path d="M11 31h19M19 30V18M20 18l8-8" fill="none"/><path d="m25 6 9 9-7 4-7-7z" fill="#d3b36b"/><path d="m8 31 3-4h16l3 4v3H8z" fill="#a97952"/><path d="m18 19-5 4m6-2-1 5" fill="none" opacity=".65"/>',
    sessions5: '<path d="M8 10h9v23H8z" fill="#7597a1"/><path d="M17 6h8v27h-8z" fill="#c98669"/><path d="m26 11 7-2 6 22-7 2z" fill="#9aaf7d"/><path d="M10 14h5m4-4h4m-13 19h5m4 0h4m5-13 4-1" fill="none" stroke="#f5ead4"/>',
    active3: '<rect x="7" y="9" width="27" height="25" rx="2" fill="#e8dcc5"/><path d="M7 16h27V9H7z" fill="#bf795e"/><path d="M13 6v7m15-7v7m-15 9h3m5 0h3m5 0h1m-17 6h3m5 0h3" fill="none"/><path d="m26 27 2 2 5-6" fill="none" stroke="#4e795c"/>',
    streak3: '<path d="m12 27-3 3a6 6 0 0 0 9 7l6-6a6 6 0 0 0 0-8m4-10 3-3a6 6 0 0 0-9-7l-6 6a6 6 0 0 0 0 8" fill="none" stroke="#7e9a7c" stroke-width="4"/><path d="m15 25 10-10" fill="none" stroke="#b2bd92" stroke-width="4"/>',
    toolbox: '<path d="M14 12V8h13v4" fill="none"/><rect x="5" y="13" width="31" height="21" rx="2" fill="#81909d"/><path d="M5 22h31" fill="none"/><rect x="17" y="19" width="7" height="6" rx="1" fill="#dbc184"/><path d="M9 29h7" fill="none" stroke="#dce0dc"/>',
    sessions25: '<path d="m7 27 22-4 6 7-23 5z" fill="#ba805f"/><path d="m7 21 22-4 6 7-23 5z" fill="#e0c9a0"/><path d="m7 15 22-4 6 7-23 5z" fill="#72968c"/><path d="M11 22v5m0 2v4m0-17v5" fill="none" stroke="#f1e6cd"/>',
    active10: '<path d="M20 27V13m0 8-7-7m7 3 7-7" fill="none" stroke="#5d805c"/><path d="M19 18C9 19 7 9 12 7c6-1 9 6 7 11z" fill="#7d9e72"/><path d="M21 15c-2-8 7-13 11-8 2 5-5 10-11 8z" fill="#91af7a"/><path d="M12 26h17l-3 11H15z" fill="#b97b59"/><path d="M10 25h21v4H10z" fill="#d8a077"/>',
    streak7: '<path d="M12 8H6v4a6 6 0 0 0 8 5m14-9h6v4a6 6 0 0 1-8 5" fill="none" stroke="#b38c4c"/><path d="M11 5h18v8a9 9 0 0 1-8 9v7h6v4H13v-4h6v-7a9 9 0 0 1-8-9z" fill="#d2ae60"/><path d="m20 9 1.5 3 3 .5-2.2 2.3.5 3.2-2.8-1.5-2.8 1.5.5-3.2-2.2-2.3 3-.5z" fill="#f8edca" stroke="none"/>',
  };

  const badgeCatalog = {
    first: { name: 'badgeFirst', rule: 'ruleFirst', category: 'catFoundation' },
    sessions5: { name: 'badgeSessions5', rule: 'ruleSessions5', category: 'catCraft' },
    active3: { name: 'badgeActive3', rule: 'ruleActive3', category: 'catRhythm' },
    streak3: { name: 'badgeStreak3', rule: 'ruleStreak3', category: 'catRhythm' },
    toolbox: { name: 'badgeToolbox', rule: 'ruleToolbox', category: 'catRange' },
    sessions25: { name: 'badgeSessions25', rule: 'ruleSessions25', category: 'catEndurance' },
    active10: { name: 'badgeActive10', rule: 'ruleActive10', category: 'catRhythm' },
    streak7: { name: 'badgeStreak7', rule: 'ruleStreak7', category: 'catEndurance' }
  };

  const copyTargets = {
    achievementsEyebrow: 'eyebrow', achievementsTitle: 'title', achievementsIntro: 'intro',
    achievementsTabLocal: 'tabLocal', achievementsTabHall: 'tabHall', achievementsRefreshLabel: 'refresh', achievementsLocalEyebrow: 'localEyebrow',
    achievementsLocalHeading: 'localHeading', achievementsLocalLead: 'localLead', achievementsScoreLabel: 'scoreLabel', achievementsScoreCaption: 'scoreCaption',
    achievementsCollectionEyebrow: 'collectionEyebrow', achievementsCollectionHeading: 'collectionHeading', achievementsLocalNote: 'localNote',
    achievementsShareTitle: 'shareTitle', achievementsShareText: 'shareText', achievementsShareStartLabel: 'shareStart',
    achievementsHallEyebrow: 'hallEyebrow', achievementsHallHeading: 'hallHeading', achievementsHallLead: 'hallLead', achievementsBoardEyebrow: 'boardEyebrow',
    achievementsBoardHeading: 'boardHeading', achievementsRankHead: 'rankHead', achievementsAliasHead: 'aliasHead', achievementsBadgesHead: 'badgesHead',
    achievementsPointsHead: 'pointsHead', achievementsBoardNote: 'boardNote', achievementsPagePrevLabel: 'previous', achievementsPageNextLabel: 'next',
    achievementsPublishEyebrow: 'publishEyebrow', achievementsPublishHeading: 'publishHeading', achievementsPublishIntro: 'publishIntro',
    achievementsAliasLabel: 'aliasLabel', achievementsAliasHint: 'aliasHint', achievementsPreviewLabel: 'previewButton', achievementsPreviewEyebrow: 'previewEyebrow',
    achievementsPreviewHeading: 'previewHeading', achievementsExclusions: 'exclusions', achievementsConsentText: 'consent', achievementsSubmitLabel: 'submit',
    achievementsPublicationEyebrow: 'publicationEyebrow', achievementsPublicationHeading: 'publicationHeading', achievementsWithdrawLabel: 'withdraw',
    achievementsPrivacyHeading: 'privacyHeading', achievementsPrivacyText: 'privacyText', achievementsFooterText: 'footer'
  };

  const rankingLabels = {
    zh: { tokens: '最多 Token 消耗', projects: '最多项目', sessions: '最多会话', activeDays: '最多活跃天数', streak: '最多连续天数', agents: '最多 Agent 类型', score: '最多成就积分' },
    en: { tokens: 'Most tokens used', projects: 'Most projects', sessions: 'Most sessions', activeDays: 'Most active days', streak: 'Longest streak', agents: 'Most agent types', score: 'Most achievement points' }
  };
  let roomRenderer = null;
  let roomReturnTarget = null;

  const sampleEntries = [
    { rank: 1, alias: 'Woodshop', stats: { tokens: 1200000, projects: 8, sessions: 30, activeDays: 12, streak: 5, agents: 3 }, badges: ['first', 'sessions5', 'active3', 'streak3', 'toolbox', 'sessions25', 'active10'], score: 250 },
    { rank: 2, alias: 'PaperKite', stats: { tokens: 2400000, projects: 5, sessions: 12, activeDays: 3, streak: 3, agents: 2 }, badges: ['first', 'sessions5', 'active3', 'streak3', 'toolbox'], score: 120 },
    { rank: 3, alias: 'WindowCat', stats: { tokens: 760000, projects: 12, sessions: 5, activeDays: 1, streak: 1, agents: 2 }, badges: ['first', 'sessions5', 'toolbox'], score: 50 }
  ];

  const state = {
    lang: 'en', t: strings.en, available: null, serverDisabled: false, connection: 'offline', statusData: null,
    publication: null, publicationUncertain: false, currentTab: 'local', preview: null, board: null, boardPage: 1,
    statusController: null, boardController: null, statusSeq: 0, boardSeq: 0, loadingStatus: false, loadingBoard: false,
    writingPreview: false, writingPublish: false, writingWithdraw: false, openedFromHash: false, returnFocus: null,
    metric: 'tokens', notice: null, hallNotice: null
  };

  function language() {
    const raw = String(document.documentElement.lang || navigator.language || 'en').toLowerCase();
    return raw.startsWith('zh') ? 'zh' : 'en';
  }

  function t(key, values) {
    const text = state.t[key] ?? strings.en[key] ?? key;
    if (!values) return text;
    return text.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
  }

  function applyCopy() {
    state.lang = language();
    state.t = strings[state.lang];
    for (const [id, key] of Object.entries(copyTargets)) {
      const node = q(id);
      if (node) node.textContent = t(key);
    }
    q('achievementRoomHint').textContent = state.lang === 'zh' ? '点击办公室里的奖杯，打开对应排行榜。' : 'Pick a trophy to open its leaderboard.';
    $.collectionOpen.textContent = state.lang === 'zh' ? '我的成就收藏' : 'My achievement collection';
    $.backToOffice.textContent = state.lang === 'zh' ? '← 返回办公室' : '← Back to the office';
    q('achievementSharingSummary').textContent = state.lang === 'zh' ? '公开资料与隐私' : 'Public profile & privacy';
    q('achievementRankingLabel').textContent = state.lang === 'zh' ? '排行榜' : 'Leaderboard';
    for (const button of $.roomOffice.querySelectorAll('[data-room-metric]')) {
      const label = rankingLabels[state.lang][button.dataset.roomMetric];
      button.setAttribute('aria-label', label);
      button.querySelector('span').textContent = label;
    }
    for (const option of $.rankingMetric.options) option.textContent = rankingLabels[state.lang][option.value];
    if ($.officeTrophy) {
      $.officeTrophy.setAttribute('aria-label', t('tabHall'));
      $.officeTrophy.title = t('tabHall');
    }
    if ($.triggerLabel) $.triggerLabel.textContent = t('trigger');
    if ($.trigger) $.trigger.setAttribute('aria-label', t('triggerAria'));
    if ($.close) $.close.setAttribute('aria-label', t('close'));
    if ($.refresh) $.refresh.setAttribute('aria-label', t('refreshAria'));
    if ($.tablist) $.tablist.setAttribute('aria-label', t('tablist'));
    if ($.score) $.score.setAttribute('aria-label', t('scoreAria'));
    if ($.alias) $.alias.placeholder = t('aliasPlaceholder');
    if ($.alias) $.alias.setAttribute('aria-required', 'true');
    if ($.status) $.status.setAttribute('aria-label', state.lang === 'zh' ? '成就状态' : 'Achievement status');
    if ($.dialog) $.dialog.setAttribute('aria-describedby', 'achievementsIntro');
    if (state.currentTab !== 'room') q('achievementsTitle').textContent = t(state.currentTab === 'local' ? 'tabLocal' : 'tabHall');
    renderConnection();
    renderLocal();
    renderBoard();
    renderPreview();
    renderPublication();
    renderNotices();
  }

  function setNotice(key, kind = 'info', scope = 'main', values) {
    const notice = key ? { key, kind, values } : null;
    if (scope === 'hall') state.hallNotice = notice;
    else state.notice = notice;
    renderNotices();
  }

  function renderNotices() {
    if ($.status) {
      $.status.hidden = !state.notice;
      $.status.dataset.kind = state.notice?.kind || 'info';
      if ($.statusText) $.statusText.textContent = state.notice ? t(state.notice.key, state.notice.values) : '';
    }
    if ($.hallStatus) {
      $.hallStatus.textContent = state.hallNotice ? t(state.hallNotice.key, state.hallNotice.values) : '';
      $.hallStatus.dataset.kind = state.hallNotice?.kind || 'info';
    }
  }

  function numeric(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
  }

  function safeCount(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : null;
  }

  function fmtNumber(value) {
    const number = safeCount(value);
    return number === null ? '—' : new Intl.NumberFormat(state.lang === 'zh' ? 'zh-CN' : 'en').format(number);
  }

  function fmtDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return new Intl.DateTimeFormat(state.lang === 'zh' ? 'zh-CN' : 'en', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
  }

  function metricDefinition(name) {
    if (name === 'sessions') return { label: t('metricSessionsShort'), summaryLabel: t('metricSessions'), summaryDetail: t('metricSessionsDetail') };
    if (name === 'activeDays') return { label: t('metricActiveDaysShort'), summaryLabel: t('metricActiveDays'), summaryDetail: t('metricActiveDaysDetail') };
    if (name === 'streak') return { label: t('metricStreakShort'), summaryLabel: t('metricStreak'), summaryDetail: t('metricStreakDetail') };
    if (name === 'agents') return { label: t('metricAgentsShort'), summaryLabel: t('metricAgents'), summaryDetail: t('metricAgentsDetail') };
    return { label: state.lang === 'zh' ? '进度' : 'progress', summaryLabel: state.lang === 'zh' ? '进度' : 'PROGRESS', summaryDetail: '' };
  }

  function appendText(parent, tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = text == null ? '' : String(text);
    parent.append(node);
    return node;
  }

  function updateTrigger() {
    const marker = document.body?.dataset?.achievementsDisabled === 'true';
    state.serverDisabled = marker;
    const disabled = marker || state.available === false;
    if ($.trigger) {
      $.trigger.hidden = disabled;
      $.trigger.disabled = disabled;
    }
    if ($.officeTrophy) $.officeTrophy.disabled = disabled;
    if (marker && $.dialog.open) $.dialog.close('disabled');
  }

  function renderConnection() {
    if (!$.connection) return;
    const label = state.available === false ? t('unavailableConnection') : state.connection === 'public' ? t('publicConnection') : state.connection === 'preview' ? t('previewConnection') : t('offlineConnection');
    $.connection.hidden = false;
    $.connection.dataset.kind = state.available === false ? 'offline' : state.connection;
    $.connection.textContent = label;
  }

  function ensureRoomRenderer() {
    if (roomRenderer) return;
    for (const button of $.roomOffice.querySelectorAll('[data-room-metric]')) button.hidden = true;
    roomRenderer = new window.Office($.roomOffice, { showAgent: false, onFrame: positionRoomTrophies });
    roomRenderer.update([]);
  }

  function showDetails(tab) {
    const hall = tab === 'hall';
    $.dialog.dataset.view = hall ? 'hall' : 'details';
    $.room.hidden = !hall;
    $.room.setAttribute('aria-hidden', String(hall));
    $.details.hidden = false;
    $.detailsToolbar.hidden = false;
    if (hall) ensureRoomRenderer();
    if (roomRenderer) roomRenderer.setVisible(hall);
  }

  function positionRoomTrophies(renderer) {
    const shelf = renderer.plan.props.find((prop) => prop.t === 'shelf');
    const table = renderer.plan.props.find((prop) => prop.t === 'meetingTable');
    const desk = renderer.plan.desks[1];
    const agentDesk = renderer.plan.desks[5];
    const pingpong = renderer.plan.props.find((prop) => prop.t === 'pingpong');
    const coffee = renderer.plan.props.find((prop) => prop.t === 'coffeeTable');
    const vending = renderer.plan.props.find((prop) => prop.t === 'vending');
    const anchors = {
      tokens: { x: shelf.x + shelf.w * .5, y: shelf.y + shelf.d * .5, z: 1.45 },
      projects: { x: table.x + table.w * .7, y: table.y + table.d * .55, z: .75 },
      sessions: { x: desk.x + 1.05, y: desk.y + .55, z: .75 },
      activeDays: { x: pingpong.x + .05, y: pingpong.y + .95, z: .75 },
      streak: { x: coffee.x + coffee.w * .5, y: coffee.y + coffee.d * .5, z: .3 },
      agents: { x: agentDesk.x + 1.05, y: agentDesk.y + .55, z: .75 },
      score: { x: vending.x + .4, y: vending.y + .35, z: 1.7 }
    };
    for (const button of $.roomOffice.querySelectorAll('[data-room-metric]')) {
      const anchor = anchors[button.dataset.roomMetric];
      const point = renderer.iso(anchor.x, anchor.y, anchor.z);
      const x = point.x * renderer.cam.zoom + renderer.cam.ox;
      const y = point.y * renderer.cam.zoom + renderer.cam.oy;
      button.style.left = x + 'px';
      button.style.top = y + 'px';
      button.hidden = false;
    }
  }

  function showRoom({ focus = false } = {}) {
    state.currentTab = 'room';
    $.dialog.dataset.view = 'room';
    q('achievementsTitle').textContent = t('title');
    $.room.hidden = false;
    $.details.hidden = true;
    $.detailsToolbar.hidden = true;
    $.room.setAttribute('aria-hidden', 'false');
    ensureRoomRenderer();
    roomRenderer.setVisible(true);
    if (focus) (roomReturnTarget || $.collectionOpen).focus();
  }

  function setTab(tab, focus = false) {
    state.currentTab = tab === 'hall' ? 'hall' : 'local';
    showDetails(state.currentTab);
    const local = state.currentTab === 'local';
    q('achievementsTitle').textContent = t(local ? 'tabLocal' : 'tabHall');
    for (const [button, active] of [[ $.tabLocal, local ], [ $.tabHall, !local ]]) {
      if (!button) continue;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      if (focus && active) button.focus();
    }
    if ($.local) $.local.hidden = !local;
    if ($.hall) $.hall.hidden = local;
    if (!local) {
      renderHallAvailability();
      if (state.loadingStatus) setHallNotice('loadingLocal', 'info');
      else if (state.connection === 'public' && state.available === true) {
        if (!state.board) loadBoard(1);
      }
    }
  }

  function activateTab(tab, focus = false) {
    setTab(tab, focus);
  }

  function renderLocal() {
    const data = state.statusData;
    if ($.score) $.score.textContent = data ? fmtNumber(data.score) : '—';
    if ($.summary) {
      $.summary.replaceChildren();
      const summary = data?.summary && typeof data.summary === 'object' ? data.summary : null;
      const metrics = [
        ['sessions', 'metricSessions', 'metricSessionsDetail'],
        ['activeDays', 'metricActiveDays', 'metricActiveDaysDetail'],
        ['streak', 'metricStreak', 'metricStreakDetail'],
        ['agents', 'metricAgents', 'metricAgentsDetail']
      ];
      for (const [key, labelKey, detailKey] of metrics) {
        const card = appendText($.summary, 'div', 'achievement-metric', '');
        card.setAttribute('aria-label', `${t(labelKey)}: ${data ? fmtNumber(summary?.[key]) : '—'}. ${t(detailKey)}`);
        appendText(card, 'span', 'achievement-metric-label', t(labelKey));
        appendText(card, 'strong', 'achievement-metric-value', data ? fmtNumber(summary?.[key]) : '—');
        appendText(card, 'span', 'achievement-metric-detail', t(detailKey));
      }
    }
    if ($.badgeGrid) {
      $.badgeGrid.replaceChildren();
      const badges = Array.isArray(data?.badges) ? data.badges : [];
      let earnedCount = 0;
      for (const item of badges) {
        if (!item || typeof item !== 'object' || typeof item.id !== 'string') continue;
        const def = badgeCatalog[item.id] || { name: null, rule: null, category: null };
        const progress = safeCount(item.progress) ?? 0;
        const target = Math.max(1, safeCount(item.target) ?? 1);
        const earned = Boolean(item.earnedAt) || progress >= target;
        if (earned) earnedCount += 1;
        renderBadge(item, def, progress, target, earned);
      }
      if ($.badgeEmpty) {
        $.badgeEmpty.hidden = badges.length > 0;
        $.badgeEmpty.textContent = t('emptyBadges');
      }
      if ($.collectionCount) $.collectionCount.textContent = data ? t('earnedCount', { earned: earnedCount, total: badges.length }) : '—';
    }
    const hasConnection = state.available === true && state.connection !== 'offline';
    if ($.sharePrompt) {
      $.sharePrompt.hidden = !hasConnection || state.publication?.status === 'pending' || state.publicationUncertain;
      const isUpdating = state.publication?.status === 'published';
      const shareTitle = q('achievementsShareTitle');
      const shareText = q('achievementsShareText');
      const shareStartLabel = q('achievementsShareStartLabel');
      if (shareTitle) shareTitle.textContent = t(isUpdating ? 'shareUpdateTitle' : 'shareTitle');
      if (shareText) shareText.textContent = t(isUpdating ? 'shareUpdateText' : 'shareText');
      if (shareStartLabel) shareStartLabel.textContent = t(isUpdating ? 'shareUpdateStart' : 'shareStart');
    }
    if ($.localUnavailable) {
      $.localUnavailable.hidden = !state.statusData || state.connection !== 'offline';
      $.localUnavailable.textContent = t('offlineLocal');
    }
    if ($.publishCard) $.publishCard.hidden = !(hasConnection && !state.publication && !state.publicationUncertain && state.currentTab === 'hall');
  }

  function renderBadge(item, def, progress, target, earned) {
    const id = String(item.id);
    const card = document.createElement('article');
    card.className = `achievement-badge-card${earned ? ' is-earned' : ''}`;
    card.dataset.badgeId = id;
    const name = def.name ? t(def.name) : (state.lang === 'zh' ? '特别徽章' : 'Special badge');
    card.setAttribute('aria-label', `${name}, ${earned ? t('earned') : t('progress', { current: progress, target })}`);
    const top = appendText(card, 'div', 'achievement-badge-top', '');
    const medallion = appendText(top, 'span', 'achievement-medallion', '');
    medallion.setAttribute('aria-hidden', 'true');
    medallion.innerHTML = `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${badgeArtwork[id] || badgeArtwork.streak7}</svg>`;
    const titles = appendText(top, 'div', 'achievement-badge-titles', '');
    appendText(titles, 'h4', '', name);
    appendText(titles, 'span', 'achievement-badge-category', def.category ? t(def.category) : id);
    appendText(card, 'span', 'achievement-badge-points', `+${fmtNumber(item.points)}`);
    const rule = def.rule ? t(def.rule) : t('progress', { current: progress, target });
    appendText(card, 'p', 'achievement-badge-rule', rule);
    const label = appendText(card, 'div', 'achievement-badge-progress-label', '');
    if (earned) {
      const date = fmtDate(item.earnedAt);
      appendText(label, 'span', '', t('earned'));
      appendText(label, 'span', '', t('progress', { current: Math.max(progress, target), target }));
      if (date) appendText(card, 'p', 'achievement-badge-earned-date', t('earnedOn', { date }));
    } else {
      appendText(label, 'span', '', metricDefinition(item.metric).label);
      appendText(label, 'span', '', t('progress', { current: progress, target }));
    }
    const track = appendText(card, 'div', 'achievement-progress-track', '');
    const fill = appendText(track, 'span', '', '');
    const percentage = Math.max(0, Math.min(100, (progress / target) * 100));
    fill.style.setProperty('--progress', `${percentage}%`);
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', `${name}: ${t('progress', { current: progress, target })}`);
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', String(target));
    track.setAttribute('aria-valuenow', String(Math.min(progress, target)));
    track.setAttribute('aria-valuetext', t('progress', { current: progress, target }));
    $.badgeGrid.append(card);
  }

  function normalizePublication(value) {
    if (!value || typeof value !== 'object' || typeof value.alias !== 'string') return null;
    if (value.status !== 'pending' && value.status !== 'published') return null;
    return { alias: value.alias, status: value.status };
  }

  function renderPublication() {
    const visible = Boolean(state.publication || state.publicationUncertain);
    if ($.publicationCard) $.publicationCard.hidden = !visible;
    if ($.publication) {
      if (state.publicationUncertain) {
        $.publication.textContent = t('publicationUncertain');
        $.publication.dataset.kind = 'pending';
      } else if (state.publication?.status === 'pending') {
        $.publication.textContent = t('publicationPending');
        $.publication.dataset.kind = 'pending';
      } else if (state.publication?.status === 'published') {
        $.publication.textContent = t('publicationPublished', { alias: state.publication.alias });
        $.publication.dataset.kind = 'published';
      } else {
        $.publication.textContent = '';
        $.publication.dataset.kind = '';
      }
    }
    if ($.withdraw) {
      $.withdraw.hidden = !visible;
      $.withdraw.disabled = state.writingWithdraw;
      const label = q('achievementsWithdrawLabel');
      if (label) label.textContent = state.writingWithdraw ? t('withdrawing') : t('withdraw');
    }
  }

  function renderHallAvailability() {
    const isPublic = state.available === true && state.connection === 'public';
    const canPreview = state.available === true && state.connection === 'preview';
    if ($.hallUnavailable) {
      $.hallUnavailable.hidden = isPublic;
      $.hallUnavailable.textContent = state.connection === 'preview' ? t('hallPreview') : t('hallOffline');
    }
    if (!isPublic) {
      if ($.boardWrap) $.boardWrap.hidden = true;
      if ($.pageControls) $.pageControls.hidden = true;
      if ($.boardTotal) $.boardTotal.textContent = '';
      if ($.publishCard) $.publishCard.hidden = !canPreview || state.publication?.status === 'pending' || state.publicationUncertain || state.currentTab !== 'hall';
      setHallNotice(null);
    } else {
      if ($.boardWrap) $.boardWrap.hidden = !state.board;
      if ($.boardTotal) $.boardTotal.textContent = state.board ? t('totalMakers', { total: fmtNumber(state.board.total) }) : '';
      if ($.publishCard) $.publishCard.hidden = state.publication?.status === 'pending' || state.publicationUncertain || state.currentTab !== 'hall';
      if ($.pageControls) $.pageControls.hidden = !state.board || state.board.pages <= 1;
    }
    renderBoard();
    renderPublication();
  }

  function normalizeBadgeIds(value) {
    if (!Array.isArray(value)) return [];
    return value.filter((item) => typeof item === 'string').slice(0, 24);
  }

  function badgeName(id) {
    const def = badgeCatalog[id];
    return def ? t(def.name) : (state.lang === 'zh' ? '特别徽章' : 'Special badge');
  }

  function appendPreviewRow(term, valueNodeOrText) {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    if (valueNodeOrText instanceof Node) dd.append(valueNodeOrText);
    else dd.textContent = valueNodeOrText == null ? '' : String(valueNodeOrText);
    $.previewList.append(dt, dd);
  }

  function renderPreview() {
    const preview = state.preview;
    if ($.previewPanel) $.previewPanel.hidden = !preview;
    if (!preview || !$.previewList) {
      if ($.consent) { $.consent.checked = false; $.consent.disabled = true; }
      if ($.submit) $.submit.disabled = true;
      if ($.consentHint) $.consentHint.textContent = '';
      return;
    }
    $.previewList.replaceChildren();
    appendPreviewRow(t('previewAlias'), preview.profile.alias);
    const badges = document.createElement('div');
    badges.className = 'preview-badge-list';
    if (preview.profile.badges.length === 0) {
      appendText(badges, 'span', '', t('noPreviewBadges'));
    } else {
      for (const id of preview.profile.badges) {
        const line = appendText(badges, 'span', 'preview-badge-item', '');
        appendText(line, 'span', '', badgeName(id));
        appendText(line, 'code', '', id);
      }
    }
    appendPreviewRow(t('previewBadges'), badges);
    appendPreviewRow(t('previewScore'), fmtNumber(preview.profile.score));
    if (preview.profile.stats) {
      for (const [metric, value] of Object.entries(preview.profile.stats)) {
        appendPreviewRow(rankingLabels[state.lang][metric], value === null ? (state.lang === 'zh' ? '暂无数据，不参加此榜' : 'Unavailable; excluded from this board') : fmtNumber(value));
      }
    }
    const destination = document.createElement('code');
    destination.textContent = preview.destination || t('noDestination');
    appendPreviewRow(t('previewDestination'), destination);
    const canPublish = state.available === true && state.connection === 'public' && Boolean(preview.consentId) && !state.writingPublish && state.publication?.status !== 'pending' && !state.publicationUncertain;
    if ($.consent) {
      $.consent.checked = false;
      $.consent.disabled = !canPublish;
    }
    if ($.submit) $.submit.disabled = !canPublish || !$.consent?.checked;
    if ($.consentHint) $.consentHint.textContent = state.connection === 'public' ? t('consentHint') : t('consentPreviewOnly');
  }

  function renderBoard() {
    const sample = state.available === true && state.connection !== 'public';
    const samples = sampleEntries.map((entry) => ({ ...entry, value: state.metric === 'score' ? entry.score : entry.stats[state.metric] }))
      .sort((a, b) => b.value - a.value);
    for (let i = 0; i < samples.length; i++) samples[i].rank = i > 0 && samples[i].value === samples[i - 1].value ? samples[i - 1].rank : i + 1;
    const board = sample ? { entries: samples, page: 1, pages: 1 } : state.board;
    q('achievementsBoardHeading').textContent = rankingLabels[state.lang][state.metric];
    q('achievementsPointsHead').textContent = state.metric === 'score' ? t('pointsHead') : state.metric === 'tokens' ? 'Token' : (state.lang === 'zh' ? '数量' : 'Count');
    if ($.boardWrap) $.boardWrap.hidden = !board;
    if ($.boardTotal) $.boardTotal.textContent = sample ? t('sampleBoard') : board ? t('totalMakers', { total: fmtNumber(board.total) }) : '';
    const scope = state.lang === 'zh'
      ? 'Token 和项目统计最近 30 个上海自然日的 Codex 输入＋输出 Token、不同项目数；其余统计最近 30 个 UTC 日的 MyOffice 观察值。'
      : 'Tokens and projects cover Codex input + output and distinct projects over 30 Shanghai calendar days; activity covers 30 UTC days observed by MyOffice.';
    q('achievementsBoardNote').textContent = t(sample ? 'sampleNote' : 'boardNote') + ' ' + scope;
    if ($.pageControls) $.pageControls.hidden = state.connection !== 'public' || !board || board.pages <= 1;
    if ($.pageLabel && board) $.pageLabel.textContent = t('page', { page: board.page, pages: board.pages });
    if ($.pagePrev) $.pagePrev.disabled = !board || board.page <= 1 || state.loadingBoard;
    if ($.pageNext) $.pageNext.disabled = !board || board.page >= board.pages || state.loadingBoard;
    if (!$.leaderboard) return;
    $.leaderboard.replaceChildren();
    if (!board) return;
    if (board.entries.length === 0) {
      const row = document.createElement('tr');
      row.className = 'achievements-no-entries';
      const cell = appendText(row, 'td', '', t('noEntries'));
      cell.colSpan = 4;
      $.leaderboard.append(row);
      return;
    }
    for (const entry of board.entries) {
      if (!entry || typeof entry.alias !== 'string') continue;
      const row = document.createElement('tr');
      const rank = appendText(row, 'td', 'achievement-rank', '');
      rank.dataset.rank = String(entry.rank ?? '');
      if (entry.rank > 0 && entry.rank <= 3) {
        const cup = $.roomOffice.querySelector('svg').cloneNode(true);
        cup.classList.add('achievement-rank-cup');
        rank.append(cup);
      }
      appendText(rank, 'span', 'achievement-rank-number', entry.rank == null ? '—' : fmtNumber(entry.rank));
      appendText(row, 'td', '', entry.alias);
      const badgeCell = appendText(row, 'td', '', '');
      if (Array.isArray(entry.badges)) {
        const ids = normalizeBadgeIds(entry.badges);
        const details = appendText(badgeCell, 'details', 'achievement-badge-disclosure', '');
        appendText(details, 'summary', '', state.lang === 'zh' ? `${fmtNumber(ids.length)} 枚徽章` : `${fmtNumber(ids.length)} badge${ids.length === 1 ? '' : 's'}`);
        const list = appendText(details, 'div', 'achievement-row-badges', '');
        for (const id of ids) {
          const chip = appendText(list, 'span', 'achievement-row-badge', badgeName(id));
          chip.title = id;
        }
        if (entry.badges.length === 0) badgeCell.textContent = '0';
      } else {
        badgeCell.textContent = fmtNumber(entry.badges);
      }
      const value = state.metric === 'score' ? entry.score : entry.value ?? entry.stats?.[state.metric];
      appendText(row, 'td', '', value === null || value === undefined ? '—' : fmtNumber(value));
      $.leaderboard.append(row);
    }
  }

  function apiError(payload, response) {
    const code = payload && typeof payload.error === 'string' ? payload.error : `http_${response.status}`;
    const error = new Error(code);
    error.code = code;
    error.status = response.status;
    return error;
  }

  async function readJson(response) {
    try { return await response.json(); } catch (_) { return null; }
  }

  async function postJson(path, body) {
    const response = await fetch(path, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-whatsmyagentdoing': 'achievements'
      },
      body: JSON.stringify(body)
    });
    const payload = await readJson(response);
    if (!response.ok || (payload && typeof payload.error === 'string')) throw apiError(payload, response);
    return payload || {};
  }

  function explainError(error, fallback) {
    const code = error?.code;
    if (code && state.t[code]) return code;
    if (error instanceof TypeError || code === 'network') return 'networkError';
    return fallback;
  }

  async function loadStatus({ silent = false, refreshBoard = true } = {}) {
    if (state.serverDisabled) return false;
    if (state.statusController) state.statusController.abort();
    const controller = new AbortController();
    state.statusController = controller;
    const seq = ++state.statusSeq;
    state.loadingStatus = true;
    if (!silent) setNotice('loadingLocal', 'info');
    try {
      const response = await fetch('/api/achievements', { cache: 'no-store', signal: controller.signal, headers: { Accept: 'application/json' } });
      const payload = await readJson(response);
      if (seq !== state.statusSeq) return false;
      if (response.status === 404 && payload?.available === false) {
        state.available = false;
        state.connection = 'offline';
        state.statusData = null;
        state.board = null;
        updateTrigger();
        renderConnection(); renderLocal(); renderHallAvailability();
        setNotice('unavailable', 'error');
        return false;
      }
      if (!response.ok) throw apiError(payload, response);
      if (payload?.available === false) {
        state.available = false;
        state.connection = 'offline';
        state.statusData = null;
        state.board = null;
        updateTrigger();
        renderConnection(); renderLocal(); renderHallAvailability();
        setNotice('unavailable', 'error');
        return false;
      }
      if (!payload || payload.available !== true) throw new Error('invalid_response');
      state.available = true;
      updateTrigger();
      state.statusData = payload;
      state.connection = ['offline', 'preview', 'public'].includes(payload.connection) ? payload.connection : 'offline';
      state.publication = normalizePublication(payload.publication);
      state.publicationUncertain = false;
      state.board = null;
      state.preview = null;
      if ($.consent) $.consent.checked = false;
      renderConnection(); renderLocal(); renderHallAvailability(); renderPreview(); renderPublication();
      if (refreshBoard && state.currentTab === 'hall' && state.connection === 'public') loadBoard(1);
      if (!silent) setNotice('loaded', 'success');
      else setNotice(null);
      return true;
    } catch (error) {
      if (error?.name === 'AbortError' || seq !== state.statusSeq) return false;
      if (error?.code === 'no_connection') state.connection = 'offline';
      renderConnection(); renderLocal(); renderHallAvailability(); renderPublication();
      setNotice(explainError(error, 'statusError'), 'error');
      return false;
    } finally {
      if (seq === state.statusSeq) {
        state.loadingStatus = false;
        if (state.currentTab === 'hall' && state.connection !== 'public' && state.hallNotice?.key === 'loadingLocal') renderHallAvailability();
      }
    }
  }

  async function loadBoard(page) {
    if (state.serverDisabled || state.available !== true || state.connection !== 'public' || state.currentTab !== 'hall') return false;
    const requestedPage = Math.max(1, numeric(page, 1));
    if (state.boardController) state.boardController.abort();
    const controller = new AbortController();
    state.boardController = controller;
    const seq = ++state.boardSeq;
    state.loadingBoard = true;
    setHallNotice('loadingBoard', 'info');
    renderBoard();
    try {
      const response = await fetch(`/api/achievements/leaderboard?page=${requestedPage}${state.metric === 'score' ? '' : '&metric=' + encodeURIComponent(state.metric)}`, { cache: 'no-store', signal: controller.signal, headers: { Accept: 'application/json' } });
      const payload = await readJson(response);
      if (seq !== state.boardSeq) return false;
      if (!response.ok) throw apiError(payload, response);
      if (!payload || !Array.isArray(payload.entries)) throw new Error('invalid_board');
      const pages = Math.max(1, numeric(payload.pages, 1));
      const actualPage = Math.max(1, Math.min(pages, numeric(payload.page, requestedPage)));
      state.board = {
        entries: payload.entries,
        page: actualPage,
        pages,
        total: safeCount(payload.total) ?? 0
      };
      state.boardPage = actualPage;
      renderBoard();
      setHallNotice(state.board.entries.length ? null : 'noEntries', state.board.entries.length ? 'info' : 'info');
      return true;
    } catch (error) {
      if (error?.name === 'AbortError' || seq !== state.boardSeq) return false;
      state.board = null;
      renderBoard();
      setHallNotice(explainError(error, 'boardError'), 'error');
      return false;
    } finally {
      if (seq === state.boardSeq) {
        state.loadingBoard = false;
        renderBoard();
      }
    }
  }

  function validAlias(value) {
    const characters = Array.from(value);
    if (characters.length < 2 || characters.length > 24) return false;
    try { return /^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u.test(value); }
    catch (_) { return /^[A-Za-z0-9][A-Za-z0-9 _-]*$/.test(value); }
  }

  async function makePreview() {
    if (!$.alias || state.writingPreview || state.writingPublish || state.writingWithdraw || state.connection === 'offline' || state.available !== true) return;
    const alias = $.alias.value;
    if (!validAlias(alias)) {
      $.alias.setAttribute('aria-invalid', 'true');
      $.alias.setCustomValidity(t('invalidAlias'));
      $.alias.reportValidity();
      setHallNotice('invalidAlias', 'error');
      return;
    }
    $.alias.setAttribute('aria-invalid', 'false');
    $.alias.setCustomValidity('');
    state.preview = null;
    state.writingPreview = true;
    if ($.previewButton) $.previewButton.disabled = true;
    renderPreview();
    setHallNotice('previewLoading', 'info');
    try {
      const payload = await postJson('/api/achievements/preview', { alias });
      const profile = payload?.profile;
      if (typeof payload?.consentId !== 'string' || !profile || typeof profile.alias !== 'string' || !Array.isArray(profile.badges)) throw new Error('invalid_preview');
      state.preview = {
        consentId: payload.consentId,
        profile: {
          alias: profile.alias,
          badges: normalizeBadgeIds(profile.badges),
          score: safeCount(profile.score) ?? 0,
          ...(profile.stats ? { stats: Object.fromEntries(['tokens', 'projects', 'sessions', 'activeDays', 'streak', 'agents']
            .map((key) => [key, safeCount(profile.stats[key])])) } : {})
        },
        destination: typeof payload.destination === 'string' ? payload.destination : ''
      };
      if ($.consent) $.consent.checked = false;
      renderPreview();
      setHallNotice('previewReady', 'success');
      $.previewPanel?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    } catch (error) {
      state.preview = null;
      renderPreview();
      setHallNotice(explainError(error, 'previewError'), 'error');
    } finally {
      state.writingPreview = false;
      if ($.previewButton) $.previewButton.disabled = state.connection === 'offline' || state.available !== true;
    }
  }

  async function publishProfile() {
    if (!$.consent?.checked || !state.preview?.consentId || state.connection !== 'public' || state.writingPublish || state.publication?.status === 'pending' || state.publicationUncertain) {
      if ($.consent && state.preview && !$.consent.checked) setHallNotice('consent_required', 'error');
      return;
    }
    const { consentId, profile: { alias } } = state.preview;
    state.writingPublish = true;
    $.consent.checked = false;
    $.consent.disabled = true;
    if ($.submit) $.submit.disabled = true;
    setHallNotice('publishing', 'info');
    try {
      const payload = await postJson('/api/achievements/publish', { consentId, consent: true });
      state.publication = { alias, status: 'published' };
      state.publicationUncertain = false;
      state.preview = null;
      renderPreview(); renderPublication(); renderLocal(); renderHallAvailability();
      const values = safeCount(payload.rank) > 0 && safeCount(payload.total) !== null
        ? { rank: t('publishRank', { rank: fmtNumber(payload.rank), total: fmtNumber(payload.total) }) }
        : { rank: '' };
      setHallNotice('publishSuccess', 'success', 'hall', values);
      if (state.currentTab === 'hall') await loadBoard(1);
      setHallNotice('publishSuccess', 'success', 'hall', values);
    } catch (error) {
      state.publicationUncertain = error?.code === 'write_in_progress' || error instanceof TypeError || Number(error?.status) >= 500;
      renderPublication(); renderLocal(); renderHallAvailability();
      const key = error?.code === 'write_in_progress' ? 'write_in_progress' : explainError(error, 'publishingError');
      setHallNotice(key, 'error', 'hall');
      if (state.publicationUncertain) {
        await loadStatus({ silent: true });
        if (state.publication) state.publicationUncertain = false;
        renderPublication(); renderLocal(); renderHallAvailability();
        setHallNotice(key, 'error', 'hall');
      } else if (error?.code === 'destination_changed' || error?.code === 'expired_preview') {
        state.preview = null;
        renderPreview();
      }
    } finally {
      state.writingPublish = false;
      if ($.submit && state.preview) $.submit.disabled = !(state.connection === 'public' && $.consent?.checked && state.publication?.status !== 'pending' && !state.publicationUncertain);
      if ($.consent) $.consent.disabled = !state.preview || state.connection !== 'public';
    }
  }

  async function withdrawEntry() {
    if (state.writingWithdraw || (!state.publication && !state.publicationUncertain)) return;
    state.writingWithdraw = true;
    renderPublication();
    setNotice('withdrawing', 'info');
    try {
      const payload = await postJson('/api/achievements/withdraw', {});
      if (payload.removed === true) {
        state.publication = null;
        state.publicationUncertain = false;
        state.preview = null;
        if ($.consent) $.consent.checked = false;
        renderPublication(); renderLocal(); renderPreview(); renderHallAvailability();
        setNotice('withdrawSuccess', 'success');
        if (state.currentTab === 'hall' && state.connection === 'public') await loadBoard(state.boardPage || 1);
      } else {
        throw new Error('invalid_withdraw_response');
      }
    } catch (error) {
      renderPublication();
      const key = error?.code === 'no_connection' ? 'no_connection' : explainError(error, 'withdrawingError');
      setNotice(key, 'error');
    } finally {
      state.writingWithdraw = false;
      renderPublication();
    }
  }

  function openDialog({ fromHash = false, trigger = null, tab = null } = {}) {
    if (state.serverDisabled || state.available === false) {
      updateTrigger();
      return;
    }
    if (!$.dialog.open) {
      state.openedFromHash = fromHash;
      state.returnFocus = trigger;
      state.preview = null;
      state.board = null;
      state.hallNotice = null;
      if ($.consent) $.consent.checked = false;
      if ($.alias) { $.alias.setCustomValidity(''); $.alias.removeAttribute('aria-invalid'); }
      $.dialog.showModal();
      if (tab) setTab(tab);
      else showRoom();
      loadStatus({ silent: true });
    } else if (fromHash) {
      state.openedFromHash = true;
      if (tab) setTab(tab);
      else showRoom();
    }
  }

  function closeDialog() {
    if ($.dialog.open) $.dialog.close('dismiss');
  }

  function onClosed() {
    if (roomRenderer) {
      roomRenderer.destroy();
      roomRenderer = null;
    }
    roomReturnTarget = null;
    if (state.statusController) state.statusController.abort();
    if (state.boardController) state.boardController.abort();
    state.statusController = null;
    state.boardController = null;
    state.loadingStatus = false;
    state.loadingBoard = false;
    if (state.openedFromHash && ['#achievements', '#hall-of-fame'].includes(location.hash)) {
      history.replaceState(null, '', `${location.pathname}${location.search}`);
    }
    state.openedFromHash = false;
    const focusTarget = state.returnFocus;
    state.returnFocus = null;
    if (focusTarget && !focusTarget.hidden && !focusTarget.disabled) focusTarget.focus();
    else if ($.trigger && !$.trigger.hidden && !$.trigger.disabled) $.trigger.focus();
  }

  function syncMarker() {
    const wasDisabled = state.serverDisabled;
    updateTrigger();
    if (!wasDisabled && state.serverDisabled) {
      state.preview = null;
      state.board = null;
    }
  }

  function init() {
    applyCopy();
    updateTrigger();
    $.trigger?.addEventListener('click', () => openDialog({ trigger: $.trigger }));
    $.officeTrophy?.addEventListener('click', () => openDialog({ trigger: $.officeTrophy }));
    $.backToOffice.addEventListener('click', () => showRoom({ focus: true }));
    $.collectionOpen.addEventListener('click', () => {
      roomReturnTarget = $.collectionOpen;
      setTab('local', true);
    });
    for (const button of $.roomOffice.querySelectorAll('[data-room-metric]')) {
      button.addEventListener('click', () => {
        roomReturnTarget = button;
        state.metric = button.dataset.roomMetric;
        $.rankingMetric.value = state.metric;
        state.board = null;
        setTab('hall', true);
      });
    }
    $.rankingMetric.addEventListener('change', () => {
      state.metric = $.rankingMetric.value;
      state.board = null;
      renderBoard();
      if (state.connection === 'public') loadBoard(1);
    });
    $.close?.addEventListener('click', closeDialog);
    $.dialog.addEventListener('close', onClosed);
    $.dialog.addEventListener('click', (event) => { if (event.target === $.dialog) closeDialog(); });
    $.tabLocal?.addEventListener('click', () => activateTab('local'));
    $.tabHall?.addEventListener('click', () => activateTab('hall'));
    $.tablist?.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') activateTab('local', true);
      else if (event.key === 'End') activateTab('hall', true);
      else activateTab(event.key === 'ArrowRight' ? 'hall' : 'local', true);
    });
    $.refresh?.addEventListener('click', async () => {
      const okay = await loadStatus({ refreshBoard: false });
      if (okay && state.currentTab === 'hall' && state.connection === 'public') await loadBoard(state.boardPage || 1);
    });
    $.shareStart?.addEventListener('click', () => {
      activateTab('hall');
      q('achievementSharingDetails').open = true;
      window.setTimeout(() => { if (!$.publishCard?.hidden) $.alias?.focus(); }, 0);
    });
    $.previewButton?.addEventListener('click', makePreview);
    $.alias?.addEventListener('input', () => {
      $.alias.setCustomValidity('');
      $.alias.setAttribute('aria-invalid', 'false');
      if (state.preview) {
        state.preview = null;
        if ($.consent) $.consent.checked = false;
        renderPreview();
      }
      if (state.hallNotice?.key === 'invalidAlias') setHallNotice(null);
    });
    $.consent?.addEventListener('change', () => {
      if ($.submit) $.submit.disabled = !($.consent.checked && state.preview && state.connection === 'public' && !state.writingPublish);
    });
    $.submit?.addEventListener('click', publishProfile);
    $.withdraw?.addEventListener('click', withdrawEntry);
    $.pagePrev?.addEventListener('click', () => { if (state.board && state.board.page > 1) loadBoard(state.board.page - 1); });
    $.pageNext?.addEventListener('click', () => { if (state.board && state.board.page < state.board.pages) loadBoard(state.board.page + 1); });

    function syncHash() {
      if (location.hash === '#hall-of-fame') openDialog({ fromHash: true, tab: 'hall' });
      else if (location.hash === '#achievements') openDialog({ fromHash: true });
      else if ($.dialog.open && state.openedFromHash) closeDialog();
    }
    window.addEventListener('hashchange', syncHash);
    syncHash();

    const languageObserver = new MutationObserver(() => {
      const next = language();
      if (next !== state.lang) applyCopy();
    });
    languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    const markerObserver = new MutationObserver(syncMarker);
    if (document.body) markerObserver.observe(document.body, { attributes: true, attributeFilter: ['data-achievements-disabled'] });
  }

  function setHallNotice(key, kind = 'info', scope = 'hall', values) {
    setNotice(key, kind, scope, values);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
