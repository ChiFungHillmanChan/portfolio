import { t } from './i18n.js';

const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function renderLibraryGroups(list, { renderCase, stage, groupTitle = t }) {
  const groups = new Map();
  for (const record of list) {
    if (!groups.has(record.group)) groups.set(record.group, []);
    groups.get(record.group).push(record);
  }
  if (!groups.size) return '';

  const chapters = [...groups].map(([group, records]) => ({
    group, records,
    id: `library-group-${stage.toLowerCase()}-${group.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    title: escape(groupTitle(group)),
  }));
  const navigation = `<nav class="library-group-nav" aria-label="${escape(t('Case group'))}">${chapters.map(({ id, title, records }) => `<button type="button" data-action="library-group" data-value="${escape(id)}"><span>${title}</span><span class="library-group-nav-count">${records.length}</span></button>`).join('')}</nav>`;
  return `${navigation}${chapters.map(({ group, id, title, records }) => `<section class="library-group" data-group="${escape(group)}" aria-labelledby="${escape(id)}"><div class="library-group-heading"><h3 id="${escape(id)}" tabindex="-1">${title}</h3><span class="library-group-count">${escape(t(records.length === 1 ? '{count} case' : '{count} cases', { count: records.length }))}</span></div><div class="case-grid">${records.map(renderCase).join('')}</div></section>`).join('')}`;
}
