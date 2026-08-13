(function (global) {
  const providers = new Map();
  const providerWaiters = new Map();

  function metricValue(value) {
    if (value && typeof value === 'object') {
      return Number(value.value) || 0;
    }

    return Number(value) || 0;
  }

  function normalizeStats(data) {
    return {
      pageviews: metricValue(data && data.pageviews),
      visitors: metricValue(data && (data.visitors ?? data.visits)),
    };
  }

  function registerProvider(name, provider) {
    if (!name || typeof provider?.fetch !== 'function') {
      throw new TypeError('A page stats provider must have a name and fetch function.');
    }

    providers.set(name, provider);
    const waiters = providerWaiters.get(name) || [];
    waiters.forEach(({ resolve, timeoutId }) => {
      clearTimeout(timeoutId);
      resolve(provider);
    });
    providerWaiters.delete(name);
  }

  function getProvider(name) {
    const provider = providers.get(name);
    if (provider) return Promise.resolve(provider);

    return new Promise((resolve, reject) => {
      const waiters = providerWaiters.get(name) || [];
      const waiter = { resolve, timeoutId: undefined };
      waiters.push(waiter);
      providerWaiters.set(name, waiters);

      waiter.timeoutId = setTimeout(() => {
        const pending = providerWaiters.get(name) || [];
        providerWaiters.set(name, pending.filter(item => item !== waiter));
        reject(new Error(`Page stats provider is not registered: ${name || 'unknown'}`));
      }, 10_000);
    });
  }

  async function fetchStats(config, query = {}) {
    const provider = await getProvider(config?.provider);

    const normalizedQuery = { ...query };
    if (normalizedQuery.path && typeof provider.normalizePath === 'function') {
      normalizedQuery.path = provider.normalizePath(normalizedQuery.path, config.options || {});
    }

    const data = await provider.fetch(config.options || {}, normalizedQuery);
    return normalizeStats(data);
  }

  global.PageStats = {
    registerProvider,
    fetch: fetchStats,
    normalize: normalizeStats,
  };

  // Small compatibility-friendly API for templates and third-party widgets.
  global.fetchPageStats = fetchStats;
})(window);
