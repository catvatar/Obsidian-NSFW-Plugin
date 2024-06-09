import { Notice, Plugin } from 'obsidian';

import { obsidianSearchAsync } from './obsidian-search';

import { SettingsTab } from './settings';

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

		this.app.vault.createFolder(this.settings.isolation).catch(()=>{});

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

		this.addSettingTab(new SettingsTab(this.app, this));
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
				// console.log(key);
				
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