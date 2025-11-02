const COMBINING_MARKS_REGEX = /[\u0300-\u036f]/g;
const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function normalizeText(input) {
  if (input === null || input === undefined) {
    return '';
  }
  let normalized = String(input);
  if (typeof normalized.normalize === 'function') {
    normalized = normalized.normalize('NFD').replace(COMBINING_MARKS_REGEX, '');
  }
  return normalized
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(source, target) {
  if (source === target) {
    return 0;
  }
  if (!source) {
    return target.length;
  }
  if (!target) {
    return source.length;
  }

  const sourceLength = source.length;
  const targetLength = target.length;
  let previous = new Array(targetLength + 1);
  let current = new Array(targetLength + 1);

  for (let index = 0; index <= targetLength; index += 1) {
    previous[index] = index;
  }

  for (let i = 0; i < sourceLength; i += 1) {
    current[0] = i + 1;
    const sourceCode = source.charCodeAt(i);
    for (let j = 0; j < targetLength; j += 1) {
      const cost = sourceCode === target.charCodeAt(j) ? 0 : 1;
      const insertion = current[j] + 1;
      const deletion = previous[j + 1] + 1;
      const substitution = previous[j] + cost;
      current[j + 1] = Math.min(insertion, deletion, substitution);
    }
    [previous, current] = [current, previous];
  }

  return previous[targetLength];
}

export function dedupeByKey(list, keyFn) {
  if (!Array.isArray(list)) {
    return [];
  }
  const result = [];
  const seen = new Set();
  list.forEach((item, index) => {
    const rawKey = typeof keyFn === 'function' ? keyFn(item, index, list) : item;
    if (rawKey === null || rawKey === undefined) {
      return;
    }
    const normalizedKey = `${typeof rawKey}:${String(rawKey)}`;
    if (seen.has(normalizedKey)) {
      return;
    }
    seen.add(normalizedKey);
    result.push(item);
  });
  return result;
}

export function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/[&<>"']/g, (character) => HTML_ESCAPE_MAP[character] || character);
}

export function debounce(fn, delay = 0) {
  let timeoutId = null;
  function debounced(...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn.apply(this, args);
    }, delay);
  }
  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  return debounced;
}

export function clamp(value, min, max) {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

export function safeURL(value, base) {
  if (!value && value !== 0) {
    return '';
  }
  try {
    const normalizedBase = base || (typeof window !== 'undefined' ? window.location.origin : undefined);
    return new URL(String(value), normalizedBase).toString();
  } catch (error) {
    return '';
  }
}
