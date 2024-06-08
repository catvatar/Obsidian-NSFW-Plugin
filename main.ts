import { App, Vault, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, normalizePath, getFrontMatterInfo, WorkspaceLeaf } from 'obsidian';

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

		// // This adds a simple command that can be triggered anywhere
		// this.addCommand({
		// 	id: 'open-sample-modal-simple',
		// 	name: 'Open sample modal (simple)',
		// 	callback: () => {
		// 		new SampleModal(this.app).open();
		// 	}
		// });

		// // This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({internalPlugins
		// 	id: 'sample-editor-command', 
		// 	name: 'Sample editor command',
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection('Sample Editor Command');
		// 	}
		// });

		// // This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-sample-modal-complex',
		// 	name: 'Open sample modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	}
		// });

		
		// // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// // Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });
			
		// // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
		
		// This adds a settings tab so the user can configure various aspects of the plugin
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

// class SampleModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}

// 	onOpen() {
// 		const {contentEl} = this;
// 		contentEl.setText('Woah!');
// 	}

// 	onClose() {
// 		const {contentEl} = this;
// 		contentEl.empty();
// 	}
// }

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
		new Setting(containerEl)
			.setName('Ignored directory')
			.setDesc('By default obsidian ignores `.folders/`')
			.addText(text => {text
				.setPlaceholder('This should not be empty')
				.setValue(this.plugin.settings.isolation)
				.onChange(async (value) => {
					this.plugin.settings.isolation = value;
					await this.plugin.saveSettings();
				})
			})
		new Setting(containerEl)
			.setName('Query for NSFW files')
			.setDesc('Search query for files you want to hide')
			.addText(text => {text
				.setPlaceholder('This should not be empty')
				.setValue(this.plugin.settings.query)
				.onChange(async (value) => {
					this.plugin.settings.query = value;
					await this.plugin.saveSettings();
				})
			})
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
