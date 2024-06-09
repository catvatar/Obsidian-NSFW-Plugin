import { TFile, WorkspaceLeaf } from "obsidian";

const hideStyle = "position: fixed; top: 0; left: -9999px; visibility: hidden;";

export type ObsidianSearchResult = Map<TFile, { content: string }>;

interface ObsidianSearchPayload {
  el?: HTMLElement;
  onStart?: Function;
  onStop?: (map: ObsidianSearchResult) => void;
  removeOnStop?: boolean;
  hideEl?: boolean;
}
function obsidianSearch(payload: ObsidianSearchPayload) {
  const {
    el = document.body,
    onStart,
    onStop,
    removeOnStop = true,
    hideEl = true,
  } = payload;
  const searchContainer = el.createDiv({
    attr: {
      style: hideEl ? hideStyle : "",
    },
  });
// @ts-ignore
  const search: any = this.app.internalPlugins.plugins["global-search"].views.search(
	// @ts-ignore
	new WorkspaceLeaf(this.app)
  );
  searchContainer.appendChild(search.containerEl);

  const _onStop = () => {
    if (removeOnStop) {
      search.close();
      searchContainer.remove();
    }
    onStop && onStop(search.dom.resultDomLookup);
  };
  new MutationObserver(function callback(mutationList) {
    const [mutation] = mutationList;
    // @ts-ignore
    if (mutation.target.classList.contains("is-loading")) {
      onStart && onStart();
      return;
    }
    _onStop();
  }).observe(search.containerEl.querySelector(".search-result-container"), {
    attributeFilter: ["class"],
  });
  return search;
}
export function obsidianSearchAsync(
  query: string,
  payload: ObsidianSearchPayload = {}
) {
  return new Promise<ObsidianSearchResult>((resolve, reject) => {
    try {
      obsidianSearch({
        ...payload,
        onStop(map) {
          payload.onStop && payload.onStop(map);
          resolve(map);
        },
      }).setQuery(query);
    } catch (error) {
      reject(error);
    }
  });
}