import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf } from 'obsidian';

const hideStyle = "position: fixed; top: 0; left: -9999px; visibility: hidden;";

type ObsidianSearchResult = Map<TFile, { content: string }>;

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
function obsidianSearchAsync(
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

class FileFromTo {
	fromPath: string;
	toPath: string;
	constructor(oldPath:string,newPath:string){
		this.fromPath = oldPath;
		this.toPath = newPath;
	}
}

interface PluginSettings {
	visibility: boolean;
	query: string;
	isolation: string;
	toggleNotice: boolean;
	whereAreMyFiles: FileFromTo[];
}


const DEFAULT_SETTINGS: PluginSettings = {
	visibility: true,
	query: '["nsfw":true]',
	isolation: '.NSFW/',
	toggleNotice: false,
	whereAreMyFiles: [],
}


export default class ObsidianNSFW extends Plugin {
	settings: PluginSettings;
	NSFWstatus: HTMLElement

	async onload() {
		await this.loadSettings();

		this.app.vault.createFolder(this.settings.isolation);

		const toggleVisibilityButton = this.addRibbonIcon('eye', 'Toggle NSFW Visibility', (evt: MouseEvent) => {
			this.toggleVisibility();
		});

		toggleVisibilityButton.addClass('my-plugin-ribbon-class');

		this.NSFWstatus = this.addStatusBarItem();
		this.NSFWstatus.setText(this.settings.visibility?'NSFW':'SFW');

		this.addCommand({
			id: 'toggle NSFW filter',
			name: 'Toggle NSFW filter',
			callback: () => {
				this.toggleVisibility();
			}
		})

		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}
		
		
	async saveSettings() {
		await this.saveData(this.settings);
	}

	// this.settings.visibility
	// true -> NSFW files are inside the vault
	// false -> NSFW files are inside isolation
	async toggleVisibility() {
		const new_visibility = !this.settings.visibility;
		this.settings.visibility = new_visibility;

		if(new_visibility){
			this.settings.whereAreMyFiles.forEach((file) => {
				const abstractFile = this.app.vault.getAbstractFileByPath(file.toPath);
				if (abstractFile) {
					this.app.vault.rename(abstractFile, file.fromPath);
				}
			});
			this.settings.whereAreMyFiles = [];
		}else{
			const searchResult = await obsidianSearchAsync(this.settings.query);
			searchResult.forEach((_,key)=>{
				console.log(key);
				
				const oldPath = key.path;
				const newPath = this.settings.isolation + key.name;
	
				this.settings.whereAreMyFiles.push(new FileFromTo(
					oldPath,
					newPath
				));
	
				this.app.vault.rename(key,newPath)
			})
		}

		this.NSFWstatus.setText(new_visibility?'NSFW':'SFW');

		if(this.settings.toggleNotice){
			new Notice(new_visibility?'NSFW files visible':'NSFW files NOT visible');
		}

		this.saveSettings();
	}

}


class SampleSettingTab extends PluginSettingTab {
	plugin: ObsidianNSFW;

	constructor(app: App, plugin: ObsidianNSFW) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		containerEl.createEl("h1",{ text: this.plugin.manifest.name + 'Settings' });

		containerEl.createEl("h2",{ text: 'Status' });
		new Setting(containerEl)
			.setName('NSFW visibility')
			.addToggle((cb)=>{cb
				.setValue(this.plugin.settings.visibility)
				.onChange(()=>{
					this.plugin.toggleVisibility();
				})
			})
		
		containerEl.createEl("h2",{ text: 'Configuration' });
		containerEl.createEl("p",{text:'WARNING: Make sure to set vault to NSFW before changing Ignored directory.'})
		new Setting(containerEl)
			.setName('Ignored directory')
			.setDesc('By default obsidian ignores folders starting with \'.\'. This has unintended consequence and there is no way to safely remove old Ignored directories from plugin folder, keep that in mind.')
			.addText(text => {text
				.setPlaceholder('This should not be empty')
				.setValue(this.plugin.settings.isolation)
				.onChange(async (value) => {
					if(!this.plugin.settings.visibility){
						new Notice('Set vault to NSFW before changing');
						return;
					}
					this.plugin.settings.isolation = value;
					this.app.vault.createFolder(this.plugin.settings.isolation);
					
					await this.plugin.saveSettings();
				})
			})
		new Setting(containerEl)
			.setName('Query for NSFW files')
			.setDesc('Search query (\'global-search\') for files you want to hide')
			.addText(text => {text
				.setPlaceholder('This should not be empty')
				.setValue(this.plugin.settings.query)
				.onChange(async (value) => {
					this.plugin.settings.query = value;
					await this.plugin.saveSettings();
				})
			})
		containerEl.createEl("a",{ text: 'Read More', href: 'https://help.obsidian.md/Plugins/Search' });

		new Setting(containerEl)
			.setName('Notice on visibility change')
			.addToggle((cb)=>{cb
				.setValue(this.plugin.settings.toggleNotice)
				.onChange((value)=>{
					this.plugin.settings.toggleNotice = value;
					this.plugin.saveSettings();
				})
			})
	}
}
