import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';


interface PluginSettings {
	visibility: boolean;
	toggleNotice: boolean;
}


const DEFAULT_SETTINGS: PluginSettings = {
	visibility: true,
	toggleNotice: false,
}


export default class ObsidianNSFW extends Plugin {
	settings: PluginSettings;
	NSFWstatus: HTMLElement

	async onload() {
		await this.loadSettings();

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
		// this.addCommand({
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

	toggleVisibility() {
		const new_visibility = !this.settings.visibility;
		this.settings.visibility = new_visibility;
		
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
