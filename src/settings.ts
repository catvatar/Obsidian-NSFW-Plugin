import { PluginSettingTab, App, Notice, Setting } from "obsidian";
import ObsidianNSFW from "./main";


export class SettingsTab extends PluginSettingTab {
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
					this.app.vault.createFolder(this.plugin.settings.isolation).catch(()=>{});
					
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