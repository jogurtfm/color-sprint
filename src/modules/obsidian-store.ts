import {App,TFile} from 'obsidian';
import {StudyIO} from './data';
import {vaultPath} from '../daily';
export function obsidianStudyIO(app:App):StudyIO{return {
  read:async path=>{vaultPath(path);const file=app.vault.getAbstractFileByPath(path);if(!file)return null;if(!(file instanceof TFile)||file.stat.size>1048576)throw new Error('Study file is invalid or too large.');return app.vault.read(file);},
  list:async folder=>app.vault.getMarkdownFiles().filter(f=>f.path.startsWith(folder)).map(f=>f.path),
  create:async(path,text)=>{vaultPath(path);const parts=path.split('/');parts.pop();let parent='';for(const part of parts){parent=parent?parent+'/'+part:part;if(!app.vault.getAbstractFileByPath(parent))try{await app.vault.createFolder(parent);}catch(error){if(!app.vault.getAbstractFileByPath(parent))throw error;}}await app.vault.create(path,text);}
};}
