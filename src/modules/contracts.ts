import type {Board} from '../model';
import {focusQueue} from '../model';
export interface ModuleBinding {taskId:string;moduleId:string;dataset:string;targets:{kanji:number;vocab:number;grammar:number;review:number}}
export interface ModuleFocus {key:string;taskId:string;taskTitle:string;sessionId:string;stepId:string;date:string;paused:boolean}
export interface ModuleRecord {version:number;id:string;moduleId:string;dataset:string}
export interface ReviewRecord extends ModuleRecord {version:1;moduleId:'japanese-srs';deckRevision:string;cardId:string;parentId:string|null;deviceId:string;sessionId:string;date:string;at:string;rating:'again'|'hard'|'good'|'easy';mode:'new'|'review'}
/** Hosts grant module-specific data access, never arbitrary vault/task/IPC access. */
export interface ModuleStore {read(dataset:string):Promise<unknown[]>;append(record:ModuleRecord):Promise<void>;subscribe(dataset:string,changed:()=>void):()=>void}
export interface ModuleServices {store:ModuleStore;now:()=>number;id:()=>string;deviceId:string;documents:Readonly<Record<string,string>>;preview?:boolean}
export interface ModuleInstance {mount(root:HTMLElement):void;update(focus:ModuleFocus):void;dispose():void}
export interface ModuleDefinition {id:string;schemaVersion:1;capabilities:readonly ['study.read','study.append'];create(focus:ModuleFocus,binding:ModuleBinding,services:ModuleServices):Promise<ModuleInstance>}
export type ModuleLoader=()=>Promise<ModuleDefinition>;
export function activeModuleFocus(board:Board|null):ModuleFocus|null {
  const timer=board?.timer;if(!board||!timer)return null;const queue=focusQueue(board,timer),step=queue[timer.cursor];if(!step)return null;
  const task=board.tasks.find(t=>t.id===step.taskId);if(!task)return null;
  return {key:timer.id+':'+step.id,sessionId:timer.id,stepId:step.id,taskId:task.id,taskTitle:task.title,date:timer.date,paused:timer.started==='-'};
}
