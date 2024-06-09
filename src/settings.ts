import { PluginSettingTab, App, Notice, Setting, normalizePath } from "obsidian";
import ObsidianNSFW, { FileFromTo } from "./main";

export interface PluginSettings {
	visibility: boolean;
	query: string;
	isolation: string;
	toggleNotice: boolean;
	toggleEye: boolean;
	whereAreMyFiles: FileFromTo[];
}


export const DEFAULT_SETTINGS: PluginSettings = {
	visibility: true,
	query: '["nsfw":true]',
	isolation: '.NSFW/',
	toggleNotice: false,
	toggleEye: true,
	whereAreMyFiles: [],
}

export class SettingsTab extends PluginSettingTab {
	plugin: ObsidianNSFW;

	constructor(app: App, plugin: ObsidianNSFW) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

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
			.setName('Ignored directory')
			.setDesc('By default obsidian ignores folders starting with \'.\'.')
			.addText(text => {text
				.setPlaceholder('This should not be empty')
				.setValue(this.plugin.settings.isolation)
				.onChange(async (value) => {
					if(!this.plugin.settings.visibility){
						new Notice('Set Vault to NSFW before changing');
						return;
					}
					const oldPath = this.plugin.settings.isolation;
					
					//#TODO - rmdir throws is a directory error if recursive is set to false
					await this.app.vault.adapter.rmdir(normalizePath(oldPath),true);
					
					this.plugin.settings.isolation = normalizePath(value);
					this.app.vault.createFolder(this.plugin.settings.isolation).catch(()=>{});
						
					await this.plugin.saveSettings();
				})
			})
		containerEl.createEl("p",{text:'WARNING: Make sure to set vault to NSFW before changing \'Ignored directory\'.'})

		new Setting(containerEl)
			.setName('Notice on visibility change')
			.addToggle((cb)=>{cb
			.setValue(this.plugin.settings.toggleNotice)
			.onChange((value)=>{
				this.plugin.settings.toggleNotice = value;
				this.plugin.saveSettings();
				})
			})

		new Setting(containerEl)
			.setName('Sidebar Eye icon')
			.setDesc('Controls whether to add Eye Icon to the sidebar.')
			.addToggle((cb)=>{cb
			.setValue(this.plugin.settings.toggleEye)
			.onChange((value)=>{
				this.plugin.settings.toggleEye = value;
				this.plugin.saveSettings();
				})
			})

		new Setting(containerEl).setName('Status').setHeading();
		new Setting(containerEl)
			.setName('NSFW visibility')
			.addToggle((cb)=>{cb
				.setValue(this.plugin.settings.visibility)
				.onChange(()=>{
					this.plugin.toggleVisibility();
				})
			})
		}
}