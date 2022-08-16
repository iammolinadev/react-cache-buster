import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { compare } from 'compare-versions';

function CacheBuster({
  children = null,
  nowVersion = null,
  comparationVersion = null,
  isEnabled = false,
  isVerboseMode = false,
  loadingComponent = null,
  onCacheClear = () => null
}) {
  const [cacheStatus, setCacheStatus] = useState({
    loading: true,
    isLatestVersion: false
  });

  const log = (message, isError) => {
    isVerboseMode && (isError ? console.error(message) : console.log(message));
  };

  const handleCurrentVersion = () => {
    return nowVersion ?? window.localStorage.getItem('version') ?? false;
  };

  const handleMetaVersion = async () => {
    try {
      if (comparationVersion) {
        return comparationVersion;
      }
      const res = await fetch('/meta.json');
      const { version: metaVersion } = await res.json();
      return metaVersion;
    } catch (e) {
      throw new Error('meta not read');
    }
  };

  useEffect(() => {
    isEnabled ? checkCacheStatus() : log('React Cache Buster is disabled');
  }, []);

  const checkCacheStatus = async () => {
    try {
      const metaVersion = await handleMetaVersion();
      if (!handleCurrentVersion()) {
        window.localStorage.setItem('version', metaVersion);
      }
      const currentVersion = handleCurrentVersion();
      const shouldForceRefresh = isThereNewVersion(metaVersion, currentVersion);
      if (shouldForceRefresh) {
        log(`There is a new version (v${metaVersion}). Should force refresh.`);
        window.localStorage.setItem('version', metaVersion);
        await onCacheClear();
        await refreshCacheAndReload();
        setCacheStatus({
          loading: false,
          isLatestVersion: false
        });
      } else {
        log('There is no new version. No cache refresh needed.');
        setCacheStatus({
          loading: false,
          isLatestVersion: true
        });
      }
    } catch (error) {
      log('An error occurred while checking cache status.', true);
      log(error, true);
      setCacheStatus({
        loading: false,
        isLatestVersion: true
      });
    }
  };

  const isThereNewVersion = (metaVersion, currentVersion) => {
    log(`meta(v${metaVersion}).`);
    log(`current(v${currentVersion}).`);
    return compare(metaVersion, currentVersion, '>');
  };

  const refreshCacheAndReload = async () => {
    try {
      if (window?.caches) {
        const { caches } = window;
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          caches.delete(cacheName);
        }
        log('The cache has been deleted.');
        window.location.reload(true);
      }
    } catch (error) {
      log('An error occurred while deleting the cache.', true);
      log(error, true);
    }
  };

  if (cacheStatus.loading) {
    return loadingComponent;
  }

  return children;
}

CacheBuster.propTypes = {
  children: PropTypes.element.isRequired,
  nowVersion: PropTypes.string,
  comparationVersion: PropTypes.string,
  isEnabled: PropTypes.bool,
  isVerboseMode: PropTypes.bool,
  loadingComponent: PropTypes.element,
  onCacheClear: PropTypes.func
};

export { CacheBuster };
